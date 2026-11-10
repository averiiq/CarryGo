-- ============================================================
-- Migration: Sync allowed_categories & stopovers in marketplace RPCs & commands
-- ============================================================

-- 1. Ensure columns exist with safe defaults
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS allowed_categories text[] 
  DEFAULT ARRAY['documents', 'electronics', 'clothing', 'food', 'medicine', 'other']::text[];

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS stopovers text[] 
  DEFAULT ARRAY[]::text[];

-- 2. Indexes for fast category and stopover lookups
CREATE INDEX IF NOT EXISTS trips_allowed_categories_gin_idx
  ON public.trips USING GIN (allowed_categories);

CREATE INDEX IF NOT EXISTS trips_stopovers_gin_idx
  ON public.trips USING GIN (stopovers);

-- 3. Upgraded Live Marketplace Trips RPC with allowed_categories and stopovers
DROP FUNCTION IF EXISTS public.fetch_city_marketplace_trips(text, integer, integer);
CREATE OR REPLACE FUNCTION public.fetch_city_marketplace_trips(
  p_city text DEFAULT NULL,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  user_name text,
  user_rating numeric,
  user_avatar text,
  from_city text,
  to_city text,
  "date" date,
  "time" text,
  vehicle_type public.vehicle_type,
  available_capacity numeric,
  price_per_kg numeric,
  status public.trip_status,
  created_at timestamptz,
  allowed_categories text[],
  stopovers text[],
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_norm_city text;
  v_has_city boolean;
  v_total bigint;
BEGIN
  v_norm_city := CASE WHEN p_city IS NOT NULL AND trim(p_city) <> '' THEN public.normalize_city(p_city) ELSE NULL END;
  v_has_city := v_norm_city IS NOT NULL;

  IF v_has_city THEN
    SELECT count(*) INTO v_total
    FROM public.trips t
    WHERE t.status = 'active'
      AND COALESCE(t.available_capacity, 0) > 0
      AND (t.date IS NULL OR t.date >= CURRENT_DATE)
      AND (
        public.are_cities_compatible(t.from_city, v_norm_city)
        OR public.are_cities_compatible(t.to_city, v_norm_city)
      );
  ELSE
    SELECT count(*) INTO v_total
    FROM public.trips t
    WHERE t.status = 'active'
      AND COALESCE(t.available_capacity, 0) > 0
      AND (t.date IS NULL OR t.date >= CURRENT_DATE);
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.user_id,
    t.user_name,
    t.user_rating,
    COALESCE(t.user_avatar, up.avatar_url) AS user_avatar,
    t.from_city,
    t.to_city,
    t.date,
    t.time,
    t.vehicle_type,
    t.available_capacity,
    t.price_per_kg,
    t.status,
    t.created_at,
    COALESCE(t.allowed_categories, ARRAY['documents', 'electronics', 'clothing', 'food', 'medicine', 'other']::text[]) AS allowed_categories,
    COALESCE(t.stopovers, ARRAY[]::text[]) AS stopovers,
    COALESCE(v_total, 0) AS total_count
  FROM public.trips t
  LEFT JOIN public.user_profiles up ON up.id = t.user_id
  WHERE t.status = 'active'
    AND COALESCE(t.available_capacity, 0) > 0
    AND (t.date IS NULL OR t.date >= CURRENT_DATE)
    AND (
      NOT v_has_city
      OR public.are_cities_compatible(t.from_city, v_norm_city)
      OR public.are_cities_compatible(t.to_city, v_norm_city)
    )
  ORDER BY
    CASE 
      WHEN v_has_city AND public.are_cities_compatible(t.from_city, v_norm_city) THEN 1
      WHEN v_has_city AND public.are_cities_compatible(t.to_city, v_norm_city) THEN 2
      ELSE 3
    END ASC,
    t.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fetch_city_marketplace_trips(text, integer, integer) TO authenticated, anon;

-- 4. Harden create_request_command to enforce allowed_categories check
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
  v_allowed_lower text[];
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

  -- Enforce category compatibility strictly
  IF v_trip.allowed_categories IS NOT NULL AND array_length(v_trip.allowed_categories, 1) > 0 THEN
    SELECT ARRAY_AGG(lower(trim(x))) INTO v_allowed_lower
    FROM unnest(v_trip.allowed_categories) AS x;

    IF NOT (lower(trim(v_parcel.category::text)) = ANY(v_allowed_lower)) THEN
      RAISE EXCEPTION 'Category "%" is not accepted by traveller for this trip', v_parcel.category;
    END IF;
  END IF;

  -- Route compatibility validation using semantic normalization (or stopovers)
  IF NOT (
    (public.are_cities_compatible(v_parcel.from_city, v_trip.from_city) OR (v_trip.stopovers IS NOT NULL AND v_parcel.from_city = ANY(v_trip.stopovers)))
    AND
    (public.are_cities_compatible(v_parcel.to_city, v_trip.to_city) OR (v_trip.stopovers IS NOT NULL AND v_parcel.to_city = ANY(v_trip.stopovers)))
  ) THEN
    -- Fallback simple check
    IF NOT public.are_cities_compatible(v_parcel.from_city, v_trip.from_city)
       OR NOT public.are_cities_compatible(v_parcel.to_city, v_trip.to_city) THEN
      RAISE EXCEPTION 'Parcel and trip routes do not match: parcel goes % to %, trip goes % to %',
        v_parcel.from_city, v_parcel.to_city, v_trip.from_city, v_trip.to_city;
    END IF;
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

GRANT EXECUTE ON FUNCTION public.create_request_command(uuid, uuid, numeric, text) TO authenticated;

-- 5. Notify PostgREST to reload schema cache immediately
NOTIFY pgrst, 'reload schema';

