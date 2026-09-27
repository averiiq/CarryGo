-- Migration: 20260926120000_harden_delivery_escrow_security_and_flows.sql
-- Description: Deep security, logic, rate limiting, and state flow hardening.
-- 1. Eliminate universal delivery OTP bypass and prevent travellers from reading delivery codes.
-- 2. Secure release_payment_atomic and refund_payment_atomic against parameter spoofing and premature payout.
-- 3. Enforce mandatory pickup OTP with brute-force lockout.
-- 4. Disallow direct transition to 'completed' via transition_request_status and fix capacity deduction.
-- 5. Prevent soft-delete of user accounts with in-flight deliveries or locked escrow.
-- 6. Disallow trip cancellation when accepted requests are in-flight.

BEGIN;

SET search_path = public, extensions;

-- Ensure attempt tracking columns exist on deliveries
ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS pickup_attempt_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pickup_locked_until timestamptz,
  ADD COLUMN IF NOT EXISTS otp_attempt_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS otp_locked_until timestamptz;

-- =============================================================================
-- 1. SECURE complete_delivery_command
-- Removes all wildcard fallbacks (e.g. 6-digit wildcard and static test codes).
-- Enforces pickup confirmation, delivery code match, attempt lockout, and payment release.
-- =============================================================================
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

  -- Ensure parcel was actually picked up before it can be delivered!
  IF NOT coalesce(v_delivery.pickup_confirmed, false) THEN
    RAISE EXCEPTION 'Cannot complete delivery before parcel pickup is confirmed';
  END IF;

  -- If already delivered, return current record idempotently
  IF v_delivery.delivery_confirmed AND v_delivery.status = 'delivered' THEN
    UPDATE public.requests
    SET status = 'completed', updated_at = now()
    WHERE requests.id = v_request.id AND requests.status <> 'completed';

    RETURN QUERY
      SELECT d.id, d.request_id, d.pickup_confirmed, d.pickup_confirmed_at,
             d.delivery_confirmed, d.delivery_confirmed_at, d.status, d.created_at
      FROM public.deliveries d
      WHERE d.id = v_delivery.id;
    RETURN;
  END IF;

  -- Check brute-force lockout
  IF v_delivery.otp_locked_until IS NOT NULL AND v_delivery.otp_locked_until > now() THEN
    RAISE EXCEPTION 'Delivery code verification locked due to too many failed attempts. Please try again in % minutes.',
      ceil(extract(epoch from (v_delivery.otp_locked_until - now())) / 60);
  END IF;

  -- STRICT OTP VALIDATION: Must match stored code or bcrypt hash. NO wildcard fallbacks.
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

  -- Mark delivery completed and reset lockout
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

  -- Mark request completed
  UPDATE public.requests
  SET status = 'completed',
      updated_at = now()
  WHERE requests.id = v_request.id;

  -- Automatically release payment if escrow was locked
  UPDATE public.payments
  SET status = 'released',
      released_at = now()
  WHERE request_id = v_request.id AND status = 'locked';

  -- Mark parcel delivered (removes from active marketplace)
  IF v_request.parcel_id IS NOT NULL THEN
    UPDATE public.parcels
    SET status = 'delivered',
        updated_at = now()
    WHERE parcels.id = v_request.parcel_id;
  END IF;

  -- Mark trip completed
  IF v_request.trip_id IS NOT NULL THEN
    UPDATE public.trips
    SET status = 'completed',
        updated_at = now()
    WHERE trips.id = v_request.trip_id;
  END IF;

  -- Increment traveller delivery count safely
  BEGIN
    UPDATE public.user_profiles
    SET total_deliveries = coalesce(total_deliveries, 0) + 1,
        updated_at = now()
    WHERE user_profiles.id = v_request.traveller_id;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

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

  RETURN QUERY
    SELECT d.id, d.request_id, d.pickup_confirmed, d.pickup_confirmed_at,
           d.delivery_confirmed, d.delivery_confirmed_at, d.status, d.created_at
    FROM public.deliveries d
    WHERE d.id = v_delivery.id;
END;
$$;


-- =============================================================================
-- 2. SECURE get_or_create_delivery_otp and issue_delivery_otp
-- Strictly forbids the traveller from retrieving the delivery code.
-- ONLY the parcel sender (who communicates it to recipient) can view it.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_or_create_delivery_otp(p_delivery_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_delivery public.deliveries%rowtype;
  v_request public.requests%rowtype;
  v_code text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT * INTO v_delivery
  FROM public.deliveries
  WHERE deliveries.id = p_delivery_id OR deliveries.request_id = p_delivery_id
  LIMIT 1;

  IF NOT FOUND THEN RAISE EXCEPTION 'Delivery not found'; END IF;
  SELECT * INTO v_request FROM public.requests WHERE requests.id = v_delivery.request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;

  -- ONLY SENDER can view delivery code. Traveller must NEVER be able to see it.
  IF auth.uid() <> v_request.sender_id THEN
    RAISE EXCEPTION 'Only the parcel sender can view the delivery code';
  END IF;

  IF v_delivery.delivery_otp IS NOT NULL AND length(trim(v_delivery.delivery_otp)) = 6 THEN
    RETURN trim(v_delivery.delivery_otp);
  END IF;

  v_code := public.generate_delivery_code();
  UPDATE public.deliveries
  SET delivery_otp = v_code,
      otp_hash = extensions.crypt(v_code, extensions.gen_salt('bf')),
      updated_at = now()
  WHERE deliveries.id = v_delivery.id;

  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.issue_delivery_otp(p_delivery_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_delivery public.deliveries%rowtype;
  v_request public.requests%rowtype;
  v_code text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT * INTO v_delivery
  FROM public.deliveries
  WHERE deliveries.id = p_delivery_id OR deliveries.request_id = p_delivery_id
  LIMIT 1;

  IF NOT FOUND THEN RAISE EXCEPTION 'Delivery not found'; END IF;
  SELECT * INTO v_request FROM public.requests WHERE requests.id = v_delivery.request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;

  IF auth.uid() <> v_request.sender_id THEN
    RAISE EXCEPTION 'Only the parcel sender can issue or refresh the delivery code';
  END IF;

  v_code := public.generate_delivery_code();

  UPDATE public.deliveries
  SET delivery_otp = v_code,
      otp_hash = extensions.crypt(v_code, extensions.gen_salt('bf')),
      otp_attempt_count = 0,
      otp_locked_until = NULL,
      updated_at = now()
  WHERE deliveries.id = v_delivery.id;

  RETURN v_code;
END;
$$;


-- =============================================================================
-- 3. SECURE release_payment_atomic
-- Derives identity from auth.uid() (ignores spoofed p_actor_id).
-- Ensures payment can ONLY be released after delivery confirmation.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.release_payment_atomic(
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
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found' USING errcode = 'P0002';
  END IF;

  IF v_payment.status <> 'locked' THEN
    RAISE EXCEPTION 'Payment not found or already processed' USING errcode = 'P0002';
  END IF;

  -- Only assigned traveller can release funds
  IF v_payment.traveller_id <> v_actor_id THEN
    RAISE EXCEPTION 'unauthorized: only the assigned traveller can release' USING errcode = 'P0003';
  END IF;

  -- Ensure delivery is actually completed and verified!
  SELECT * INTO v_delivery
  FROM public.deliveries
  WHERE request_id = v_payment.request_id;

  IF NOT FOUND OR NOT v_delivery.delivery_confirmed OR v_delivery.status <> 'delivered' THEN
    RAISE EXCEPTION 'Payment cannot be released until delivery confirmation is verified' USING errcode = 'P0001';
  END IF;

  UPDATE public.payments
  SET status = 'released',
      released_at = now()
  WHERE id = p_payment_id
    AND status = 'locked';

  PERFORM public.emit_domain_event(
    v_actor_id,
    'payment',
    p_payment_id,
    'payment_released',
    'payment.released',
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


-- =============================================================================
-- 4. SECURE refund_payment_atomic
-- Derives identity from auth.uid().
-- Prevents sender from unilaterally refunding once parcel is picked up.
-- =============================================================================
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
  WHERE id = p_payment_id
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

  -- If parcel is already picked up, sender cannot unilaterally claw back funds!
  SELECT * INTO v_delivery
  FROM public.deliveries
  WHERE request_id = v_payment.request_id;

  IF FOUND AND v_delivery.pickup_confirmed AND v_actor_id = v_payment.sender_id THEN
    RAISE EXCEPTION 'Parcel is already in transit. Cannot refund unilaterally. Please open a dispute with support.' USING errcode = 'P0001';
  END IF;

  UPDATE public.payments
  SET status = 'refunded',
      refunded_at = now()
  WHERE id = p_payment_id
    AND status = 'locked';

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


-- =============================================================================
-- 5. SECURE confirm_delivery_pickup_with_otp
-- Enforces mandatory pickup OTP generation and brute-force lockout.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.confirm_delivery_pickup_with_otp(p_delivery_id uuid, p_otp text)
RETURNS TABLE (
  id uuid,
  request_id uuid,
  pickup_confirmed boolean,
  pickup_confirmed_at timestamptz,
  delivery_confirmed boolean,
  delivery_confirmed_at timestamptz,
  status public.delivery_status,
  trip_status text,
  trip_note text,
  eta_text text,
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
    RAISE EXCEPTION 'Only the assigned traveller can confirm pickup';
  END IF;

  IF v_delivery.pickup_confirmed THEN
    RAISE EXCEPTION 'Parcel pickup has already been confirmed';
  END IF;

  -- Check brute-force lockout
  IF v_delivery.pickup_locked_until IS NOT NULL AND v_delivery.pickup_locked_until > now() THEN
    RAISE EXCEPTION 'Pickup code verification locked due to too many failed attempts. Please try again in % minutes.',
      ceil(extract(epoch from (v_delivery.pickup_locked_until - now())) / 60);
  END IF;

  -- Ensure pickup OTP has been generated by sender
  IF v_delivery.pickup_otp IS NULL OR v_delivery.pickup_otp = '' THEN
    RAISE EXCEPTION 'Sender has not generated a pickup code yet. Ask sender to open the delivery page in the CarryGo app.';
  END IF;

  IF v_clean_otp <> trim(v_delivery.pickup_otp) THEN
    UPDATE public.deliveries
    SET pickup_attempt_count = coalesce(pickup_attempt_count, 0) + 1,
        pickup_locked_until = CASE WHEN coalesce(pickup_attempt_count, 0) + 1 >= 5 THEN now() + interval '15 minutes' ELSE NULL END,
        updated_at = now()
    WHERE deliveries.id = v_delivery.id;

    RAISE EXCEPTION 'Invalid pickup code. Ask sender for the 4-digit pickup code displayed on their app.';
  END IF;

  UPDATE public.deliveries
  SET pickup_confirmed = true,
      pickup_confirmed_at = now(),
      status = 'in_transit',
      trip_status = coalesce(v_delivery.trip_status, 'Picked Up - On Journey'),
      pickup_attempt_count = 0,
      pickup_locked_until = NULL,
      updated_at = now()
  WHERE deliveries.id = v_delivery.id
  RETURNING * INTO v_delivery;

  PERFORM public.emit_domain_event(
    v_actor_id,
    'delivery',
    v_delivery.id,
    'delivery_picked_up',
    'delivery.picked_up',
    jsonb_build_object(
      'delivery_id', v_delivery.id,
      'request_id', v_request.id,
      'sender_id', v_request.sender_id,
      'traveller_id', v_request.traveller_id
    )
  );

  RETURN QUERY
    SELECT d.id, d.request_id, d.pickup_confirmed, d.pickup_confirmed_at,
           d.delivery_confirmed, d.delivery_confirmed_at, d.status,
           d.trip_status, d.trip_note, d.eta_text, d.created_at
    FROM public.deliveries d WHERE d.id = v_delivery.id;
END;
$$;


-- =============================================================================
-- 6. SECURE transition_request_status
-- Blocks direct client transition to 'completed'.
-- Fixes vehicle capacity deduction: Deducts on acceptance, restores on fail.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.transition_request_status(
  p_request_id uuid,
  p_next_status public.request_status
)
RETURNS TABLE (
  id uuid,
  parcel_id uuid,
  trip_id uuid,
  sender_id uuid,
  sender_name text,
  traveller_id uuid,
  traveller_name text,
  status public.request_status,
  price numeric,
  message text,
  created_at timestamptz,
  updated_at timestamptz,
  created_by uuid,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
#variable_conflict use_column
DECLARE
  v_actor_id uuid := auth.uid();
  v_request public.requests%rowtype;
  v_updated public.requests%rowtype;
  v_creator_id uuid;
  v_intended_recipient uuid;
  v_parcel public.parcels%rowtype;
  v_trip public.trips%rowtype;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_request
  FROM public.requests r
  WHERE r.id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF v_actor_id <> v_request.sender_id AND v_actor_id <> v_request.traveller_id THEN
    RAISE EXCEPTION 'You are not authorized to update this request';
  END IF;

  v_creator_id := coalesce(v_request.created_by, v_request.sender_id);
  v_intended_recipient := CASE
    WHEN v_creator_id = v_request.sender_id THEN v_request.traveller_id
    ELSE v_request.sender_id
  END;

  IF p_next_status = 'accepted' THEN
    IF v_request.status <> 'pending' THEN
      RAISE EXCEPTION 'Only pending requests can be accepted. Current status is %', v_request.status;
    END IF;
    IF v_request.expires_at IS NOT NULL AND v_request.expires_at < now() THEN
      RAISE EXCEPTION 'Request has expired and cannot be accepted';
    END IF;
    IF v_actor_id = v_creator_id THEN
      RAISE EXCEPTION 'You cannot accept your own request. Only the recipient can accept';
    END IF;
    IF v_actor_id <> v_intended_recipient THEN
      RAISE EXCEPTION 'Only the intended recipient can accept this request';
    END IF;

    SELECT * INTO v_parcel FROM public.parcels p WHERE p.id = v_request.parcel_id FOR UPDATE;
    SELECT * INTO v_trip FROM public.trips t WHERE t.id = v_request.trip_id FOR UPDATE;

    IF v_parcel.status NOT IN ('open', 'matched') THEN RAISE EXCEPTION 'Parcel is no longer available'; END IF;
    IF v_trip.status <> 'active' THEN RAISE EXCEPTION 'Trip is no longer active'; END IF;

    -- Validate and deduct capacity at request acceptance
    IF v_trip.available_capacity < v_parcel.weight THEN
      RAISE EXCEPTION 'Trip does not have enough remaining capacity (% kg needed, % kg remaining)',
        v_parcel.weight, v_trip.available_capacity;
    END IF;

    UPDATE public.trips
    SET available_capacity = available_capacity - v_parcel.weight,
        updated_at = now()
    WHERE id = v_trip.id;

    UPDATE public.requests r2
    SET status = 'accepted', updated_at = now()
    WHERE r2.id = v_request.id
    RETURNING * INTO v_updated;

    UPDATE public.requests r3
    SET status = 'rejected', updated_at = now()
    WHERE r3.parcel_id = v_request.parcel_id AND r3.id <> v_request.id AND r3.status = 'pending';

    UPDATE public.parcels SET status = 'matched', updated_at = now() WHERE id = v_request.parcel_id;

    INSERT INTO public.deliveries (request_id, otp_hash)
    VALUES (v_request.id, public.generate_delivery_otp_hash())
    ON CONFLICT (request_id) DO NOTHING;

    PERFORM public.emit_domain_event(
      v_actor_id,
      'request',
      v_updated.id,
      'request_accepted',
      'request.accepted',
      jsonb_build_object('request_id', v_updated.id, 'parcel_id', v_updated.parcel_id, 'trip_id', v_updated.trip_id)
    );

  ELSIF p_next_status = 'rejected' THEN
    IF v_request.status <> 'pending' THEN RAISE EXCEPTION 'Only pending requests can be rejected'; END IF;
    IF v_actor_id = v_creator_id THEN RAISE EXCEPTION 'You cannot reject your own request. Use cancel instead'; END IF;
    IF v_actor_id <> v_intended_recipient THEN RAISE EXCEPTION 'Only the intended recipient can reject this request'; END IF;

    UPDATE public.requests r2 SET status = 'rejected', updated_at = now() WHERE r2.id = v_request.id RETURNING * INTO v_updated;
    PERFORM public.emit_domain_event(v_actor_id, 'request', v_updated.id, 'request_rejected', 'request.rejected', jsonb_build_object('request_id', v_updated.id));

  ELSIF p_next_status = 'cancelled' THEN
    IF v_request.status <> 'pending' THEN RAISE EXCEPTION 'Only pending requests can be cancelled'; END IF;
    IF v_actor_id <> v_creator_id THEN RAISE EXCEPTION 'Only the user who sent this request can cancel it'; END IF;

    UPDATE public.requests r2 SET status = 'cancelled', updated_at = now() WHERE r2.id = v_request.id RETURNING * INTO v_updated;
    PERFORM public.emit_domain_event(v_actor_id, 'request', v_updated.id, 'request_cancelled', 'request.cancelled', jsonb_build_object('request_id', v_updated.id));

  ELSIF p_next_status = 'completed' THEN
    -- BLOCKED: Requests must only be completed via complete_delivery_command with valid OTP verification
    RAISE EXCEPTION 'Requests cannot be completed directly. Delivery completion requires verification code confirmation via complete_delivery_command.';

  ELSIF p_next_status = 'failed' THEN
    IF v_request.status <> 'accepted' THEN RAISE EXCEPTION 'Only accepted requests can fail'; END IF;
    IF v_actor_id <> v_request.sender_id AND v_actor_id <> v_request.traveller_id THEN
      RAISE EXCEPTION 'Only sender or traveller can mark this request as failed';
    END IF;

    UPDATE public.requests r2 SET status = 'failed', updated_at = now() WHERE r2.id = v_request.id RETURNING * INTO v_updated;
    UPDATE public.parcels SET status = 'open' WHERE id = v_updated.parcel_id;

    -- Restore trip capacity
    UPDATE public.trips
    SET available_capacity = available_capacity + coalesce((SELECT weight FROM public.parcels WHERE id = v_updated.parcel_id), 0),
        updated_at = now()
    WHERE id = v_updated.trip_id;

    PERFORM public.emit_domain_event(v_actor_id, 'request', v_updated.id, 'request_failed', 'request.failed', jsonb_build_object('request_id', v_updated.id));

  ELSE
    RAISE EXCEPTION 'Unsupported request transition to %', p_next_status;
  END IF;

  RETURN QUERY
    SELECT v_updated.id, v_updated.parcel_id, v_updated.trip_id, v_updated.sender_id, v_updated.sender_name,
           v_updated.traveller_id, v_updated.traveller_name, v_updated.status, v_updated.price, v_updated.message,
           v_updated.created_at, v_updated.updated_at, v_updated.created_by, v_updated.expires_at;
END;
$$;


-- =============================================================================
-- 7. SECURE soft_delete_user_account
-- Blocks account soft-deletion if user has in-flight deliveries or locked escrow.
-- =============================================================================
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

  -- Block deletion if user is a participant in active package deliveries
  SELECT count(*) INTO v_active_deliveries
  FROM public.deliveries d
  JOIN public.requests r ON r.id = d.request_id
  WHERE (r.sender_id = v_user_id OR r.traveller_id = v_user_id)
    AND d.status IN ('created', 'in_transit');

  IF v_active_deliveries > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot delete account while you have active package deliveries in transit');
  END IF;

  -- Block deletion if locked escrow payment exists
  SELECT count(*) INTO v_active_escrow
  FROM public.payments
  WHERE (sender_id = v_user_id OR traveller_id = v_user_id)
    AND status = 'locked';

  IF v_active_escrow > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot delete account while you have active escrow payments pending release');
  END IF;

  -- Mark profile soft-deleted
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

  DELETE FROM public.kyc_documents WHERE session_id IN (SELECT id FROM public.kyc_sessions WHERE user_id = v_user_id);
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


-- =============================================================================
-- 8. SECURE set_trip_status
-- Prevents cancellation of active trips that have accepted delivery requests.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.set_trip_status(p_trip_id uuid, p_status public.trip_status)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_trip public.trips%rowtype;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT * INTO v_trip FROM public.trips WHERE id = p_trip_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Trip not found'; END IF;
  IF v_trip.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Only the owner can update this trip'; END IF;
  IF v_trip.status <> 'active' OR p_status NOT IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid trip status transition';
  END IF;

  -- Block cancellation if there are active accepted requests or in-transit deliveries
  IF p_status = 'cancelled' THEN
    IF EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.trip_id = p_trip_id AND r.status = 'accepted'
    ) THEN
      RAISE EXCEPTION 'Cannot cancel trip while active accepted delivery requests are assigned to it';
    END IF;
  END IF;

  UPDATE public.trips SET status = p_status, updated_at = now() WHERE id = p_trip_id;

  IF p_status = 'cancelled' THEN
    PERFORM public.emit_domain_event(
      auth.uid(),
      'trip',
      p_trip_id,
      'trip_cancelled',
      'trip.cancelled',
      jsonb_build_object(
        'trip_id', p_trip_id,
        'from_city', v_trip.from_city,
        'to_city', v_trip.to_city,
        'date', v_trip.date
      )
    );
  END IF;
END;
$$;

COMMIT;
