-- Migration: User Account Soft Delete System
-- Preserves all user data, transactions, ratings, and audit records while permanently
-- revoking account access and cancelling active listings.

BEGIN;

-- 1. Add soft delete columns to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Partial index for fast lookups on deleted users
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_deleted 
ON public.user_profiles(is_deleted) 
WHERE is_deleted = TRUE;

-- 2. Create PostgreSQL RPC function for soft-deleting an account
CREATE OR REPLACE FUNCTION public.soft_delete_user_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_trips_cancelled integer := 0;
  v_parcels_cancelled integer := 0;
  v_requests_cancelled integer := 0;
BEGIN
  -- 1. Ensure user is authenticated
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- 2. Mark user_profiles row as soft-deleted and clear transient push tokens
  UPDATE public.user_profiles
  SET
    is_deleted = TRUE,
    deleted_at = NOW(),
    push_token = NULL
  WHERE id = v_user_id;

  -- 3. Cancel active trips so they disappear from marketplace immediately
  WITH updated_trips AS (
    UPDATE public.trips
    SET status = 'cancelled'
    WHERE user_id = v_user_id AND status = 'active'
    RETURNING id
  )
  SELECT count(*) INTO v_trips_cancelled FROM updated_trips;

  -- 4. Cancel open parcels so they disappear from marketplace immediately
  WITH updated_parcels AS (
    UPDATE public.parcels
    SET status = 'cancelled'
    WHERE user_id = v_user_id AND status = 'open'
    RETURNING id
  )
  SELECT count(*) INTO v_parcels_cancelled FROM updated_parcels;

  -- 5. Cancel pending requests associated with this user
  WITH updated_requests AS (
    UPDATE public.requests
    SET status = 'cancelled'
    WHERE (sender_id = v_user_id OR traveller_id = v_user_id) AND status = 'pending'
    RETURNING id
  )
  SELECT count(*) INTO v_requests_cancelled FROM updated_requests;

  -- 6. Ban/disable the auth.users account so future token refresh or OTP authentication is blocked
  UPDATE auth.users
  SET banned_until = '2999-01-01 00:00:00+00'::timestamptz
  WHERE id = v_user_id;

  -- 7. Record an audit event for legal and compliance tracking
  INSERT INTO public.audit_events (
    actor_id,
    entity_type,
    entity_id,
    event_type,
    payload
  ) VALUES (
    v_user_id,
    'user_profiles',
    v_user_id::text,
    'user.account_soft_deleted',
    jsonb_build_object(
      'deleted_at', NOW(),
      'trips_cancelled', v_trips_cancelled,
      'parcels_cancelled', v_parcels_cancelled,
      'requests_cancelled', v_requests_cancelled
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'trips_cancelled', v_trips_cancelled,
    'parcels_cancelled', v_parcels_cancelled,
    'requests_cancelled', v_requests_cancelled
  );
END;
$$;

-- 3. Permissions
REVOKE EXECUTE ON FUNCTION public.soft_delete_user_account() FROM public;
GRANT EXECUTE ON FUNCTION public.soft_delete_user_account() TO authenticated;

COMMIT;
