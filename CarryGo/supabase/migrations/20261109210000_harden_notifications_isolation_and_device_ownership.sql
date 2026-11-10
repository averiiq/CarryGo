-- Migration: 20261109210000_harden_notifications_isolation_and_device_ownership.sql
-- Description: Enforce strict single-user device ownership, prevent cross-user push leaks, and harden notification isolation

BEGIN;

-- 1. Update upsert_user_device to enforce 1-to-1 device-to-user ownership
CREATE OR REPLACE FUNCTION public.upsert_user_device(
  p_device_key text,
  p_expo_push_token text,
  p_platform text DEFAULT NULL,
  p_app_version text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_device_id uuid;
  v_clean_token text;
  v_clean_device_key text;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_clean_device_key := nullif(trim(coalesce(p_device_key, '')), '');
  IF v_clean_device_key IS NULL THEN
    RAISE EXCEPTION 'Device key is required';
  END IF;

  v_clean_token := nullif(trim(coalesce(p_expo_push_token, '')), '');
  IF v_clean_token IS NULL THEN
    RAISE EXCEPTION 'Expo push token is required';
  END IF;

  -- CRITICAL SECURITY & PRIVACY FIX:
  -- A physical device / push token must only belong to ONE active user at a time.
  -- Invalidate this push token from ANY other user account that previously logged in on this physical device.
  UPDATE public.user_devices
  SET invalidated_at = now()
  WHERE expo_push_token = v_clean_token
    AND user_id <> v_actor_id
    AND invalidated_at IS NULL;

  -- Clear legacy push_token on any other user profiles that match this token
  UPDATE public.user_profiles
  SET push_token = NULL
  WHERE push_token = v_clean_token
    AND id <> v_actor_id;

  -- Upsert device for the current authenticated user
  INSERT INTO public.user_devices (
    user_id,
    device_key,
    expo_push_token,
    platform,
    app_version,
    invalidated_at,
    failure_count,
    last_seen_at
  )
  VALUES (
    v_actor_id,
    v_clean_device_key,
    v_clean_token,
    nullif(trim(coalesce(p_platform, '')), ''),
    nullif(trim(coalesce(p_app_version, '')), ''),
    NULL,
    0,
    now()
  )
  ON CONFLICT (user_id, device_key)
  DO UPDATE SET
    expo_push_token = excluded.expo_push_token,
    platform = excluded.platform,
    app_version = excluded.app_version,
    invalidated_at = NULL,
    failure_count = 0,
    last_seen_at = now()
  RETURNING id INTO v_device_id;

  -- Also keep user_profiles.push_token in sync for the active user
  UPDATE public.user_profiles
  SET push_token = v_clean_token
  WHERE id = v_actor_id;

  RETURN v_device_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_user_device(text, text, text, text) TO authenticated;

-- 2. Update get_user_push_tokens to strictly return non-invalidated tokens for the target user only
CREATE OR REPLACE FUNCTION public.get_user_push_tokens(p_user_id uuid)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_tokens text[];
BEGIN
  IF p_user_id IS NULL THEN
    RETURN ARRAY[]::text[];
  END IF;

  SELECT coalesce(array_agg(DISTINCT t.token), ARRAY[]::text[])
  INTO v_tokens
  FROM (
    -- Valid active tokens in user_devices (not invalidated)
    SELECT ud.expo_push_token AS token
    FROM public.user_devices ud
    WHERE ud.user_id = p_user_id
      AND ud.invalidated_at IS NULL
      AND ud.expo_push_token IS NOT NULL
      AND ud.expo_push_token <> ''
      -- Verify this token hasn't been claimed more recently by someone else
      AND NOT EXISTS (
        SELECT 1
        FROM public.user_devices other
        WHERE other.expo_push_token = ud.expo_push_token
          AND other.user_id <> p_user_id
          AND other.invalidated_at IS NULL
          AND other.last_seen_at > ud.last_seen_at
      )
    UNION
    -- Token in user_profiles fallback
    SELECT up.push_token AS token
    FROM public.user_profiles up
    WHERE up.id = p_user_id
      AND up.push_token IS NOT NULL
      AND up.push_token <> ''
      -- Ensure not claimed by another user's active device
      AND NOT EXISTS (
        SELECT 1
        FROM public.user_devices other
        WHERE other.expo_push_token = up.push_token
          AND other.user_id <> p_user_id
          AND other.invalidated_at IS NULL
      )
  ) t
  WHERE t.token IS NOT NULL AND t.token <> '';

  RETURN coalesce(v_tokens, ARRAY[]::text[]);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_push_tokens(uuid) TO authenticated, service_role;

-- 3. Update dispatch_notification_command with anti-self-alert safety check
CREATE OR REPLACE FUNCTION public.dispatch_notification_command(
  p_recipient_id uuid,
  p_title text,
  p_body text,
  p_type text DEFAULT 'general',
  p_related_id text DEFAULT NULL,
  p_deep_link text DEFAULT NULL,
  p_data jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  notification_id uuid,
  push_tokens text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_safe_type public.notification_type;
  v_category text := 'general';
  v_priority text := 'normal';
  v_idempotency_key text := nullif(trim(coalesce(p_data ->> 'idempotency_key', '')), '');
  v_tokens text[] := ARRAY[]::text[];
  v_notif_id uuid;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_recipient_id IS NULL THEN
    RAISE EXCEPTION 'Recipient ID is required';
  END IF;

  -- ANTI-SELF-ALERT GUARD:
  -- If actor triggers an event where they are accidentally set as recipient,
  -- suppress it unless it is an explicit system or testing alert
  IF v_actor_id = p_recipient_id AND p_type NOT IN ('system_alert', 'test_ping') THEN
    RETURN QUERY SELECT gen_random_uuid(), ARRAY[]::text[];
    RETURN;
  END IF;

  -- Safely cast the type string to the enum, falling back to 'general'
  BEGIN
    v_safe_type := p_type::public.notification_type;
  EXCEPTION WHEN invalid_text_representation THEN
    v_safe_type := 'general'::public.notification_type;
  END;

  -- Determine category and priority based on type
  IF p_type = 'chat_message' THEN
    v_category := 'message';
    v_priority := 'high';
    v_idempotency_key := coalesce(v_idempotency_key, 'chat_' || coalesce(p_data ->> 'messageId', gen_random_uuid()::text));
  ELSIF p_type LIKE 'delivery_%' THEN
    v_category := 'parcel_update';
    v_priority := 'high';
  ELSIF p_type LIKE 'request_%' OR p_type = 'new_request' OR p_type = 'new_offer' THEN
    v_category := 'matching';
    v_priority := 'high';
  ELSIF p_type LIKE 'payment_%' THEN
    v_category := 'payment';
    v_priority := 'high';
  ELSIF p_type LIKE 'trip_%' THEN
    v_category := 'trip_update';
    v_priority := 'normal';
  ELSIF p_type LIKE 'parcel_%' THEN
    v_category := 'parcel_update';
    v_priority := 'normal';
  END IF;

  -- Insert the notification record strictly for p_recipient_id
  INSERT INTO public.notifications (
    user_id,
    title,
    body,
    type,
    category,
    priority,
    deep_link,
    data,
    related_id,
    idempotency_key
  ) VALUES (
    p_recipient_id,
    trim(p_title),
    trim(p_body),
    v_safe_type,
    v_category,
    v_priority,
    p_deep_link,
    p_data,
    p_related_id,
    v_idempotency_key
  )
  ON CONFLICT (idempotency_key) DO UPDATE
    SET title = excluded.title,
        body = excluded.body,
        data = excluded.data
  RETURNING id INTO v_notif_id;

  -- Fetch ONLY the target recipient's push tokens
  SELECT coalesce(public.get_user_push_tokens(p_recipient_id), ARRAY[]::text[])
  INTO v_tokens;

  RETURN QUERY
    SELECT coalesce(v_notif_id, gen_random_uuid()), coalesce(v_tokens, ARRAY[]::text[]);
END;
$$;

GRANT EXECUTE ON FUNCTION public.dispatch_notification_command(uuid, text, text, text, text, text, jsonb) TO authenticated;

COMMIT;

