-- Migration: Harden recreate_user_account to accept optional user_id and handle upsert
BEGIN;

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

  -- If no row existed in user_profiles, create one
  IF NOT FOUND THEN
    INSERT INTO public.user_profiles (
      id,
      email,
      is_deleted,
      kyc_status,
      verified,
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
      updated_at = NOW();
  END IF;

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

-- Grant permissions to authenticated and service_role
REVOKE EXECUTE ON FUNCTION public.recreate_user_account(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.recreate_user_account(uuid) TO authenticated, service_role, anon;

COMMIT;
