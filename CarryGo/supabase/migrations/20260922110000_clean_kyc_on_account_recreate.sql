-- Migration: Clean KYC sessions and flags on account soft delete and recreation
BEGIN;

-- 1. Update soft_delete_user_account() to clean KYC sessions & flags
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
  -- Ensure user is authenticated
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Mark user_profiles row as soft-deleted, reset push token, username, and KYC flags
  UPDATE public.user_profiles
  SET
    is_deleted = TRUE,
    deleted_at = NOW(),
    push_token = NULL,
    username = NULL,
    kyc_status = 'pending',
    verified = FALSE,
    is_aadhaar_verified = FALSE,
    is_address_verified = FALSE,
    verified_address = NULL
  WHERE id = v_user_id;

  -- Clean up previous KYC sessions so stale sessions do not persist
  DELETE FROM public.kyc_documents
  WHERE session_id IN (SELECT id FROM public.kyc_sessions WHERE user_id = v_user_id);

  DELETE FROM public.kyc_sessions
  WHERE user_id = v_user_id;

  -- Cancel active trips so they disappear from marketplace immediately
  WITH updated_trips AS (
    UPDATE public.trips
    SET status = 'cancelled'
    WHERE user_id = v_user_id AND status = 'active'
    RETURNING id
  )
  SELECT count(*) INTO v_trips_cancelled FROM updated_trips;

  -- Cancel open parcels so they disappear from marketplace immediately
  WITH updated_parcels AS (
    UPDATE public.parcels
    SET status = 'cancelled'
    WHERE user_id = v_user_id AND status = 'open'
    RETURNING id
  )
  SELECT count(*) INTO v_parcels_cancelled FROM updated_parcels;

  -- Cancel pending requests associated with this user
  WITH updated_requests AS (
    UPDATE public.requests
    SET status = 'cancelled'
    WHERE (sender_id = v_user_id OR traveller_id = v_user_id) AND status = 'pending'
    RETURNING id
  )
  SELECT count(*) INTO v_requests_cancelled FROM updated_requests;

  -- Ensure auth.users is NOT banned so the email can receive OTP and re-create in future
  BEGIN
    UPDATE auth.users
    SET banned_until = NULL
    WHERE id = v_user_id;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

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

-- 2. Update recreate_user_account() to fully reset KYC flags and remove stale sessions
CREATE OR REPLACE FUNCTION public.recreate_user_account(p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Reset user_profiles to fresh unconfigured state, including all KYC flags
  UPDATE public.user_profiles
  SET
    is_deleted = FALSE,
    deleted_at = NULL,
    profile_completed_at = NULL,
    kyc_status = 'pending',
    verified = FALSE,
    is_aadhaar_verified = FALSE,
    is_address_verified = FALSE,
    verified_address = NULL,
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

  -- If no row existed in user_profiles, create one
  IF NOT FOUND THEN
    INSERT INTO public.user_profiles (
      id,
      email,
      is_deleted,
      kyc_status,
      verified,
      is_aadhaar_verified,
      is_address_verified,
      verified_address,
      rating,
      total_ratings,
      total_deliveries,
      total_trips,
      created_at,
      updated_at
    )
    SELECT
      v_user_id,
      email,
      FALSE,
      'pending',
      FALSE,
      FALSE,
      FALSE,
      NULL,
      4.50,
      0,
      0,
      0,
      NOW(),
      NOW()
    FROM auth.users
    WHERE id = v_user_id
    ON CONFLICT (id) DO UPDATE
    SET
      is_deleted = FALSE,
      deleted_at = NULL,
      profile_completed_at = NULL,
      kyc_status = 'pending',
      verified = FALSE,
      is_aadhaar_verified = FALSE,
      is_address_verified = FALSE,
      verified_address = NULL,
      updated_at = NOW();
  END IF;

  -- Clean up any prior KYC sessions and documents for this user
  DELETE FROM public.kyc_documents
  WHERE session_id IN (SELECT id FROM public.kyc_sessions WHERE user_id = v_user_id);

  DELETE FROM public.kyc_sessions
  WHERE user_id = v_user_id;

  -- Ensure auth.users is unbanned
  BEGIN
    UPDATE auth.users
    SET banned_until = NULL
    WHERE id = v_user_id;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

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

-- 3. One-time cleanup for users whose profile was recreated or has pending KYC but lingering Aadhaar flags/sessions
UPDATE public.user_profiles
SET
  is_aadhaar_verified = FALSE,
  is_address_verified = FALSE,
  verified_address = NULL
WHERE kyc_status = 'pending' AND is_aadhaar_verified = TRUE;

-- Specifically clean up stale sessions for users with pending KYC status
DELETE FROM public.kyc_documents
WHERE session_id IN (
  SELECT ks.id FROM public.kyc_sessions ks
  JOIN public.user_profiles up ON up.id = ks.user_id
  WHERE up.kyc_status = 'pending'
);

DELETE FROM public.kyc_sessions
WHERE user_id IN (
  SELECT id FROM public.user_profiles WHERE kyc_status = 'pending'
);

COMMIT;
