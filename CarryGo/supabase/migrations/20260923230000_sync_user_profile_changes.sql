-- Migration to propagate user profile name and city changes in real-time
-- to parcels, trips, requests, conversations, and messages.

CREATE OR REPLACE FUNCTION public.sync_user_profile_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_display_name text;
BEGIN
  -- Determine best display name
  v_display_name := COALESCE(NULLIF(TRIM(NEW.full_name), ''), NULLIF(TRIM(NEW.username), ''), split_part(NEW.email, '@', 1), 'User');

  -- 1. Propagate to parcels
  UPDATE public.parcels
  SET 
    user_name = v_display_name,
    user_city = COALESCE(NEW.city, user_city)
  WHERE user_id = NEW.id;

  -- 2. Propagate to trips
  UPDATE public.trips
  SET 
    user_name = v_display_name,
    user_city = COALESCE(NEW.city, user_city)
  WHERE user_id = NEW.id;

  -- 3. Propagate to requests as sender
  UPDATE public.requests
  SET sender_name = v_display_name
  WHERE sender_id = NEW.id;

  -- 4. Propagate to requests as traveller
  UPDATE public.requests
  SET traveller_name = v_display_name
  WHERE traveller_id = NEW.id;

  -- 5. Propagate into conversations JSONB map
  UPDATE public.conversations
  SET participant_names = participant_names || jsonb_build_object(NEW.id::text, v_display_name)
  WHERE NEW.id = ANY(participant_ids);

  -- 6. Propagate into messages
  UPDATE public.messages
  SET sender_name = v_display_name
  WHERE sender_id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_user_profile_changes ON public.user_profiles;

CREATE TRIGGER trg_sync_user_profile_changes
AFTER UPDATE OF full_name, username, city ON public.user_profiles
FOR EACH ROW
WHEN (
  OLD.full_name IS DISTINCT FROM NEW.full_name OR
  OLD.username IS DISTINCT FROM NEW.username OR
  OLD.city IS DISTINCT FROM NEW.city
)
EXECUTE FUNCTION public.sync_user_profile_changes();

-- One-time backfill to ensure existing records reflect current user names & cities
-- 1. Backfill parcels
UPDATE public.parcels p
SET 
  user_name = COALESCE(NULLIF(TRIM(u.full_name), ''), NULLIF(TRIM(u.username), ''), split_part(u.email, '@', 1), p.user_name),
  user_city = COALESCE(u.city, p.user_city)
FROM public.user_profiles u
WHERE p.user_id = u.id;

-- 2. Backfill trips
UPDATE public.trips t
SET 
  user_name = COALESCE(NULLIF(TRIM(u.full_name), ''), NULLIF(TRIM(u.username), ''), split_part(u.email, '@', 1), t.user_name),
  user_city = COALESCE(u.city, t.user_city)
FROM public.user_profiles u
WHERE t.user_id = u.id;

-- 3. Backfill requests sender
UPDATE public.requests r
SET sender_name = COALESCE(NULLIF(TRIM(u.full_name), ''), NULLIF(TRIM(u.username), ''), split_part(u.email, '@', 1), r.sender_name)
FROM public.user_profiles u
WHERE r.sender_id = u.id;

-- 4. Backfill requests traveller
UPDATE public.requests r
SET traveller_name = COALESCE(NULLIF(TRIM(u.full_name), ''), NULLIF(TRIM(u.username), ''), split_part(u.email, '@', 1), r.traveller_name)
FROM public.user_profiles u
WHERE r.traveller_id = u.id;

-- 5. Backfill conversations participant_names
UPDATE public.conversations c
SET participant_names = (
  SELECT jsonb_object_agg(
    up.id::text,
    COALESCE(NULLIF(TRIM(up.full_name), ''), NULLIF(TRIM(up.username), ''), split_part(up.email, '@', 1), 'User')
  )
  FROM public.user_profiles up
  WHERE up.id = ANY(c.participant_ids)
)
WHERE array_length(c.participant_ids, 1) > 0;

-- 6. Backfill messages sender_name
UPDATE public.messages m
SET sender_name = COALESCE(NULLIF(TRIM(u.full_name), ''), NULLIF(TRIM(u.username), ''), split_part(u.email, '@', 1), m.sender_name)
FROM public.user_profiles u
WHERE m.sender_id = u.id;
