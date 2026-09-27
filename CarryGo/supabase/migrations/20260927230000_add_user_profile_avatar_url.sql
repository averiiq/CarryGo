-- 20260927230000_add_user_profile_avatar_url.sql
-- Add avatar_url column to user_profiles and sync triggers for instant profile picture visibility

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Add user_avatar columns to trips, parcels, and requests for fast feed avatar display
ALTER TABLE public.trips
ADD COLUMN IF NOT EXISTS user_avatar text;

ALTER TABLE public.parcels
ADD COLUMN IF NOT EXISTS user_avatar text;

ALTER TABLE public.requests
ADD COLUMN IF NOT EXISTS sender_avatar text,
ADD COLUMN IF NOT EXISTS traveller_avatar text;

-- Update sync trigger to automatically propagate updated avatar and full_name across listings
CREATE OR REPLACE FUNCTION public.sync_user_profile_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Sync updated name and avatar to active trips
  UPDATE public.trips
  SET user_name = COALESCE(NEW.full_name, NEW.username, user_name),
      user_avatar = COALESCE(NEW.avatar_url, user_avatar)
  WHERE user_id = NEW.id;

  -- Sync updated name and avatar to open parcels
  UPDATE public.parcels
  SET user_name = COALESCE(NEW.full_name, NEW.username, user_name),
      user_avatar = COALESCE(NEW.avatar_url, user_avatar)
  WHERE user_id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_user_profile_changes ON public.user_profiles;

CREATE TRIGGER trg_sync_user_profile_changes
AFTER UPDATE OF full_name, username, avatar_url, city ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_profile_changes();
