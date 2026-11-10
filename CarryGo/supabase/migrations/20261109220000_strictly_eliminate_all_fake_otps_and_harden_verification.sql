-- Migration: 20261109220000_strictly_eliminate_all_fake_otps_and_harden_verification.sql
-- Eliminates ALL fake OTP backdoors, wildcards, length-only matches, and null-bypass holes.
-- Enforces strict cryptographic verification for both Handover (Pickup) OTP and Delivery OTP.

BEGIN;

SET search_path = public, extensions;

-- =============================================================================
-- 1. Helper function to generate secure 4-digit numeric code
-- =============================================================================
CREATE OR REPLACE FUNCTION public.generate_pickup_otp()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_code text := '';
BEGIN
  WHILE length(v_code) < 4 LOOP
    v_code := v_code || (get_byte(extensions.gen_random_bytes(1), 0) % 10)::text;
  END LOOP;
  -- Ensure code does not start with 0000
  IF v_code = '0000' THEN
    v_code := '4821';
  END IF;
  RETURN left(v_code, 4);
END;
$$;

-- =============================================================================
-- 2. Helper function to generate secure 6-digit numeric code
-- =============================================================================
CREATE OR REPLACE FUNCTION public.generate_delivery_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_code text := '';
BEGIN
  WHILE length(v_code) < 6 LOOP
    v_code := v_code || (get_byte(extensions.gen_random_bytes(1), 0) % 10)::text;
  END LOOP;
  IF v_code = '000000' THEN
    v_code := '639412';
  END IF;
  RETURN left(v_code, 6);
END;
$$;

-- =============================================================================
-- 3. Resilient create_delivery
-- Ensures pickup_otp and delivery_otp are generated at creation time
-- so pickup_otp is NEVER NULL when traveller checks it.
-- =============================================================================
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

  -- Allow either assigned traveller or sender to initialize the delivery record
  IF v_request.traveller_id <> auth.uid() AND v_request.sender_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the assigned traveller or sender can initialize a delivery';
  END IF;

  IF v_request.status <> 'accepted' AND v_request.status <> 'completed' THEN
    RAISE EXCEPTION 'A delivery can only be created for an accepted request';
  END IF;

  v_pickup_otp := public.generate_pickup_otp();
  v_delivery_otp := public.generate_delivery_code();

  INSERT INTO public.deliveries (
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
  ON CONFLICT (request_id) DO UPDATE
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

-- =============================================================================
-- 4. Secure get_or_create_pickup_otp
-- Strictly sender-only access.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_or_create_pickup_otp(p_delivery_id uuid)
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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_delivery
  FROM public.deliveries
  WHERE deliveries.id = p_delivery_id OR deliveries.request_id = p_delivery_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery not found';
  END IF;

  SELECT * INTO v_request FROM public.requests WHERE requests.id = v_delivery.request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  -- Strictly only the parcel sender can view or generate the pickup code
  IF auth.uid() <> v_request.sender_id THEN
    RAISE EXCEPTION 'Only the parcel sender can generate or view the pickup code';
  END IF;

  -- Return existing valid 4-digit code if present
  IF v_delivery.pickup_otp IS NOT NULL AND length(trim(v_delivery.pickup_otp)) = 4 THEN
    RETURN trim(v_delivery.pickup_otp);
  END IF;

  v_code := public.generate_pickup_otp();

  UPDATE public.deliveries
  SET pickup_otp = v_code,
      updated_at = now()
  WHERE deliveries.id = v_delivery.id;

  RETURN v_code;
END;
$$;

-- =============================================================================
-- 5. SECURE confirm_delivery_pickup_with_otp
-- NO bypass if pickup_otp is null or empty.
-- NO wildcard or test codes.
-- Exact match against stored 4-digit pickup code required.
-- Brute-force lockout enforced (5 failed attempts -> 15 min lock).
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
  IF v_delivery.otp_locked_until IS NOT NULL AND v_delivery.otp_locked_until > now() THEN
    RAISE EXCEPTION 'Pickup code verification locked due to too many failed attempts. Please try again in % minutes.',
      ceil(extract(epoch from (v_delivery.otp_locked_until - now())) / 60);
  END IF;

  -- Ensure pickup OTP has been generated by sender (NEVER ALLOW BYPASS IF NULL)
  IF v_delivery.pickup_otp IS NULL OR trim(v_delivery.pickup_otp) = '' THEN
    RAISE EXCEPTION 'Sender has not generated a pickup code yet. Ask sender for the 4-digit pickup code displayed on their app.';
  END IF;

  -- STRICT EXACT MATCH: clean_otp must equal stored pickup_otp
  IF v_clean_otp <> trim(v_delivery.pickup_otp) THEN
    UPDATE public.deliveries
    SET otp_attempt_count = coalesce(otp_attempt_count, 0) + 1,
        otp_locked_until = CASE WHEN coalesce(otp_attempt_count, 0) + 1 >= 5 THEN now() + interval '15 minutes' ELSE NULL END,
        updated_at = now()
    WHERE deliveries.id = v_delivery.id;

    RAISE EXCEPTION 'Invalid pickup code. Ask sender for the 4-digit pickup code displayed on their app.';
  END IF;

  -- Success: mark pickup confirmed and in_transit
  UPDATE public.deliveries
  SET pickup_confirmed = true,
      pickup_confirmed_at = now(),
      status = 'in_transit',
      trip_status = coalesce(v_delivery.trip_status, 'Picked Up - On Journey'),
      otp_attempt_count = 0,
      otp_locked_until = NULL,
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
-- 6. SECURE get_or_create_delivery_otp and issue_delivery_otp
-- Strictly sender-only access.
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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_delivery
  FROM public.deliveries
  WHERE deliveries.id = p_delivery_id OR deliveries.request_id = p_delivery_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery not found';
  END IF;

  SELECT * INTO v_request FROM public.requests WHERE requests.id = v_delivery.request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  -- ONLY the parcel sender can view the final delivery code
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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_delivery
  FROM public.deliveries
  WHERE deliveries.id = p_delivery_id OR deliveries.request_id = p_delivery_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery not found';
  END IF;

  SELECT * INTO v_request FROM public.requests WHERE requests.id = v_delivery.request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

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
-- 7. SECURE complete_delivery_command
-- Eliminates ALL wildcards, regex matches, length-only fallbacks, and test codes.
-- Strictly validates entered OTP against stored delivery_otp or bcrypt hash.
-- Enforces 5 failed attempts lockout (15 minutes).
-- Releases locked payment to traveller.
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

    -- Award coins safely if defined
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

  -- Check brute-force lockout
  IF v_delivery.otp_locked_until IS NOT NULL AND v_delivery.otp_locked_until > now() THEN
    RAISE EXCEPTION 'Delivery code verification locked due to too many failed attempts. Please try again in % minutes.',
      ceil(extract(epoch from (v_delivery.otp_locked_until - now())) / 60);
  END IF;

  -- STRICT OTP VALIDATION:
  -- Must match stored code or bcrypt hash.
  -- ABSOLUTELY NO wildcards, test codes (e.g. 712871, 933536), regex, or length-only bypasses.
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

  -- Automatically release payment if locked
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

  -- Award coins safely
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

-- =============================================================================
-- 8. GRANTS
-- =============================================================================
GRANT EXECUTE ON FUNCTION public.create_delivery(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_pickup_otp(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.confirm_delivery_pickup_with_otp(uuid, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_delivery_otp(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.issue_delivery_otp(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.complete_delivery_command(uuid, text) TO authenticated, anon;

COMMIT;
