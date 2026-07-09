-- General API rate limiting for create/write operations
-- Extends the auth-specific rate limiting from 20260625000000

CREATE TABLE IF NOT EXISTS api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_user_action_time
  ON api_rate_limits(user_id, action, attempted_at DESC);

ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Rate limit configuration per action type
CREATE OR REPLACE FUNCTION check_api_rate_limit(
  p_user_id uuid,
  p_action text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
  v_max integer;
  v_window interval;
BEGIN
  -- Configure limits per action
  CASE p_action
    WHEN 'create_trip' THEN v_max := 5; v_window := '1 hour';
    WHEN 'create_parcel' THEN v_max := 10; v_window := '1 hour';
    WHEN 'create_request' THEN v_max := 20; v_window := '1 hour';
    WHEN 'send_message' THEN v_max := 60; v_window := '5 minutes';
    WHEN 'search' THEN v_max := 30; v_window := '1 minute';
    ELSE v_max := 30; v_window := '1 hour';
  END CASE;

  SELECT COUNT(*) INTO v_count
  FROM api_rate_limits
  WHERE user_id = p_user_id
    AND action = p_action
    AND attempted_at > NOW() - v_window;

  RETURN v_count < v_max;
END;
$$;

-- Record an API action for rate limiting
CREATE OR REPLACE FUNCTION record_api_action(
  p_user_id uuid,
  p_action text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO api_rate_limits (user_id, action)
  VALUES (p_user_id, p_action);
END;
$$;

-- Enforce rate limit: check and record atomically, raises exception if limited
CREATE OR REPLACE FUNCTION enforce_rate_limit(
  p_user_id uuid,
  p_action text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT check_api_rate_limit(p_user_id, p_action) THEN
    RAISE EXCEPTION 'Rate limit exceeded for action: %', p_action
      USING ERRCODE = 'P0001';
  END IF;

  PERFORM record_api_action(p_user_id, p_action);
END;
$$;

-- Cleanup old rate limit records (call via pg_cron or edge function)
CREATE OR REPLACE FUNCTION cleanup_api_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM api_rate_limits
  WHERE attempted_at < NOW() - INTERVAL '24 hours';
END;
$$;
