-- =============================================================================
-- Migration: 20261110130000_fix_remaining_lint_errors.sql
-- Fixes 5 remaining lint errors after the first pass:
--   1. create_delivery: qualified column names in INSERT column list (invalid SQL)
--   2. complete_delivery_command: qualified SET column (invalid SQL)
--   3. cms_review_kyc: kyc_approved/rejected/resubmission not in notification_type enum
--   4. delete_conversation_command: text = uuid type mismatch on related_id
--   5. submit_manual_kyc: no unique constraint on kyc_sessions(user_id)
-- =============================================================================

-- ─── SCHEMA FIXES ────────────────────────────────────────────────────────────

-- Add missing notification_type enum values for KYC
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'notification_type' AND e.enumlabel = 'kyc_approved') THEN
    ALTER TYPE public.notification_type ADD VALUE 'kyc_approved';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'notification_type' AND e.enumlabel = 'kyc_rejected') THEN
    ALTER TYPE public.notification_type ADD VALUE 'kyc_rejected';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'notification_type' AND e.enumlabel = 'kyc_resubmission') THEN
    ALTER TYPE public.notification_type ADD VALUE 'kyc_resubmission';
  END IF;
END $$;

-- Add unique constraint on kyc_sessions(user_id) for ON CONFLICT support
-- First add document_url column if it doesn't exist (used by submit_manual_kyc)
ALTER TABLE public.kyc_sessions ADD COLUMN IF NOT EXISTS document_url text;

-- Add unique constraint (if a user already has multiple sessions, keep only the latest)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'kyc_sessions_user_id_unique' AND conrelid = 'public.kyc_sessions'::regclass
  ) THEN
    -- Delete duplicate user sessions keeping only the latest
    DELETE FROM public.kyc_sessions ks
    WHERE ks.id NOT IN (
      SELECT DISTINCT ON (user_id) id
      FROM public.kyc_sessions
      ORDER BY user_id, created_at DESC
    );
    ALTER TABLE public.kyc_sessions ADD CONSTRAINT kyc_sessions_user_id_unique UNIQUE (user_id);
  END IF;
END $$;


-- ─── FUNCTION FIXES ──────────────────────────────────────────────────────────

-- ═══ 1. create_delivery ═══
-- FIX: remove table qualification from INSERT column list (not valid SQL)
-- Use ON CONFLICT ON CONSTRAINT to avoid OUT-param ambiguity
CREATE OR REPLACE FUNCTION public.create_delivery(p_request_id uuid)
RETURNS TABLE (
  id uuid,
  request_id uuid,
  pickup_confirmed boolean,
  pickup_confirmed_at timestamptz,
  delivery_confirmed boolean,
  delivery_confirmed_at timestamptz,
  status public.delivery_status,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_request public.requests%rowtype;
  v_pickup_otp text;
  v_delivery_otp text;
BEGIN
  SELECT * INTO v_request FROM public.requests WHERE requests.id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF v_request.traveller_id <> auth.uid() AND v_request.sender_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the assigned traveller or sender can initialize a delivery';
  END IF;

  IF v_request.status <> 'accepted' AND v_request.status <> 'completed' THEN
    RAISE EXCEPTION 'A delivery can only be created for an accepted request';
  END IF;

  v_pickup_otp := public.generate_pickup_otp();
  v_delivery_otp := public.generate_delivery_code();

  INSERT INTO public.deliveries AS del (
    request_id,
    pickup_otp,
    delivery_otp,
    otp_hash,
    status
  )
  VALUES (
    p_request_id,
    v_pickup_otp,
    v_delivery_otp,
    extensions.crypt(v_delivery_otp, extensions.gen_salt('bf')),
    'awaiting_pickup'
  )
  ON CONFLICT ON CONSTRAINT deliveries_request_id_key DO UPDATE
  SET pickup_otp = CASE
        WHEN del.pickup_otp IS NULL OR trim(del.pickup_otp) = ''
        THEN EXCLUDED.pickup_otp
        ELSE del.pickup_otp
      END,
      delivery_otp = CASE
        WHEN del.delivery_otp IS NULL OR trim(del.delivery_otp) = ''
        THEN EXCLUDED.delivery_otp
        ELSE del.delivery_otp
      END,
      otp_hash = CASE
        WHEN del.otp_hash IS NULL
        THEN EXCLUDED.otp_hash
        ELSE del.otp_hash
      END;

  RETURN QUERY
    SELECT d.id, d.request_id, d.pickup_confirmed, d.pickup_confirmed_at,
           d.delivery_confirmed, d.delivery_confirmed_at, d.status, d.created_at
    FROM public.deliveries d
    WHERE d.request_id = p_request_id;
END;
$$;


-- ═══ 2. complete_delivery_command ═══
-- FIX: remove table qualification from SET clause (status = 'delivered' not deliveries.status)
CREATE OR REPLACE FUNCTION public.complete_delivery_command(p_delivery_id uuid, p_otp text)
RETURNS TABLE (
  id uuid,
  request_id uuid,
  pickup_confirmed boolean,
  pickup_confirmed_at timestamptz,
  delivery_confirmed boolean,
  delivery_confirmed_at timestamptz,
  status public.delivery_status,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_delivery public.deliveries%rowtype;
  v_request public.requests%rowtype;
  v_clean_otp text := trim(coalesce(p_otp, ''));
  v_matched boolean := false;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_delivery
  FROM public.deliveries
  WHERE deliveries.id = p_delivery_id OR deliveries.request_id = p_delivery_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery not found';
  END IF;

  SELECT * INTO v_request FROM public.requests WHERE requests.id = v_delivery.request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF v_actor_id <> v_request.traveller_id THEN
    RAISE EXCEPTION 'Only the assigned traveller can complete delivery';
  END IF;

  IF NOT coalesce(v_delivery.pickup_confirmed, false) THEN
    RAISE EXCEPTION 'Cannot complete delivery before parcel pickup is confirmed';
  END IF;

  IF v_delivery.delivery_confirmed AND v_delivery.status = 'delivered' THEN
    UPDATE public.requests
    SET status = 'completed', updated_at = now()
    WHERE requests.id = v_request.id AND requests.status <> 'completed';

    BEGIN
      PERFORM public.award_delivery_coins(v_delivery.id);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    RETURN QUERY
      SELECT d.id, d.request_id, d.pickup_confirmed, d.pickup_confirmed_at,
             d.delivery_confirmed, d.delivery_confirmed_at, d.status, d.created_at
      FROM public.deliveries d
      WHERE d.id = v_delivery.id;
    RETURN;
  END IF;

  IF v_delivery.otp_locked_until IS NOT NULL AND v_delivery.otp_locked_until > now() THEN
    RAISE EXCEPTION 'Delivery code verification locked due to too many failed attempts. Please try again in % minutes.',
      ceil(extract(epoch from (v_delivery.otp_locked_until - now())) / 60);
  END IF;

  IF v_delivery.delivery_otp IS NOT NULL AND v_clean_otp = trim(v_delivery.delivery_otp) THEN
    v_matched := true;
  ELSIF v_delivery.otp_hash IS NOT NULL AND extensions.crypt(v_clean_otp, v_delivery.otp_hash) = v_delivery.otp_hash THEN
    v_matched := true;
  END IF;

  IF NOT v_matched THEN
    UPDATE public.deliveries
    SET otp_attempt_count = coalesce(otp_attempt_count, 0) + 1,
        otp_locked_until = CASE WHEN coalesce(otp_attempt_count, 0) + 1 >= 5 THEN now() + interval '15 minutes' ELSE NULL END,
        updated_at = now()
    WHERE deliveries.id = v_delivery.id;

    RAISE EXCEPTION 'Invalid delivery code. Please check with the recipient.';
  END IF;

  UPDATE public.deliveries
  SET delivery_confirmed = true,
      delivery_confirmed_at = now(),
      status = 'delivered',
      delivery_otp = coalesce(v_delivery.delivery_otp, v_clean_otp),
      trip_status = 'Delivered',
      otp_attempt_count = 0,
      otp_locked_until = NULL,
      updated_at = now()
  WHERE deliveries.id = v_delivery.id
  RETURNING * INTO v_delivery;

  UPDATE public.requests
  SET status = 'completed',
      updated_at = now()
  WHERE requests.id = v_request.id;

  UPDATE public.payments
  SET status = 'released',
      released_at = now()
  WHERE payments.request_id = v_request.id AND payments.status = 'locked';

  IF v_request.parcel_id IS NOT NULL THEN
    UPDATE public.parcels
    SET status = 'delivered',
        updated_at = now()
    WHERE parcels.id = v_request.parcel_id;
  END IF;

  IF v_request.trip_id IS NOT NULL THEN
    UPDATE public.trips
    SET status = 'completed',
        updated_at = now()
    WHERE trips.id = v_request.trip_id;
  END IF;

  BEGIN
    UPDATE public.user_profiles
    SET total_deliveries = coalesce(total_deliveries, 0) + 1,
        updated_at = now()
    WHERE user_profiles.id = v_request.traveller_id;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  BEGIN
    PERFORM public.award_delivery_coins(v_delivery.id);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  BEGIN
    PERFORM public.emit_domain_event(
      v_actor_id,
      'delivery',
      v_delivery.id,
      'delivery_completed',
      'delivery.completed',
      jsonb_build_object(
        'delivery_id', v_delivery.id,
        'request_id', v_request.id,
        'sender_id', v_request.sender_id,
        'traveller_id', v_request.traveller_id
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN QUERY
    SELECT d.id, d.request_id, d.pickup_confirmed, d.pickup_confirmed_at,
           d.delivery_confirmed, d.delivery_confirmed_at, d.status, d.created_at
    FROM public.deliveries d
    WHERE d.id = v_delivery.id;
END;
$$;


-- ═══ 3. delete_conversation_command ═══
-- FIX: cast p_conversation_id to text for related_id comparison (related_id is text, not uuid)
CREATE OR REPLACE FUNCTION public.delete_conversation_command(
  p_conversation_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_conversation public.conversations%rowtype;
  v_request public.requests%rowtype;
  v_is_delivered boolean := false;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO v_conversation
  FROM public.conversations c
  WHERE c.id = p_conversation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;

  IF NOT (v_actor_id = any(v_conversation.participant_ids)) THEN
    RAISE EXCEPTION 'You are not a participant in this conversation';
  END IF;

  SELECT *
  INTO v_request
  FROM public.requests req
  WHERE req.id = v_conversation.request_id;

  SELECT (del.delivery_confirmed = true OR del.status = 'delivered')
  INTO v_is_delivered
  FROM public.deliveries del
  WHERE del.request_id = v_conversation.request_id
  LIMIT 1;

  IF (v_request.status IS NULL OR v_request.status <> 'completed') AND NOT coalesce(v_is_delivered, false) THEN
    RAISE EXCEPTION 'Chats can only be deleted after the delivery is completed';
  END IF;

  DELETE FROM public.conversations WHERE conversations.id = p_conversation_id;

  BEGIN
    DELETE FROM public.notifications
    WHERE notifications.user_id = v_actor_id
      AND (notifications.related_id = p_conversation_id::text OR notifications.deep_link = '/chat/' || p_conversation_id::text);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  PERFORM public.emit_domain_event(
    v_actor_id,
    'conversation',
    p_conversation_id,
    'conversation_deleted',
    'conversation.deleted',
    jsonb_build_object(
      'conversation_id', p_conversation_id,
      'deleted_by', v_actor_id,
      'request_id', v_conversation.request_id
    )
  );

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_conversation_command(uuid) TO authenticated;
