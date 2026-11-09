-- 20261105200000_feed_user_avatars_and_relevance_rpc_update.sql
-- Propagate user uploaded profile photos to live marketplace feeds and upgrade RPCs to return user_avatar

-- 1. Backfill any existing trips where user_avatar is null
UPDATE public.trips t
SET user_avatar = up.avatar_url
FROM public.user_profiles up
WHERE t.user_id = up.id
  AND (t.user_avatar IS NULL OR trim(t.user_avatar) = '')
  AND up.avatar_url IS NOT NULL
  AND trim(up.avatar_url) <> '';

-- 2. Backfill any existing parcels where user_avatar is null
UPDATE public.parcels p
SET user_avatar = up.avatar_url
FROM public.user_profiles up
WHERE p.user_id = up.id
  AND (p.user_avatar IS NULL OR trim(p.user_avatar) = '')
  AND up.avatar_url IS NOT NULL
  AND trim(up.avatar_url) <> '';

-- 3. Upgraded Live Marketplace Trips RPC with author user_avatar
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

-- 4. Upgraded Live Marketplace Parcels RPC with author user_avatar
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
  user_avatar text,
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
    COALESCE(p.user_avatar, up.avatar_url) AS user_avatar,
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
  LEFT JOIN public.user_profiles up ON up.id = p.user_id
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

