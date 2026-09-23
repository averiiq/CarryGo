-- Migration: Harden Request Ownership, Enforce State Machine, Revoke Insecure Direct Client Updates,
-- and Implement Server-Side Matching Engine with City Normalization.

-- 1. Schema Extensions for public.requests
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE;
UPDATE public.requests SET created_by = sender_id WHERE created_by IS NULL;
ALTER TABLE public.requests ALTER COLUMN created_by SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_requests_created_by ON public.requests (created_by);

ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT (now() + interval '7 days');
UPDATE public.requests SET expires_at = (created_at + interval '7 days') WHERE expires_at IS NULL;

-- 2. Permanent Security Audit Log Table
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  actor_id uuid,
  intended_recipient_id uuid,
  reason text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "security_audit_logs_insert" ON public.security_audit_logs
  FOR INSERT TO authenticated WITH CHECK (true);

-- 3. Revoke Insecure Direct Table Updates on public.requests
DROP POLICY IF EXISTS "requests_update_participant" ON public.requests;
DROP POLICY IF EXISTS "requests_update_own" ON public.requests;
DROP POLICY IF EXISTS "requests_update_sender_or_traveller" ON public.requests;
REVOKE UPDATE ON public.requests FROM authenticated, anon;

-- Ensure read access remains scoped to participants
DROP POLICY IF EXISTS "requests_select_participant" ON public.requests;
CREATE POLICY "requests_select_participant" ON public.requests
  FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR traveller_id = auth.uid() OR created_by = auth.uid());

-- 4. City Normalization and Alias Equivalence Functions
CREATE OR REPLACE FUNCTION public.normalize_city(p_city text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(regexp_replace(lower(coalesce(p_city, '')), '(,| ncr| city| district).*', '', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.are_cities_compatible(p_city1 text, p_city2 text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (
    public.normalize_city(p_city1) = public.normalize_city(p_city2)
    OR (
      public.normalize_city(p_city1) IN ('delhi', 'new delhi')
      AND public.normalize_city(p_city2) IN ('delhi', 'new delhi')
    )
    OR (
      public.normalize_city(p_city1) IN ('gurugram', 'gurgaon')
      AND public.normalize_city(p_city2) IN ('gurugram', 'gurgaon')
    )
    OR (
      public.normalize_city(p_city1) IN ('bengaluru', 'bangalore')
      AND public.normalize_city(p_city2) IN ('bengaluru', 'bangalore')
    )
    OR (
      public.normalize_city(p_city1) IN ('mumbai', 'bombay')
      AND public.normalize_city(p_city2) IN ('mumbai', 'bombay')
    )
  );
$$;

-- 5. Recreate create_request_command with Creator Tracking & Self-Matching Prevention
DROP FUNCTION IF EXISTS public.create_request_command(uuid, uuid, numeric, text);
CREATE OR REPLACE FUNCTION public.create_request_command(
  p_parcel_id uuid,
  p_trip_id uuid,
  p_price numeric,
  p_message text DEFAULT null
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
DECLARE
  v_actor_id uuid := auth.uid();
  v_parcel public.parcels%rowtype;
  v_trip public.trips%rowtype;
  v_request public.requests%rowtype;
  v_existing_id uuid;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_price IS NULL OR p_price < 0 THEN
    RAISE EXCEPTION 'Price must be zero or greater';
  END IF;

  SELECT * INTO v_parcel FROM public.parcels WHERE parcels.id = p_parcel_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parcel not found';
  END IF;

  SELECT * INTO v_trip FROM public.trips WHERE trips.id = p_trip_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found';
  END IF;

  -- PREVENT SELF-REQUESTING: Same user cannot match their own parcel and trip
  IF v_parcel.user_id = v_trip.user_id THEN
    RAISE EXCEPTION 'You cannot create a request against your own listing';
  END IF;

  -- Authenticated user must be either the parcel owner or trip owner
  IF v_actor_id <> v_parcel.user_id AND v_actor_id <> v_trip.user_id THEN
    RAISE EXCEPTION 'Only the parcel owner or trip owner can create a request';
  END IF;

  -- Duplicate active request guard
  SELECT r.id INTO v_existing_id
  FROM public.requests r
  WHERE r.parcel_id = p_parcel_id
    AND r.trip_id = p_trip_id
    AND r.status IN ('pending', 'accepted')
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'A carry request for this parcel and trip already exists';
  END IF;

  IF v_parcel.status <> 'open' THEN
    RAISE EXCEPTION 'Parcel is no longer available for requests';
  END IF;

  IF v_trip.status <> 'active' THEN
    RAISE EXCEPTION 'Trip is no longer active';
  END IF;

  -- Route compatibility validation using semantic normalization
  IF NOT public.are_cities_compatible(v_parcel.from_city, v_trip.from_city)
     OR NOT public.are_cities_compatible(v_parcel.to_city, v_trip.to_city) THEN
    RAISE EXCEPTION 'Parcel and trip routes do not match: parcel goes % to %, trip goes % to %',
      v_parcel.from_city, v_parcel.to_city, v_trip.from_city, v_trip.to_city;
  END IF;

  IF v_parcel.weight > v_trip.available_capacity THEN
    RAISE EXCEPTION 'Trip does not have enough remaining capacity';
  END IF;

  INSERT INTO public.requests (
    parcel_id,
    trip_id,
    sender_id,
    sender_name,
    traveller_id,
    traveller_name,
    created_by,
    status,
    price,
    message,
    expires_at
  )
  VALUES (
    v_parcel.id,
    v_trip.id,
    v_parcel.user_id,
    v_parcel.user_name,
    v_trip.user_id,
    v_trip.user_name,
    v_actor_id,
    'pending',
    p_price,
    nullif(trim(coalesce(p_message, '')), ''),
    now() + interval '7 days'
  )
  RETURNING * INTO v_request;

  PERFORM public.emit_domain_event(
    v_actor_id,
    'request',
    v_request.id,
    'request_created',
    'request.created',
    jsonb_build_object(
      'request_id', v_request.id,
      'parcel_id', v_request.parcel_id,
      'trip_id', v_request.trip_id,
      'sender_id', v_request.sender_id,
      'traveller_id', v_request.traveller_id,
      'created_by', v_actor_id,
      'price', v_request.price
    )
  );

  RETURN QUERY
    SELECT
      v_request.id,
      v_request.parcel_id,
      v_request.trip_id,
      v_request.sender_id,
      v_request.sender_name,
      v_request.traveller_id,
      v_request.traveller_name,
      v_request.status,
      v_request.price,
      v_request.message,
      v_request.created_at,
      v_request.updated_at,
      v_request.created_by,
      v_request.expires_at;
END;
$$;

-- 6. Recreate transition_request_status with Strict Recipient Checking & Row Lock
DROP FUNCTION IF EXISTS public.transition_request_status(uuid, public.request_status);
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
DECLARE
  v_actor_id uuid := auth.uid();
  v_request public.requests%rowtype;
  v_updated public.requests%rowtype;
  v_intended_recipient uuid;
  v_parcel public.parcels%rowtype;
  v_trip public.trips%rowtype;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Row-level lock to prevent concurrent races
  SELECT *
    INTO v_request
    FROM public.requests r
   WHERE r.id = p_request_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  -- Verify actor is involved in this request
  IF v_actor_id <> v_request.sender_id AND v_actor_id <> v_request.traveller_id THEN
    INSERT INTO public.security_audit_logs (event_type, resource_type, resource_id, actor_id, intended_recipient_id, reason, metadata)
    VALUES ('REQUEST_UNAUTHORIZED_ACCESS', 'request', v_request.id, v_actor_id, v_request.traveller_id, 'Actor is neither sender nor traveller', jsonb_build_object('next_status', p_next_status));
    RAISE EXCEPTION 'You are not authorized to update this request';
  END IF;

  -- Intended recipient is the counterparty to whoever created the request
  v_intended_recipient := CASE
    WHEN v_request.created_by = v_request.sender_id THEN v_request.traveller_id
    ELSE v_request.sender_id
  END;

  IF p_next_status = 'accepted' THEN
    IF v_request.status <> 'pending' THEN
      RAISE EXCEPTION 'Only pending requests can be accepted. Current status is %', v_request.status;
    END IF;

    IF v_request.expires_at IS NOT NULL AND v_request.expires_at < now() THEN
      RAISE EXCEPTION 'Request has expired and cannot be accepted';
    END IF;

    -- CRITICAL: Requester CANNOT accept their own request
    IF v_actor_id = v_request.created_by THEN
      INSERT INTO public.security_audit_logs (event_type, resource_type, resource_id, actor_id, intended_recipient_id, reason, metadata)
      VALUES ('REQUEST_ACCEPT_DENIED', 'request', v_request.id, v_actor_id, v_intended_recipient, 'Requester attempted to accept own outgoing request', jsonb_build_object('created_by', v_request.created_by));
      RAISE EXCEPTION 'You cannot accept your own request. Only the intended recipient can accept';
    END IF;

    -- CRITICAL: Only intended recipient can accept
    IF v_actor_id <> v_intended_recipient THEN
      INSERT INTO public.security_audit_logs (event_type, resource_type, resource_id, actor_id, intended_recipient_id, reason, metadata)
      VALUES ('REQUEST_ACCEPT_DENIED', 'request', v_request.id, v_actor_id, v_intended_recipient, 'Unauthorized user attempted to accept request', jsonb_build_object('intended_recipient', v_intended_recipient));
      RAISE EXCEPTION 'Only the intended recipient can accept this request';
    END IF;

    SELECT * INTO v_parcel FROM public.parcels WHERE parcels.id = v_request.parcel_id FOR UPDATE;
    SELECT * INTO v_trip FROM public.trips WHERE trips.id = v_request.trip_id FOR UPDATE;

    IF v_parcel.status NOT IN ('open', 'matched') THEN
      RAISE EXCEPTION 'Parcel is no longer available';
    END IF;
    IF v_trip.status <> 'active' THEN
      RAISE EXCEPTION 'Trip is no longer active';
    END IF;

    IF EXISTS (
      SELECT 1
        FROM public.requests sibling
       WHERE sibling.parcel_id = v_request.parcel_id
         AND sibling.id <> v_request.id
         AND sibling.status = 'accepted'
    ) THEN
      RAISE EXCEPTION 'Another traveller has already been accepted for this parcel';
    END IF;

    UPDATE public.requests r2
       SET status = 'accepted',
           updated_at = now()
     WHERE r2.id = v_request.id
     RETURNING * INTO v_updated;

    UPDATE public.requests r3
       SET status = 'rejected',
           updated_at = now()
     WHERE r3.parcel_id = v_request.parcel_id
       AND r3.id <> v_request.id
       AND r3.status = 'pending';

    UPDATE public.parcels
       SET status = 'matched',
           updated_at = now()
     WHERE id = v_request.parcel_id;

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
    IF v_request.status <> 'pending' THEN
      RAISE EXCEPTION 'Only pending requests can be rejected';
    END IF;

    IF v_actor_id = v_request.created_by THEN
      RAISE EXCEPTION 'You cannot reject your own request. Use cancel instead';
    END IF;

    IF v_actor_id <> v_intended_recipient THEN
      INSERT INTO public.security_audit_logs (event_type, resource_type, resource_id, actor_id, intended_recipient_id, reason)
      VALUES ('REQUEST_REJECT_DENIED', 'request', v_request.id, v_actor_id, v_intended_recipient, 'Unauthorized user attempted to reject request');
      RAISE EXCEPTION 'Only the intended recipient can reject this request';
    END IF;

    UPDATE public.requests r2
       SET status = 'rejected',
           updated_at = now()
     WHERE r2.id = v_request.id
     RETURNING * INTO v_updated;

    PERFORM public.emit_domain_event(
      v_actor_id,
      'request',
      v_updated.id,
      'request_rejected',
      'request.rejected',
      jsonb_build_object('request_id', v_updated.id, 'parcel_id', v_updated.parcel_id, 'trip_id', v_updated.trip_id)
    );

  ELSIF p_next_status = 'cancelled' THEN
    IF v_request.status <> 'pending' THEN
      RAISE EXCEPTION 'Only pending requests can be cancelled';
    END IF;

    IF v_actor_id <> v_request.created_by THEN
      INSERT INTO public.security_audit_logs (event_type, resource_type, resource_id, actor_id, intended_recipient_id, reason)
      VALUES ('REQUEST_CANCEL_DENIED', 'request', v_request.id, v_actor_id, v_request.created_by, 'Non-creator attempted to cancel request');
      RAISE EXCEPTION 'Only the user who sent this request can cancel it';
    END IF;

    UPDATE public.requests r2
       SET status = 'cancelled',
           updated_at = now()
     WHERE r2.id = v_request.id
     RETURNING * INTO v_updated;

    PERFORM public.emit_domain_event(
      v_actor_id,
      'request',
      v_updated.id,
      'request_cancelled',
      'request.cancelled',
      jsonb_build_object('request_id', v_updated.id, 'parcel_id', v_updated.parcel_id, 'trip_id', v_updated.trip_id)
    );

  ELSIF p_next_status = 'completed' THEN
    IF v_request.status <> 'accepted' THEN
      RAISE EXCEPTION 'Only accepted requests can be completed';
    END IF;
    IF v_actor_id <> v_request.traveller_id THEN
      RAISE EXCEPTION 'Only the assigned traveller can complete this request';
    END IF;

    UPDATE public.requests r2
       SET status = 'completed',
           updated_at = now()
     WHERE r2.id = v_request.id
     RETURNING * INTO v_updated;

    UPDATE public.parcels
       SET status = 'delivered'
     WHERE id = v_updated.parcel_id;

    UPDATE public.trips
       SET available_capacity = greatest(0, available_capacity - (
         SELECT p.weight FROM public.parcels p WHERE p.id = v_updated.parcel_id
       ))
     WHERE id = v_updated.trip_id;

    PERFORM public.emit_domain_event(
      v_actor_id,
      'request',
      v_updated.id,
      'request_completed',
      'request.completed',
      jsonb_build_object('request_id', v_updated.id, 'parcel_id', v_updated.parcel_id, 'trip_id', v_updated.trip_id)
    );

  ELSIF p_next_status = 'failed' THEN
    IF v_request.status <> 'accepted' THEN
      RAISE EXCEPTION 'Only accepted requests can fail';
    END IF;
    IF v_actor_id <> v_request.sender_id AND v_actor_id <> v_request.traveller_id THEN
      RAISE EXCEPTION 'Only sender or traveller can mark this request as failed';
    END IF;

    UPDATE public.requests r2
       SET status = 'failed',
           updated_at = now()
     WHERE r2.id = v_request.id
     RETURNING * INTO v_updated;

    UPDATE public.parcels
       SET status = 'open'
     WHERE id = v_updated.parcel_id;

    UPDATE public.payments
       SET status = 'locked'
     WHERE request_id = v_updated.id
       AND status = 'locked';

    PERFORM public.emit_domain_event(
      v_actor_id,
      'request',
      v_updated.id,
      'request_failed',
      'request.failed',
      jsonb_build_object('request_id', v_updated.id, 'parcel_id', v_updated.parcel_id, 'trip_id', v_updated.trip_id)
    );

  ELSE
    RAISE EXCEPTION 'Unsupported request transition to %', p_next_status;
  END IF;

  RETURN QUERY
    SELECT
      v_updated.id,
      v_updated.parcel_id,
      v_updated.trip_id,
      v_updated.sender_id,
      v_updated.sender_name,
      v_updated.traveller_id,
      v_updated.traveller_name,
      v_updated.status,
      v_updated.price,
      v_updated.message,
      v_updated.created_at,
      v_updated.updated_at,
      v_updated.created_by,
      v_updated.expires_at;
END;
$$;

-- 7. Server-Side Matching Engine RPCs
DROP FUNCTION IF EXISTS public.find_matching_trips_for_parcel(uuid);
CREATE OR REPLACE FUNCTION public.find_matching_trips_for_parcel(p_parcel_id uuid)
RETURNS TABLE (
  trip_id uuid,
  user_id uuid,
  user_name text,
  user_rating numeric,
  from_city text,
  to_city text,
  "date" date,
  "time" text,
  vehicle_type public.vehicle_type,
  available_capacity numeric,
  price_per_kg numeric,
  status public.trip_status,
  created_at timestamptz,
  match_score integer,
  estimated_cost numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_parcel public.parcels%rowtype;
BEGIN
  SELECT * INTO v_parcel FROM public.parcels WHERE parcels.id = p_parcel_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parcel not found';
  END IF;

  RETURN QUERY
  SELECT
    t.id AS trip_id,
    t.user_id,
    t.user_name,
    t.user_rating,
    t.from_city,
    t.to_city,
    t.date,
    t.time,
    t.vehicle_type,
    t.available_capacity,
    t.price_per_kg,
    t.status,
    t.created_at,
    (
      CASE 
        WHEN public.are_cities_compatible(t.from_city, v_parcel.from_city)
         AND public.are_cities_compatible(t.to_city, v_parcel.to_city) THEN 80
        ELSE 40
      END
      + CASE WHEN t.available_capacity >= v_parcel.weight * 1.5 THEN 10 ELSE 5 END
      + CASE WHEN t.user_rating >= 4.5 THEN 10 ELSE 5 END
    )::integer AS match_score,
    round(t.price_per_kg * v_parcel.weight, 2) AS estimated_cost
  FROM public.trips t
  WHERE t.status = 'active'
    AND t.user_id <> v_parcel.user_id -- STRICT PREVENT SELF-MATCHING
    AND (auth.uid() IS NULL OR t.user_id <> auth.uid()) -- PREVENT CURRENT USER MATCHING OWN TRIPS
    AND t.available_capacity >= v_parcel.weight -- CAPACITY FIT
    AND public.are_cities_compatible(t.from_city, v_parcel.from_city) -- ORIGIN COMPATIBLE
    AND public.are_cities_compatible(t.to_city, v_parcel.to_city) -- DESTINATION COMPATIBLE
    AND (v_parcel.delivery_date IS NULL OR t.date <= (v_parcel.delivery_date + interval '1 day')::date) -- DATE COMPATIBLE
    AND t.date >= (current_date - interval '1 day')::date
  ORDER BY match_score DESC, t.price_per_kg ASC, t.created_at DESC
  LIMIT 50;
END;
$$;

DROP FUNCTION IF EXISTS public.find_matching_parcels_for_trip(uuid);
CREATE OR REPLACE FUNCTION public.find_matching_parcels_for_trip(p_trip_id uuid)
RETURNS TABLE (
  parcel_id uuid,
  user_id uuid,
  user_name text,
  from_city text,
  to_city text,
  category public.parcel_category,
  description text,
  weight numeric,
  price_offer numeric,
  image_url text,
  status public.parcel_status,
  delivery_date date,
  created_at timestamptz,
  match_score integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_trip public.trips%rowtype;
BEGIN
  SELECT * INTO v_trip FROM public.trips WHERE trips.id = p_trip_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found';
  END IF;

  RETURN QUERY
  SELECT
    p.id AS parcel_id,
    p.user_id,
    p.user_name,
    p.from_city,
    p.to_city,
    p.category,
    p.description,
    p.weight,
    p.price_offer,
    p.image_url,
    p.status,
    p.delivery_date,
    p.created_at,
    (
      CASE 
        WHEN public.are_cities_compatible(p.from_city, v_trip.from_city)
         AND public.are_cities_compatible(p.to_city, v_trip.to_city) THEN 80
        ELSE 40
      END
      + CASE WHEN v_trip.available_capacity >= p.weight * 1.5 THEN 10 ELSE 5 END
      + CASE WHEN p.price_offer >= (v_trip.price_per_kg * p.weight) THEN 10 ELSE 5 END
    )::integer AS match_score
  FROM public.parcels p
  WHERE p.status = 'open'
    AND p.user_id <> v_trip.user_id -- STRICT PREVENT SELF-MATCHING
    AND (auth.uid() IS NULL OR p.user_id <> auth.uid()) -- PREVENT CURRENT USER MATCHING OWN PARCELS
    AND p.weight <= v_trip.available_capacity -- CAPACITY FIT
    AND public.are_cities_compatible(p.from_city, v_trip.from_city) -- ORIGIN COMPATIBLE
    AND public.are_cities_compatible(p.to_city, v_trip.to_city) -- DESTINATION COMPATIBLE
    AND (p.delivery_date IS NULL OR p.delivery_date >= (v_trip.date - interval '1 day')::date) -- DATE COMPATIBLE
  ORDER BY match_score DESC, p.price_offer DESC, p.created_at DESC
  LIMIT 50;
END;
$$;

-- 8. Grants
GRANT EXECUTE ON FUNCTION public.transition_request_status(uuid, public.request_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_request_command(uuid, uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_matching_trips_for_parcel(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_matching_parcels_for_trip(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_city(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.are_cities_compatible(text, text) TO authenticated, anon;
