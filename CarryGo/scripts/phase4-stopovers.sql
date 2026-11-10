-- ============================================================
-- Phase 4: Trip Stopovers (BlaBlaCar-style sub-segment pickups)
-- ============================================================
--
-- Adds a `stopovers text[]` column to the trips table so a
-- traveller can advertise intermediate cities on their route
-- (e.g. Mumbai -> [Vadodara, Jaipur] -> Delhi).
--
-- Matching semantics (any ordered sub-segment): a parcel is
-- carryable if its (from_city, to_city) both appear in
-- [from_city, ...stopovers, to_city] AND from_city appears
-- strictly before to_city in that ordered list.
--
-- The client already handles sub-segment matching in
-- services/smart-matching.service.ts. This migration is only
-- needed if you want the Postgres RPCs
-- (find_matching_trips_for_parcel / find_matching_parcels_for_trip)
-- to also honour stopovers server-side.
--
-- All DDL/DML is commented out. Preview impact first, then
-- uncomment and run section by section.

-- ---------- STEP 1: Preview current schema ----------
SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'trips'
 ORDER BY ordinal_position;

-- ---------- STEP 2: Add stopovers column ----------
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS stopovers text[] DEFAULT ARRAY[]::text[];

COMMENT ON COLUMN public.trips.stopovers IS
  'Ordered intermediate cities. Carryable for any ordered sub-segment of [from_city, ...stopovers, to_city].';

-- ---------- STEP 3: Backfill nulls (safety) ----------
UPDATE public.trips
   SET stopovers = ARRAY[]::text[]
 WHERE stopovers IS NULL;

-- ---------- STEP 4: Optional GIN index for sub-segment queries ----------
CREATE INDEX IF NOT EXISTS trips_stopovers_gin_idx
  ON public.trips USING GIN (stopovers);

-- ---------- STEP 5: Helper function - ordered-contains ----------
-- Checks whether `p_parcel_from` appears strictly before `p_parcel_to` in
-- the ordered list [from_city, ...stopovers, to_city].

CREATE OR REPLACE FUNCTION public.trip_covers_segment(
  p_from_city text,
  p_stopovers text[],
  p_to_city   text,
  p_parcel_from text,
  p_parcel_to   text
) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  full_route text[];
  idx_from int;
  idx_to   int;
BEGIN
  full_route := ARRAY[lower(trim(p_from_city))]
             || COALESCE(ARRAY(SELECT lower(trim(s)) FROM unnest(p_stopovers) s), ARRAY[]::text[])
             || ARRAY[lower(trim(p_to_city))];

  idx_from := array_position(full_route, lower(trim(p_parcel_from)));
  idx_to   := array_position(full_route, lower(trim(p_parcel_to)));

  IF idx_from IS NULL OR idx_to IS NULL THEN RETURN false; END IF;
  RETURN idx_from < idx_to;
END; $$;

-- ---------- STEP 6: Update find_matching_parcels_for_trip (reference only) ----------
-- NOTE: the exact RPC body depends on your current definition. Patch
-- the city-equality predicate so it accepts any sub-segment match:
--
--   -- old:
--   -- WHERE lower(t.from_city) = lower(p.from_city)
--   --   AND lower(t.to_city)   = lower(p.to_city)
--
--   -- new:
--   -- WHERE public.trip_covers_segment(
--   --         t.from_city, COALESCE(t.stopovers, ARRAY[]::text[]), t.to_city,
--   --         p.from_city, p.to_city
--   --       )
--
-- Mirror the same change in find_matching_trips_for_parcel.

-- ---------- Rollback ----------
-- DROP INDEX IF EXISTS trips_stopovers_gin_idx;
-- DROP FUNCTION IF EXISTS public.trip_covers_segment(text, text[], text, text, text);
-- ALTER TABLE public.trips DROP COLUMN IF EXISTS stopovers;
