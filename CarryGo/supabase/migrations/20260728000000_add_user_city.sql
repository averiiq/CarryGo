-- Add city column to user_profiles for location-scoped feed visibility
ALTER TABLE user_profiles ADD COLUMN city text;

-- Index for city-based queries (used in feed scoping)
CREATE INDEX idx_user_profiles_city ON user_profiles (city) WHERE city IS NOT NULL;

-- Update notify_route_subscribers to only notify users in relevant cities
-- Users registered in from_city or to_city will see the listings
CREATE OR REPLACE FUNCTION notify_route_subscribers(
  p_listing_type text,
  p_listing_id uuid,
  p_from_city text,
  p_to_city text,
  p_title text,
  p_body text
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_count integer := 0;
  v_sub record;
BEGIN
  FOR v_sub IN
    SELECT DISTINCT rs.user_id
    FROM route_subscriptions rs
    JOIN user_profiles up ON up.id = rs.user_id
    WHERE rs.active = true
      AND rs.from_city = p_from_city
      AND rs.to_city = p_to_city
      AND (up.city = p_from_city OR up.city = p_to_city OR up.city IS NULL)
  LOOP
    INSERT INTO notifications (user_id, title, body, type, related_id)
    VALUES (v_sub.user_id, p_title, p_body, 'route_match', p_listing_id);
    v_count := v_count + 1;
  END LOOP;

  INSERT INTO outbox_events (topic, entity_type, entity_id, payload, status)
  VALUES (
    'route_match',
    p_listing_type,
    p_listing_id,
    jsonb_build_object(
      'from_city', p_from_city,
      'to_city', p_to_city,
      'title', p_title,
      'body', p_body,
      'notified_count', v_count
    ),
    'pending'
  );

  RETURN v_count;
END;
$$;
