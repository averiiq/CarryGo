-- =============================================================================
-- Migration: Robust Rating System, Automatic Aggregation & RLS Hardening
-- 1. Adds total_ratings to user_profiles and backfills counts.
-- 2. Creates AFTER INSERT OR UPDATE OR DELETE trigger on public.ratings to
--    automatically and atomically synchronize user_profiles.rating,
--    user_profiles.total_ratings, and active trips.user_rating.
-- 3. Hardens RLS by requiring all ratings to go through submit_rating_command.
-- =============================================================================

-- 1. Add total_ratings column to user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS total_ratings integer NOT NULL DEFAULT 0;

-- 2. Backfill total_ratings and recalculate accurate average rating for all users
UPDATE public.user_profiles u
SET
  total_ratings = COALESCE((SELECT count(*) FROM public.ratings r WHERE r.to_user_id = u.id), 0),
  rating = COALESCE((
    SELECT round(avg(r.rating)::numeric, 1)
    FROM public.ratings r
    WHERE r.to_user_id = u.id
  ), 4.5);

-- 3. Automated trigger function to maintain user rating and total_ratings on any rating change
CREATE OR REPLACE FUNCTION public.sync_user_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_target_user_id uuid;
  v_new_rating numeric;
  v_new_count integer;
BEGIN
  v_target_user_id := COALESCE(NEW.to_user_id, OLD.to_user_id);

  IF v_target_user_id IS NOT NULL THEN
    SELECT
      COALESCE(round(avg(r.rating)::numeric, 1), 4.5),
      COALESCE(count(*), 0)
    INTO v_new_rating, v_new_count
    FROM public.ratings r
    WHERE r.to_user_id = v_target_user_id;

    UPDATE public.user_profiles
    SET
      rating = v_new_rating,
      total_ratings = v_new_count
    WHERE id = v_target_user_id;

    -- Also keep active trip listings updated with the latest user rating
    UPDATE public.trips
    SET user_rating = v_new_rating
    WHERE user_id = v_target_user_id AND status = 'active';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_user_rating ON public.ratings;
CREATE TRIGGER trigger_sync_user_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_rating();

-- 4. Hardening RLS on public.ratings
-- Revoke direct INSERT privileges from authenticated/anon: all ratings must go through submit_rating_command
DROP POLICY IF EXISTS "ratings_insert_from_user" ON public.ratings;
REVOKE INSERT ON public.ratings FROM authenticated, anon;

-- Ensure SELECT policy allows participants and users to read ratings
DROP POLICY IF EXISTS "ratings_select_all" ON public.ratings;
CREATE POLICY "ratings_select_all" ON public.ratings
  FOR SELECT TO authenticated
  USING (true);

-- Ensure execute on submit_rating_command is granted
GRANT EXECUTE ON FUNCTION public.submit_rating_command(uuid, uuid, integer, text) TO authenticated;
