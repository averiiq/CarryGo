-- ==============================================================================
-- MIGRATION: 20261011160000_location_based_marketplace_and_complete_item_exclusion.sql
-- Description: Enforce strict location-based algorithm for live marketplace
--              and exclude complete, fully booked, or expired trips and parcels.
-- ==============================================================================

-- 1. Upgraded Live Marketplace Trips RPC
-- Returns ONLY active, available-capacity, upcoming trips matching the anchor location.
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

  -- Live marketplace strictly requires a location anchor.
  -- Excludes completed, fully booked (capacity <= 0), or expired (date < CURRENT_DATE) trips.
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
    -- If no city is specified, count active, non-completed, non-expired trips
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
    t.from_city,
    t.to_city,
    t.date,
    t.time,
    t.vehicle_type,
    t.available_capacity,
    t.price_per_kg,
    t.status,
    t.created_at,
    COALESCE(v_total, 0) AS total_count
  FROM public.trips t
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

-- 2. Upgraded Live Marketplace Parcels RPC
-- Returns ONLY open, non-delivered, upcoming parcels matching the anchor location.
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

  -- Live marketplace strictly requires a location anchor.
  -- Excludes completed/delivered/cancelled parcels or past expired delivery dates.
  IF v_has_city THEN
    SELECT count(*) INTO v_total
    FROM public.parcels p
    WHERE p.status = 'open'
      AND (p.delivery_date IS NULL OR p.delivery_date >= CURRENT_DATE)
      AND (
        public.are_cities_compatible(p.from_city, v_norm_city)
        OR public.are_cities_compatible(p.to_city, v_norm_city)
      );
  ELSE
    SELECT count(*) INTO v_total
    FROM public.parcels p
    WHERE p.status = 'open'
      AND (p.delivery_date IS NULL OR p.delivery_date >= CURRENT_DATE);
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
    COALESCE(v_total, 0) AS total_count
  FROM public.parcels p
  WHERE p.status = 'open'
    AND (p.delivery_date IS NULL OR p.delivery_date >= CURRENT_DATE)
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

-- Grant permissions to authenticated and anonymous API callers
GRANT EXECUTE ON FUNCTION public.fetch_city_marketplace_trips(text, integer, integer) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.fetch_city_marketplace_parcels(text, integer, integer) TO authenticated, anon;
