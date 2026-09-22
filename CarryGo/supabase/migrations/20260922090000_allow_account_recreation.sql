-- Migration: Enable Account Re-creation With Same Email
-- Unbans existing auth users, ensures soft_delete does not ban auth.users, and creates recreate_user_account RPC

BEGIN;

-- 1. Unban any accounts in auth.users that were previously banned by soft delete
UPDATE auth.users
SET banned_until = NULL
WHERE banned_until > now();

-- 2. Update soft_delete_user_account() to:
--    - Clear username so it can be re-used
--    - Never ban auth.users so the user can re-authenticate via OTP
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

  -- 2. Mark user_profiles row as soft-deleted, clear push token and username
  UPDATE public.user_profiles
  SET
    is_deleted = TRUE,
    deleted_at = NOW(),
    push_token = NULL,
    username = NULL
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

  -- 6. Ensure auth.users is NOT banned so the email can receive OTP and re-create in future
  BEGIN
    UPDATE auth.users
    SET banned_until = NULL
    WHERE id = v_user_id;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- 7. Record an audit event with entity_id as UUID
  BEGIN
    INSERT INTO public.audit_events (
      actor_id,
      entity_type,
      entity_id,
      event_type,
      payload
    ) VALUES (
      v_user_id,
      'user_profiles',
      v_user_id,
      'user.account_soft_deleted',
      jsonb_build_object(
        'deleted_at', NOW(),
        'trips_cancelled', v_trips_cancelled,
        'parcels_cancelled', v_parcels_cancelled,
        'requests_cancelled', v_requests_cancelled
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'trips_cancelled', v_trips_cancelled,
    'parcels_cancelled', v_parcels_cancelled,
    'requests_cancelled', v_requests_cancelled
  );
END;
$$;

-- 3. Create recreate_user_account() RPC
--    Called when a user signs in with an email whose profile was previously soft-deleted.
--    Resets profile to initial unconfigured state so the user can complete fresh profile setup.
CREATE OR REPLACE FUNCTION public.recreate_user_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Reset user_profiles to fresh unconfigured state
  UPDATE public.user_profiles
  SET
    is_deleted = FALSE,
    deleted_at = NULL,
    profile_completed_at = NULL,
    kyc_status = 'pending',
    verified = FALSE,
    username = NULL,
    full_name = NULL,
    phone = NULL,
    city = NULL,
    role = NULL,
    rating = 4.50,
    total_ratings = 0,
    total_deliveries = 0,
    total_trips = 0,
    push_token = NULL,
    updated_at = NOW()
  WHERE id = v_user_id;

  -- Record audit event
  BEGIN
    INSERT INTO public.audit_events (
      actor_id,
      entity_type,
      entity_id,
      event_type,
      payload
    ) VALUES (
      v_user_id,
      'user_profiles',
      v_user_id,
      'user.account_recreated',
      jsonb_build_object('recreated_at', NOW())
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object('success', true, 'user_id', v_user_id);
END;
$$;

-- 4. Permissions
REVOKE EXECUTE ON FUNCTION public.recreate_user_account() FROM public;
GRANT EXECUTE ON FUNCTION public.recreate_user_account() TO authenticated;

COMMIT;
