-- Replace full AVG recalculation with a materialized view for user ratings
-- This avoids scanning all ratings on every new submission

CREATE MATERIALIZED VIEW IF NOT EXISTS user_rating_stats AS
SELECT
  to_user_id AS user_id,
  COUNT(*)::integer AS total_ratings,
  ROUND(AVG(rating)::numeric, 2) AS average_rating
FROM ratings
GROUP BY to_user_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_rating_stats_user_id ON user_rating_stats (user_id);

-- Function to refresh the materialized view (called after rating submission)
CREATE OR REPLACE FUNCTION refresh_user_ratings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_rating_stats;
END;
$$;

-- Update submit_rating_command to refresh the materialized view instead of recalculating inline
-- Note: For high-traffic scenarios, consider refreshing on a schedule instead of per-submission
