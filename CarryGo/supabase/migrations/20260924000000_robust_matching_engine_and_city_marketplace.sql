-- Migration: Robust Matching Engine & City-Based Live Marketplace RPCs
-- 1. High Performance Composite Indexes for City-Relevant Live Marketplace
CREATE INDEX IF NOT EXISTS idx_trips_status_from_city ON public.trips (status, from_city, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trips_status_to_city ON public.trips (status, to_city, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trips_status_dates ON public.trips (status, date, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_parcels_status_from_city ON public.parcels (status, from_city, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_parcels_status_to_city ON public.parcels (status, to_city, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_parcels_status_dates ON public.parcels (status, delivery_date, created_at DESC);

-- 2. Live Marketplace City-Relevant Trips RPC
-- Returns trips relevant to the user's home/onboarding city.
-- Prioritizes departures from user's city, then arrivals to user's city.
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
  from_city text,
  to_city text,
  "date" date,
  "time" text,
  vehicle_type public.vehicle_type,
  available_capacity numeric,
  price_per_kg numeric,
  status public.trip_status,
  created_at timestamptz,
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

  -- Count total matching items
  IF v_has_city THEN
    SELECT count(*) INTO v_total
    FROM public.trips t
    WHERE t.status = 'active'
      AND (
        public.are_cities_compatible(t.from_city, v_norm_city)
        OR public.are_cities_compatible(t.to_city, v_norm_city)
      );
  ELSE
    SELECT count(*) INTO v_total
    FROM public.trips t
    WHERE t.status = 'active';
  END IF;

  RETURN QUERY
  SELECT
    t.id,
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
    v_total AS total_count
  FROM public.trips t
  WHERE t.status = 'active'
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

-- 3. Live Marketplace City-Relevant Parcels RPC
-- Returns open parcels relevant to the user's home/onboarding city.
DROP FUNCTION IF EXISTS public.fetch_city_marketplace_parcels(text, integer, integer);
CREATE OR REPLACE FUNCTION public.fetch_city_marketplace_parcels(
  p_city text DEFAULT NULL,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
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

  -- Count total matching items
  IF v_has_city THEN
    SELECT count(*) INTO v_total
    FROM public.parcels p
    WHERE p.status = 'open'
      AND (
        public.are_cities_compatible(p.from_city, v_norm_city)
        OR public.are_cities_compatible(p.to_city, v_norm_city)
      );
  ELSE
    SELECT count(*) INTO v_total
    FROM public.parcels p
    WHERE p.status = 'open';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
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
    v_total AS total_count
  FROM public.parcels p
  WHERE p.status = 'open'
    AND (
      NOT v_has_city
      OR public.are_cities_compatible(p.from_city, v_norm_city)
      OR public.are_cities_compatible(p.to_city, v_norm_city)
    )
  ORDER BY
    CASE 
      WHEN v_has_city AND public.are_cities_compatible(p.from_city, v_norm_city) THEN 1
      WHEN v_has_city AND public.are_cities_compatible(p.to_city, v_norm_city) THEN 2
      ELSE 3
    END ASC,
    p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 4. Harden find_matching_trips_for_parcel RPC
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
      80
      + CASE WHEN t.available_capacity >= v_parcel.weight * 1.5 THEN 10 ELSE 5 END
      + CASE WHEN t.user_rating >= 4.5 THEN 10 ELSE 5 END
    )::integer AS match_score,
    round(t.price_per_kg * v_parcel.weight, 2) AS estimated_cost
  FROM public.trips t
  WHERE t.status = 'active'
    AND t.user_id <> v_parcel.user_id -- STRICT PREVENT SELF-MATCHING
    AND (auth.uid() IS NULL OR t.user_id <> auth.uid()) -- PREVENT CURRENT USER MATCHING OWN TRIPS
    AND t.available_capacity >= v_parcel.weight -- HARD CAPACITY FIT
    AND public.are_cities_compatible(t.from_city, v_parcel.from_city) -- HARD ORIGIN COMPATIBLE
    AND public.are_cities_compatible(t.to_city, v_parcel.to_city) -- HARD DESTINATION COMPATIBLE
    AND (v_parcel.delivery_date IS NULL OR t.date <= (v_parcel.delivery_date + interval '1 day')::date) -- DATE COMPATIBLE
    AND t.date >= (current_date - interval '1 day')::date
  ORDER BY match_score DESC, t.price_per_kg ASC, t.created_at DESC
  LIMIT 50;
END;
$$;

-- 5. Harden find_matching_parcels_for_trip RPC
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
  match_score integer,
  estimated_cost numeric
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
      80
      + CASE WHEN v_trip.available_capacity >= p.weight * 1.5 THEN 10 ELSE 5 END
      + CASE WHEN p.price_offer >= (v_trip.price_per_kg * p.weight) THEN 10 ELSE 5 END
    )::integer AS match_score,
    p.price_offer AS estimated_cost
  FROM public.parcels p
  WHERE p.status = 'open'
    AND p.user_id <> v_trip.user_id -- STRICT PREVENT SELF-MATCHING
    AND (auth.uid() IS NULL OR p.user_id <> auth.uid()) -- PREVENT CURRENT USER MATCHING OWN PARCELS
    AND p.weight <= v_trip.available_capacity -- HARD CAPACITY FIT
    AND public.are_cities_compatible(p.from_city, v_trip.from_city) -- HARD ORIGIN COMPATIBLE
    AND public.are_cities_compatible(p.to_city, v_trip.to_city) -- HARD DESTINATION COMPATIBLE
    AND (p.delivery_date IS NULL OR p.delivery_date >= (v_trip.date - interval '1 day')::date) -- DATE COMPATIBLE
  ORDER BY match_score DESC, p.price_offer DESC, p.created_at DESC
  LIMIT 50;
END;
$$;

-- 6. Permissions Grant
GRANT EXECUTE ON FUNCTION public.fetch_city_marketplace_trips(text, integer, integer) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.fetch_city_marketplace_parcels(text, integer, integer) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.find_matching_trips_for_parcel(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.find_matching_parcels_for_trip(uuid) TO authenticated, anon;
