-- ============================================================
-- Migration: Add allowed_categories and stopovers to trips table
-- ============================================================

-- 1. Add allowed_categories column (default all parcel categories)
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS allowed_categories text[] 
  DEFAULT ARRAY['documents', 'electronics', 'clothing', 'food', 'medicine', 'other']::text[];

-- 2. Add stopovers column for intermediate stops
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS stopovers text[] 
  DEFAULT ARRAY[]::text[];

-- 3. GIN index for fast stopover sub-segment queries
CREATE INDEX IF NOT EXISTS trips_stopovers_gin_idx
  ON public.trips USING GIN (stopovers);

-- 4. Notify PostgREST to reload schema cache immediately
NOTIFY pgrst, 'reload schema';

