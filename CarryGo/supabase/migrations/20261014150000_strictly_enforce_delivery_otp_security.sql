-- Migration: Strictly enforce delivery OTP security & eliminate all fake OTP backdoors
-- Migration: 20261014150000_strictly_enforce_delivery_otp_security.sql

BEGIN;

-- =============================================================================
-- 1. SECURE complete_delivery_command
-- Eliminates ALL wildcards, regex matches, and static test codes.
-- Validates OTP strictly against stored delivery_otp or bcrypt hash.
-- Enforces 5 failed attempts lockout (15 minutes).
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

  -- Ensure parcel was actually picked up before it can be delivered
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

  -- STRICT OTP VALIDATION: Must match stored code or bcrypt hash.
  -- STRICTLY NO wildcard regex, test codes (712871, 933536), or bypasses.
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
-- 2. SECURE confirm_delivery_pickup_with_otp
-- Strictly enforces 4-digit pickup OTP match and 5-attempt brute-force lockout.
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
  IF v_delivery.pickup_otp IS NULL OR trim(v_delivery.pickup_otp) = '' THEN
    RAISE EXCEPTION 'Sender has not generated a pickup code yet. Ask sender for the 4-digit pickup code displayed on their app.';
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
    'pickup_confirmed',
    'delivery.pickup_confirmed',
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
    FROM public.deliveries d
    WHERE d.id = v_delivery.id;
END;
$$;


-- =============================================================================
-- 3. DISABLE LEGACY OTP-LESS confirm_delivery_pickup
-- Prevents bypass of 4-digit pickup code via legacy 1-arg function.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.confirm_delivery_pickup(p_delivery_id uuid)
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
BEGIN
  RAISE EXCEPTION 'Direct pickup confirmation without verification code is disabled. Use confirm_delivery_pickup_with_otp(p_delivery_id, p_otp).';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.confirm_delivery_pickup(uuid) FROM public, authenticated, anon;


-- =============================================================================
-- 4. UPDATE update_delivery_trip_progress
-- Support lookup by deliveries.id OR deliveries.request_id for consistency.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_delivery_trip_progress(
  p_delivery_id uuid,
  p_trip_status text,
  p_trip_note text DEFAULT NULL,
  p_eta_text text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  request_id uuid,
  status public.delivery_status,
  trip_status text,
  trip_note text,
  eta_text text,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_delivery public.deliveries%rowtype;
  v_request public.requests%rowtype;
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
    RAISE EXCEPTION 'Only the assigned traveller can update trip progress';
  END IF;

  UPDATE public.deliveries
  SET trip_status = nullif(trim(p_trip_status), ''),
      trip_note = nullif(trim(p_trip_note), ''),
      eta_text = nullif(trim(p_eta_text), ''),
      updated_at = now()
  WHERE deliveries.id = v_delivery.id
  RETURNING * INTO v_delivery;

  RETURN QUERY
    SELECT v_delivery.id, v_delivery.request_id, v_delivery.status,
           v_delivery.trip_status, v_delivery.trip_note, v_delivery.eta_text, v_delivery.updated_at;
END;
$$;


-- =============================================================================
-- 5. GRANTS
-- =============================================================================
GRANT EXECUTE ON FUNCTION public.complete_delivery_command(uuid, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.confirm_delivery_pickup_with_otp(uuid, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.update_delivery_trip_progress(uuid, text, text, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_delivery_otp(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.issue_delivery_otp(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_pickup_otp(uuid) TO authenticated, anon;

COMMIT;
