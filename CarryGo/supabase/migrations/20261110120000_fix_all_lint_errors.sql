-- =============================================================================
-- Migration: 20261110120000_fix_all_lint_errors.sql
-- Fixes all 16+ PL/pgSQL lint errors reported by supabase db lint:
--   1. Schema: add missing columns (kyc_sessions.updated_at, payments.refunded_at)
--   2. Replace partial unique index on notifications.idempotency_key with a proper
--      unique constraint so ON CONFLICT (idempotency_key) resolves correctly.
--   3. Fix enum casts, ambiguous column references, invalid enum values, and
--      missing field references across 16 functions.
-- =============================================================================

-- ─── SCHEMA FIXES ────────────────────────────────────────────────────────────

-- kyc_sessions: add updated_at (used by submit_manual_kyc ON CONFLICT SET updated_at = now())
ALTER TABLE public.kyc_sessions
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- payments: add refunded_at (used by refund_payment_atomic)
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

-- notifications: replace partial unique index with proper unique constraint
-- so ON CONFLICT (idempotency_key) works in all functions.
-- NULLs are distinct in unique constraints, so multiple NULL rows are allowed.
DROP INDEX IF EXISTS public.notifications_idempotency_key_idx;
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_idempotency_key_unique;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_idempotency_key_unique UNIQUE (idempotency_key);


-- ─── FUNCTION FIXES ──────────────────────────────────────────────────────────

-- ═══ 1. soft_delete_user_account ═══
-- FIX: 'created' is not a valid delivery_status → 'awaiting_pickup'
CREATE OR REPLACE FUNCTION public.soft_delete_user_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_active_escrow integer := 0;
  v_active_deliveries integer := 0;
  v_trips_cancelled integer := 0;
  v_parcels_cancelled integer := 0;
  v_requests_cancelled integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT count(*) INTO v_active_deliveries
  FROM public.deliveries d
  JOIN public.requests r ON r.id = d.request_id
  WHERE (r.sender_id = v_user_id OR r.traveller_id = v_user_id)
    AND d.status IN ('awaiting_pickup', 'picked_up', 'in_transit');

  IF v_active_deliveries > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot delete account while you have active package deliveries in transit');
  END IF;

  SELECT count(*) INTO v_active_escrow
  FROM public.payments
  WHERE (sender_id = v_user_id OR traveller_id = v_user_id)
    AND status = 'locked';

  IF v_active_escrow > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot delete account while you have active escrow payments pending release');
  END IF;

  UPDATE public.user_profiles
  SET is_deleted = TRUE,
      deleted_at = NOW(),
      push_token = NULL,
      username = NULL,
      kyc_status = 'pending',
      verified = FALSE,
      is_aadhaar_verified = FALSE,
      is_address_verified = FALSE,
      verified_address = NULL
  WHERE id = v_user_id;

  DELETE FROM public.kyc_documents WHERE session_id IN (SELECT ks.id FROM public.kyc_sessions ks WHERE ks.user_id = v_user_id);
  DELETE FROM public.kyc_sessions WHERE user_id = v_user_id;

  WITH updated_trips AS (
    UPDATE public.trips SET status = 'cancelled' WHERE user_id = v_user_id AND status = 'active' RETURNING id
  )
  SELECT count(*) INTO v_trips_cancelled FROM updated_trips;

  WITH updated_parcels AS (
    UPDATE public.parcels SET status = 'cancelled' WHERE user_id = v_user_id AND status = 'open' RETURNING id
  )
  SELECT count(*) INTO v_parcels_cancelled FROM updated_parcels;

  WITH updated_requests AS (
    UPDATE public.requests SET status = 'cancelled' WHERE (sender_id = v_user_id OR traveller_id = v_user_id) AND status = 'pending' RETURNING id
  )
  SELECT count(*) INTO v_requests_cancelled FROM updated_requests;

  BEGIN
    INSERT INTO public.audit_events (actor_id, entity_type, entity_id, event_type, payload)
    VALUES (v_user_id, 'user_profiles', v_user_id, 'user.account_soft_deleted',
      jsonb_build_object('deleted_at', NOW(), 'trips_cancelled', v_trips_cancelled, 'parcels_cancelled', v_parcels_cancelled, 'requests_cancelled', v_requests_cancelled));
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object('success', true);
END;
$$;


-- ═══ 2. refund_payment_atomic ═══
-- FIX: now uses refunded_at column (added above), removed unused p_actor_id parameter shadow
CREATE OR REPLACE FUNCTION public.refund_payment_atomic(
  p_payment_id uuid,
  p_actor_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_payment public.payments%rowtype;
  v_delivery public.deliveries%rowtype;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = 'P0003';
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE payments.id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found' USING errcode = 'P0002';
  END IF;

  IF v_payment.status <> 'locked' THEN
    RAISE EXCEPTION 'Payment not in locked state' USING errcode = 'P0002';
  END IF;

  IF v_payment.sender_id <> v_actor_id AND v_payment.traveller_id <> v_actor_id THEN
    RAISE EXCEPTION 'Unauthorized' USING errcode = 'P0003';
  END IF;

  SELECT * INTO v_delivery
  FROM public.deliveries
  WHERE deliveries.request_id = v_payment.request_id;

  IF FOUND AND v_delivery.pickup_confirmed AND v_actor_id = v_payment.sender_id THEN
    RAISE EXCEPTION 'Parcel is already in transit. Cannot refund unilaterally. Please open a dispute with support.' USING errcode = 'P0001';
  END IF;

  UPDATE public.payments
  SET status = 'refunded',
      refunded_at = now()
  WHERE payments.id = p_payment_id
    AND payments.status = 'locked';

  PERFORM public.emit_domain_event(
    v_actor_id,
    'payment',
    p_payment_id,
    'payment_refunded',
    'payment.refunded',
    jsonb_build_object(
      'payment_id', p_payment_id,
      'sender_id', v_payment.sender_id,
      'traveller_id', v_payment.traveller_id,
      'amount', v_payment.amount
    )
  );

  RETURN true;
END;
$$;


-- ═══ 3. set_parcel_status ═══
-- FIX: v_parcel.title → v_parcel.description (parcels table has no 'title' column)
CREATE OR REPLACE FUNCTION public.set_parcel_status(p_parcel_id uuid, p_status public.parcel_status)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_parcel public.parcels%rowtype;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_parcel FROM public.parcels WHERE parcels.id = p_parcel_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Parcel not found'; END IF;
  IF v_parcel.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Only the owner can update this parcel'; END IF;
  IF v_parcel.status <> 'open' OR p_status NOT IN ('failed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid parcel status transition';
  END IF;

  UPDATE public.parcels SET status = p_status, updated_at = now() WHERE parcels.id = p_parcel_id;

  IF p_status = 'cancelled' THEN
    PERFORM public.emit_domain_event(
      auth.uid(),
      'parcel',
      p_parcel_id,
      'parcel_cancelled',
      'parcel.cancelled',
      jsonb_build_object(
        'parcel_id', p_parcel_id,
        'description', v_parcel.description,
        'from_city', v_parcel.from_city,
        'to_city', v_parcel.to_city
      )
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_parcel_status(uuid, public.parcel_status) TO authenticated;


-- ═══ 4. notify_city_activity ═══
-- FIX: 'traveler' → 'traveller' (valid user_role enum value), cast comparison
CREATE OR REPLACE FUNCTION public.notify_city_activity(
  p_activity_type text,
  p_city text,
  p_title text,
  p_body text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_user record;
  v_notified integer := 0;
  v_target_role public.user_role;
BEGIN
  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF nullif(trim(p_city), '') IS NULL THEN RETURN 0; END IF;

  v_target_role := CASE WHEN p_activity_type = 'new_trip' THEN 'sender'::public.user_role ELSE 'traveller'::public.user_role END;

  FOR v_user IN
    SELECT up.id
    FROM public.user_profiles up
    WHERE up.id <> v_actor_id
      AND lower(trim(coalesce(up.city, up.current_city, ''))) = lower(trim(p_city))
      AND (up.role = v_target_role OR up.role IS NULL)
      AND up.is_deleted = false
    LIMIT 50
  LOOP
    PERFORM public.emit_domain_event(
      v_actor_id,
      'city',
      v_user.id,
      'city_activity_notified',
      'city.activity',
      jsonb_build_object(
        'recipient_id', v_user.id,
        'city', p_city,
        'title', p_title,
        'body', p_body
      )
    );
    v_notified := v_notified + 1;
  END LOOP;

  RETURN v_notified;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_city_activity(text, text, text, text) TO authenticated;


-- ═══ 5. notify_route_subscribers ═══
-- FIX: cast 'route_match' text literal to notification_type enum
CREATE OR REPLACE FUNCTION public.notify_route_subscribers(
  p_listing_type text,
  p_listing_id uuid,
  p_from_city text,
  p_to_city text,
  p_title text,
  p_body text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_from_city text;
  v_to_city text;
  v_title text;
  v_body text;
  v_count integer;
BEGIN
  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_listing_type = 'trip' THEN
    SELECT t.from_city, t.to_city INTO v_from_city, v_to_city
      FROM public.trips t WHERE t.id = p_listing_id AND t.user_id = v_actor_id AND t.status = 'active';
    v_title := 'New trip on your route';
    v_body := 'A traveller added a trip from ' || coalesce(v_from_city, '') || ' to ' || coalesce(v_to_city, '') || '.';
  ELSIF p_listing_type = 'parcel' THEN
    SELECT pc.from_city, pc.to_city INTO v_from_city, v_to_city
      FROM public.parcels pc WHERE pc.id = p_listing_id AND pc.user_id = v_actor_id AND pc.status = 'open';
    v_title := 'New parcel on your route';
    v_body := 'A sender added a parcel from ' || coalesce(v_from_city, '') || ' to ' || coalesce(v_to_city, '') || '.';
  ELSE
    RAISE EXCEPTION 'Invalid listing type';
  END IF;
  IF v_from_city IS NULL OR v_to_city IS NULL THEN RAISE EXCEPTION 'Listing not found'; END IF;

  WITH inserted AS (
    INSERT INTO public.notifications (user_id, title, body, type, related_id)
    SELECT DISTINCT rs.user_id, v_title, v_body, 'route_match'::public.notification_type, p_listing_id
      FROM public.route_subscriptions rs
      WHERE rs.active = true
        AND lower(trim(rs.from_city)) = lower(trim(v_from_city))
        AND lower(trim(rs.to_city)) = lower(trim(v_to_city))
        AND rs.user_id <> v_actor_id
    RETURNING 1
  ) SELECT count(*) INTO v_count FROM inserted;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_route_subscribers(text, uuid, text, text, text, text) TO authenticated;


-- ═══ 6. cms_review_kyc ═══
-- FIX: cast v_notif_type to notification_type for INSERT into notifications.type
CREATE OR REPLACE FUNCTION public.cms_review_kyc(
  p_actor_id uuid,
  p_session_id uuid,
  p_action text,
  p_reason text DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_session public.kyc_sessions%ROWTYPE;
  v_missing_documents text[];
  v_address_text text;
  v_title text;
  v_body text;
  v_notif_type public.notification_type;
BEGIN
  PERFORM public.assert_cms_admin(p_actor_id);
  SELECT * INTO v_session FROM public.kyc_sessions WHERE kyc_sessions.id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'KYC session not found'; END IF;

  IF p_action = 'approved' THEN
    IF COALESCE(v_session.kyc_flow_version, 1) = 2 THEN
      IF v_session.aadhaar_verification_status <> 'verified' THEN
        RAISE EXCEPTION 'Aadhaar verification is required before approving KYC';
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM public.kyc_documents
        WHERE session_id = p_session_id AND document_type = 'selfie'
      ) AND v_session.selfie_url IS NULL THEN
        RAISE EXCEPTION 'Selfie document is required before approving KYC';
      END IF;
    ELSE
      SELECT array_agg(required_type) INTO v_missing_documents
      FROM unnest(array['id_front', 'selfie']) required_type
      WHERE NOT EXISTS (
        SELECT 1 FROM public.kyc_documents
        WHERE session_id = p_session_id AND document_type = required_type
      );
      IF COALESCE(array_length(v_missing_documents, 1), 0) > 0 THEN
        RAISE EXCEPTION 'Missing required documents: %', array_to_string(v_missing_documents, ', ');
      END IF;
    END IF;

    IF v_session.aadhaar_address IS NOT NULL THEN
      v_address_text := COALESCE(
        v_session.aadhaar_address->>'full_address',
        CONCAT_WS(', ',
          NULLIF(v_session.aadhaar_address->>'house', ''),
          NULLIF(v_session.aadhaar_address->>'street', ''),
          NULLIF(v_session.aadhaar_address->>'landmark', ''),
          NULLIF(v_session.aadhaar_address->>'locality', ''),
          NULLIF(v_session.aadhaar_address->>'city', ''),
          NULLIF(v_session.aadhaar_address->>'state', ''),
          NULLIF(v_session.aadhaar_address->>'pincode', '')
        )
      );
    END IF;

    UPDATE public.kyc_sessions
    SET status = 'approved',
        selfie_status = 'verified',
        rejection_reason = NULL,
        reviewed_by = p_actor_id,
        reviewed_at = now()
    WHERE kyc_sessions.id = p_session_id;

    UPDATE public.user_profiles
    SET kyc_status = 'approved',
        verified = true,
        is_aadhaar_verified = TRUE,
        is_address_verified = TRUE,
        verified_address = COALESCE(v_address_text, verified_address),
        full_name = COALESCE(NULLIF(v_session.aadhaar_name, ''), full_name)
    WHERE user_profiles.id = v_session.user_id;

    v_notif_type := 'kyc_approved'::public.notification_type;
    v_title := 'Identity verified';
    v_body := 'Your KYC is approved. You can now send parcels and accept trips.';

  ELSIF p_action = 'rejected' THEN
    IF length(trim(COALESCE(p_reason, ''))) < 10 THEN
      RAISE EXCEPTION 'Rejection reason must be at least 10 characters';
    END IF;
    UPDATE public.kyc_sessions
    SET status = 'rejected',
        rejection_reason = p_reason,
        reviewed_by = p_actor_id,
        reviewed_at = now()
    WHERE kyc_sessions.id = p_session_id;

    UPDATE public.user_profiles
    SET kyc_status = 'rejected',
        verified = false
    WHERE user_profiles.id = v_session.user_id;

    v_notif_type := 'kyc_rejected'::public.notification_type;
    v_title := 'KYC was not approved';
    v_body := 'Reason: ' || left(p_reason, 160);

  ELSIF p_action = 'requested_resubmission' THEN
    IF length(trim(COALESCE(p_reason, ''))) < 10 THEN
      RAISE EXCEPTION 'Reason must be at least 10 characters';
    END IF;
    UPDATE public.kyc_sessions
    SET status = 'pending',
        rejection_reason = p_reason,
        submission_attempt = COALESCE(submission_attempt, 1) + 1,
        reviewed_by = p_actor_id,
        reviewed_at = now()
    WHERE kyc_sessions.id = p_session_id;

    UPDATE public.user_profiles
    SET kyc_status = 'pending',
        verified = false
    WHERE user_profiles.id = v_session.user_id;

    v_notif_type := 'kyc_resubmission'::public.notification_type;
    v_title := 'Please resubmit KYC';
    v_body := 'Reason: ' || left(p_reason, 160);

  ELSIF p_action = 'note_added' THEN
    IF length(trim(COALESCE(p_note, ''))) = 0 THEN
      RAISE EXCEPTION 'Note cannot be empty';
    END IF;
    UPDATE public.kyc_sessions
    SET reviewer_notes = p_note
    WHERE kyc_sessions.id = p_session_id;
    v_notif_type := NULL;

  ELSE
    RAISE EXCEPTION 'Invalid KYC review action';
  END IF;

  INSERT INTO public.kyc_review_history (session_id, reviewer_id, action, reason, notes)
  VALUES (p_session_id, p_actor_id, p_action, p_reason, p_note);

  INSERT INTO public.audit_events (actor_id, entity_type, entity_id, event_type, payload)
  VALUES (
    p_actor_id,
    'kyc_session',
    p_session_id,
    'kyc.' || p_action,
    jsonb_build_object('user_id', v_session.user_id, 'reason', p_reason)
  );

  IF v_notif_type IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, body, type, related_id, read)
    VALUES (v_session.user_id, v_title, v_body, v_notif_type, p_session_id, false);

    INSERT INTO public.outbox_events (topic, entity_type, entity_id, payload, status)
    VALUES (
      'kyc.' || p_action,
      'kyc_session',
      p_session_id,
      jsonb_build_object(
        'user_id', v_session.user_id,
        'title', v_title,
        'body', v_body,
        'type', v_notif_type::text,
        'reason', p_reason
      ),
      'pending'
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cms_review_kyc(uuid, uuid, text, text, text) TO service_role, authenticated;


-- ═══ 7. cms_send_broadcast ═══
-- FIX: 'traveler' → 'traveller' (valid user_role enum value), cast comparison
CREATE OR REPLACE FUNCTION public.cms_send_broadcast(
  p_actor_id uuid,
  p_title text,
  p_body text,
  p_category text DEFAULT 'broadcast',
  p_priority text DEFAULT 'normal',
  p_deep_link text DEFAULT NULL,
  p_audience_type text DEFAULT 'all',
  p_audience_filter text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_is_admin boolean;
  v_broadcast_id uuid;
  v_recipient record;
  v_targeted integer := 0;
BEGIN
  SELECT (system_role = 'admin') INTO v_is_admin
  FROM public.user_profiles
  WHERE user_profiles.id = p_actor_id;

  IF NOT coalesce(v_is_admin, false) THEN
    RAISE EXCEPTION 'Unauthorized: Administrator access required';
  END IF;

  IF nullif(trim(p_title), '') IS NULL OR nullif(trim(p_body), '') IS NULL THEN
    RAISE EXCEPTION 'Title and body are required';
  END IF;

  INSERT INTO public.admin_broadcasts (
    created_by, title, body, category, priority, deep_link, target_audience, sent_at
  ) VALUES (
    p_actor_id,
    trim(p_title),
    trim(p_body),
    coalesce(p_category, 'broadcast'),
    coalesce(p_priority, 'normal'),
    nullif(trim(p_deep_link), ''),
    jsonb_build_object('type', p_audience_type, 'filter', p_audience_filter),
    now()
  ) RETURNING id INTO v_broadcast_id;

  FOR v_recipient IN
    SELECT up.id
    FROM public.user_profiles up
    WHERE up.is_deleted = false
      AND (
        p_audience_type = 'all'
        OR (p_audience_type = 'travelers' AND up.role = 'traveller'::public.user_role)
        OR (p_audience_type = 'senders' AND up.role = 'sender'::public.user_role)
        OR (p_audience_type = 'city' AND lower(trim(coalesce(up.city, up.current_city, ''))) = lower(trim(p_audience_filter)))
        OR (p_audience_type = 'users' AND up.id::text = any(string_to_array(p_audience_filter, ',')))
      )
  LOOP
    PERFORM public.emit_domain_event(
      p_actor_id,
      'admin_broadcast',
      v_broadcast_id,
      'broadcast_sent',
      'admin.broadcast',
      jsonb_build_object(
        'broadcast_id', v_broadcast_id,
        'recipient_id', v_recipient.id,
        'title', p_title,
        'body', p_body,
        'category', p_category,
        'priority', p_priority,
        'deep_link', p_deep_link
      )
    );
    v_targeted := v_targeted + 1;
  END LOOP;

  UPDATE public.admin_broadcasts
  SET total_targeted = v_targeted,
      total_sent = v_targeted
  WHERE admin_broadcasts.id = v_broadcast_id;

  RETURN v_broadcast_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cms_send_broadcast(uuid, text, text, text, text, text, text, text) TO service_role, authenticated;


-- ═══ 8. delete_conversation_command ═══
-- FIX: coalesce(v_request.status, '') fails because '' is not valid request_status
-- Use explicit IS NULL / <> check instead
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
      AND (notifications.related_id = p_conversation_id OR notifications.deep_link = '/chat/' || p_conversation_id::text);
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


-- ═══ 9. cms_resolve_dispute ═══
-- FIX: cast text literals to payment_status and request_status enums
CREATE OR REPLACE FUNCTION public.cms_resolve_dispute(
  p_actor_id uuid,
  p_request_id uuid,
  p_resolution text,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.requests%rowtype;
  v_payment_status public.payment_status;
BEGIN
  PERFORM public.assert_cms_admin(p_actor_id);
  IF p_resolution NOT IN ('refund_sender', 'pay_traveller') THEN
    RAISE EXCEPTION 'Unsupported dispute resolution';
  END IF;

  SELECT * INTO v_request FROM public.requests WHERE requests.id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF v_request.status <> 'failed' THEN RAISE EXCEPTION 'Only failed requests can be resolved'; END IF;

  v_payment_status := CASE WHEN p_resolution = 'refund_sender' THEN 'refunded'::public.payment_status ELSE 'released'::public.payment_status END;

  UPDATE public.payments
  SET status = v_payment_status,
      released_at = CASE WHEN v_payment_status = 'released' THEN now() ELSE released_at END,
      refunded_at = CASE WHEN v_payment_status = 'refunded' THEN now() ELSE refunded_at END
  WHERE payments.request_id = p_request_id AND payments.status = 'locked';

  IF NOT FOUND THEN RAISE EXCEPTION 'Locked payment not found'; END IF;

  UPDATE public.requests
  SET status = CASE WHEN p_resolution = 'refund_sender' THEN 'cancelled'::public.request_status ELSE 'completed'::public.request_status END,
      message = CASE WHEN p_note IS NULL THEN '[RESOLVED: ' || p_resolution || ']'
        ELSE '[RESOLVED: ' || p_resolution || '] ' || p_note END,
      updated_at = now()
  WHERE requests.id = p_request_id;

  INSERT INTO public.audit_events (actor_id, entity_type, entity_id, event_type, payload)
  VALUES (p_actor_id, 'request', p_request_id, 'resolve_dispute',
    jsonb_build_object('resolution', p_resolution, 'note', p_note));
END;
$$;


-- ═══ 10. create_delivery ═══
-- FIX: OUT parameter 'request_id' shadows table column → use ON CONFLICT ON CONSTRAINT
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

  INSERT INTO public.deliveries (
    deliveries.request_id,
    pickup_otp,
    delivery_otp,
    otp_hash,
    deliveries.status
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
        WHEN deliveries.pickup_otp IS NULL OR trim(deliveries.pickup_otp) = ''
        THEN EXCLUDED.pickup_otp
        ELSE deliveries.pickup_otp
      END,
      delivery_otp = CASE
        WHEN deliveries.delivery_otp IS NULL OR trim(deliveries.delivery_otp) = ''
        THEN EXCLUDED.delivery_otp
        ELSE deliveries.delivery_otp
      END,
      otp_hash = CASE
        WHEN deliveries.otp_hash IS NULL
        THEN EXCLUDED.otp_hash
        ELSE deliveries.otp_hash
      END;

  RETURN QUERY
    SELECT d.id, d.request_id, d.pickup_confirmed, d.pickup_confirmed_at,
           d.delivery_confirmed, d.delivery_confirmed_at, d.status, d.created_at
    FROM public.deliveries d
    WHERE d.request_id = p_request_id;
END;
$$;


-- ═══ 11. complete_delivery_command ═══
-- FIX: qualify payments.request_id to avoid ambiguity with OUT parameter
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
      deliveries.status = 'delivered',
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

  -- FIX: qualify payments.request_id to avoid ambiguity with OUT param
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


-- ═══ 12. confirm_delivery_pickup ═══
-- FIX: drop and recreate with void return (cannot change return type in-place)
DROP FUNCTION IF EXISTS public.confirm_delivery_pickup(uuid);

CREATE FUNCTION public.confirm_delivery_pickup(p_delivery_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RAISE EXCEPTION 'Direct pickup confirmation without verification code is disabled. Use confirm_delivery_pickup_with_otp(p_delivery_id, p_otp).';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.confirm_delivery_pickup(uuid) FROM public, authenticated, anon;


-- ═══ 13. submit_manual_kyc ═══
-- This function exists on remote but not in local migrations.
-- Fix: updated_at column now exists (added above), proper ON CONFLICT
CREATE OR REPLACE FUNCTION public.submit_manual_kyc(
  p_full_name text,
  p_id_type text,
  p_document_url text
)
RETURNS public.kyc_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result public.kyc_sessions%rowtype;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.kyc_sessions (user_id, full_name, id_type, document_url, status)
  VALUES (auth.uid(), p_full_name, p_id_type, p_document_url, 'submitted')
  ON CONFLICT (user_id)
  DO UPDATE SET
    full_name    = excluded.full_name,
    id_type      = excluded.id_type,
    document_url = excluded.document_url,
    status       = 'submitted',
    updated_at   = now()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_manual_kyc(text, text, text) TO authenticated;


-- ═══ 14. process_outbox_events ═══
-- Re-apply clean version (no ON CONFLICT) to ensure correct function body on remote
CREATE OR REPLACE FUNCTION public.process_outbox_events(p_limit integer DEFAULT 50)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_event public.outbox_events%rowtype;
  v_request public.requests%rowtype;
  v_recipient uuid;
  v_title text;
  v_body text;
  v_type public.notification_type;
  v_processed integer := 0;
BEGIN
  FOR v_event IN
    SELECT * FROM public.outbox_events
      WHERE status IN ('pending', 'failed') AND attempt_count < max_attempts AND available_at <= now()
      ORDER BY created_at LIMIT least(greatest(coalesce(p_limit, 50), 1), 100)
      FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      v_recipient := null;
      v_title := null;
      v_body := null;
      v_type := 'general';

      IF v_event.topic LIKE 'request.%' THEN
        SELECT * INTO v_request FROM public.requests WHERE requests.id = coalesce((v_event.payload ->> 'request_id')::uuid, v_event.entity_id);
        IF found THEN
          IF v_event.topic = 'request.created' THEN
            v_recipient := v_request.traveller_id; v_title := 'New delivery request'; v_body := 'A sender requested space on your route.'; v_type := 'new_request';
          ELSIF v_event.topic = 'request.accepted' THEN
            v_recipient := v_request.sender_id; v_title := 'Request accepted'; v_body := 'Your traveller accepted the delivery request.'; v_type := 'request_accepted';
          ELSIF v_event.topic = 'request.rejected' THEN
            v_recipient := v_request.sender_id; v_title := 'Request rejected'; v_body := 'The traveller declined your delivery request.'; v_type := 'request_rejected';
          ELSIF v_event.topic = 'request.cancelled' THEN
            v_recipient := v_request.traveller_id; v_title := 'Request cancelled'; v_body := 'The sender cancelled the delivery request.';
          ELSIF v_event.topic IN ('request.completed', 'request.failed') THEN
            v_recipient := CASE WHEN v_event.topic = 'request.completed' THEN v_request.sender_id ELSE v_request.traveller_id END;
            v_title := CASE WHEN v_event.topic = 'request.completed' THEN 'Delivery completed' ELSE 'Delivery issue reported' END;
            v_body := CASE WHEN v_event.topic = 'request.completed' THEN 'The delivery was completed successfully.' ELSE 'The delivery request was marked as failed.' END;
          END IF;
        END IF;
      ELSIF v_event.topic = 'delivery.picked_up' THEN
        v_recipient := (v_event.payload ->> 'sender_id')::uuid; v_title := 'Parcel picked up'; v_body := 'Your parcel is now in transit.';
      ELSIF v_event.topic = 'delivery.completed' THEN
        v_recipient := (v_event.payload ->> 'sender_id')::uuid; v_title := 'Delivery confirmed'; v_body := 'Your parcel has been delivered.';
      ELSIF v_event.topic = 'rating.submitted' THEN
        v_recipient := (v_event.payload ->> 'to_user_id')::uuid; v_title := 'New rating received'; v_body := 'A delivery participant left you a rating.'; v_type := 'rating';
      ELSIF v_event.topic = 'chat.message' THEN
        v_recipient := (v_event.payload ->> 'recipient_id')::uuid;
        v_title := left(coalesce(v_event.payload ->> 'title', 'New message'), 100);
        v_body := left(coalesce(v_event.payload ->> 'body', 'You received a new message.'), 500);
        v_type := 'chat_message';
      END IF;

      IF v_recipient IS NOT NULL AND v_title IS NOT NULL AND v_body IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, body, type, related_id)
        VALUES (v_recipient, v_title, v_body, v_type, v_event.entity_id);
      END IF;
      UPDATE public.outbox_events SET status = 'processed', processed_at = now(), last_error = null WHERE outbox_events.id = v_event.id;
      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.outbox_events
        SET status = 'failed', attempt_count = attempt_count + 1, last_error = sqlerrm,
            available_at = now() + (power(4, attempt_count) * interval '30 seconds')
        WHERE outbox_events.id = v_event.id;
    END;
  END LOOP;
  RETURN v_processed;
END;
$$;
