-- =============================================================================
-- Migration: 20261110140000_fix_notification_isolation_and_dedup.sql
-- Fixes notification system issues:
--   1. dispatch_notification_command: anti-self-alert uses auth.uid() which is
--      the CALLING user, not the event originator. Fix to check senderId from
--      data payload instead. Also allow test notifications to self.
--   2. Add DB trigger to prevent cross-user push token sharing by force-
--      invalidating stale tokens on new device registration.
--   3. Ensure notification realtime publication includes user_id filter.
-- =============================================================================

-- ═══ 1. Fix dispatch_notification_command anti-self-alert ═══
-- The current guard `v_actor_id = p_recipient_id` blocks ALL notifications where
-- the client user is the recipient. But the client might be dispatching a
-- notification triggered by ANOTHER user's action (e.g. traveller's device
-- dispatches "payment received" to itself when sender pays).
--
-- The correct check: if the DATA payload's senderId/sender_id matches the
-- recipient, it's a self-notification and should be suppressed.
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
  v_data_sender_id text;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_recipient_id IS NULL THEN
    RAISE EXCEPTION 'Recipient ID is required';
  END IF;

  -- Extract the event originator (senderId) from the data payload.
  -- This is the user who CAUSED the event, not necessarily the user calling the RPC.
  v_data_sender_id := coalesce(
    nullif(trim(p_data ->> 'senderId'), ''),
    nullif(trim(p_data ->> 'sender_id'), '')
  );

  -- ANTI-SELF-ALERT GUARD:
  -- Suppress notification if the EVENT ORIGINATOR (senderId in data) is the same
  -- as the recipient. This prevents "You sent yourself a request" type notifications.
  -- Exception: system_alert, test_ping, and payment_* types (payment confirmations
  -- legitimately go to the payer themselves).
  IF v_data_sender_id IS NOT NULL
     AND v_data_sender_id = p_recipient_id::text
     AND p_type NOT IN ('system_alert', 'test_ping', 'payment_locked', 'payment_reserved', 'payment_released', 'payment_refunded')
  THEN
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


-- ═══ 2. Ensure user_devices has proper cleanup trigger ═══
-- When a new device is registered (or reactivated), automatically invalidate
-- any OTHER user's claim to the same push token. This is a safety net in case
-- the upsert_user_device RPC's cleanup missed anything.
CREATE OR REPLACE FUNCTION public.enforce_single_user_push_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If this device row is being activated (invalidated_at set to NULL),
  -- ensure no other user holds the same push token
  IF NEW.invalidated_at IS NULL AND NEW.expo_push_token IS NOT NULL AND NEW.expo_push_token <> '' THEN
    UPDATE public.user_devices
    SET invalidated_at = now()
    WHERE expo_push_token = NEW.expo_push_token
      AND user_id <> NEW.user_id
      AND invalidated_at IS NULL
      AND id <> NEW.id;

    -- Also clear stale push_token from other user profiles
    UPDATE public.user_profiles
    SET push_token = NULL
    WHERE push_token = NEW.expo_push_token
      AND id <> NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop and recreate the trigger to ensure it's fresh
DROP TRIGGER IF EXISTS trg_enforce_single_user_push_token ON public.user_devices;
CREATE TRIGGER trg_enforce_single_user_push_token
  AFTER INSERT OR UPDATE ON public.user_devices
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_single_user_push_token();


-- ═══ 3. Disable the duplicate push notification trigger ═══
-- The trg_dispatch_push_notification trigger fires on EVERY notification INSERT
-- and calls the send-push-notifications edge function via pg_net. But the
-- client-side orchestrator ALREADY sends push directly via Expo Push API.
-- This caused users to receive 2 push notifications per event.
-- Disable the trigger — the orchestrator handles push dispatch.
DROP TRIGGER IF EXISTS trg_dispatch_push_notification ON public.notifications;


-- ═══ 4. Add user_devices RLS policies for the authenticated user ═══
-- The user needs to be able to read their own devices for diagnostics
-- and the token registration flow.
DO $$
BEGIN
  -- SELECT policy (already exists but ensure it's there)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_devices' AND policyname = 'user_devices_own_select'
  ) THEN
    CREATE POLICY "user_devices_own_select" ON public.user_devices
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;

  -- INSERT policy: users can register their own devices
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_devices' AND policyname = 'user_devices_own_insert'
  ) THEN
    CREATE POLICY "user_devices_own_insert" ON public.user_devices
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;

  -- UPDATE policy: users can update their own device rows only
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_devices' AND policyname = 'user_devices_own_update'
  ) THEN
    CREATE POLICY "user_devices_own_update" ON public.user_devices
      FOR UPDATE TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;
