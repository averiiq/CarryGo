-- Atomic counter increment to prevent race conditions on profile counters
CREATE OR REPLACE FUNCTION increment_counter(p_user_id uuid, p_column text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_column = 'total_trips' THEN
    UPDATE user_profiles
    SET total_trips = COALESCE(total_trips, 0) + 1
    WHERE id = p_user_id;
  ELSIF p_column = 'total_deliveries' THEN
    UPDATE user_profiles
    SET total_deliveries = COALESCE(total_deliveries, 0) + 1
    WHERE id = p_user_id;
  ELSE
    RAISE EXCEPTION 'Invalid column: %', p_column;
  END IF;
END;
$$;

-- Auth rate limiting table
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  attempt_type text NOT NULL CHECK (attempt_type IN ('send_otp', 'verify_otp')),
  attempted_at timestamptz NOT NULL DEFAULT NOW(),
  success boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_email_time
  ON auth_rate_limits(email, attempted_at DESC);

-- Rate limit check function: returns true if request is allowed
CREATE OR REPLACE FUNCTION check_auth_rate_limit(p_email text, p_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
  v_max integer;
BEGIN
  v_max := CASE p_type
    WHEN 'send_otp' THEN 5
    WHEN 'verify_otp' THEN 10
    ELSE 5
  END;

  SELECT COUNT(*) INTO v_count
  FROM auth_rate_limits
  WHERE email = lower(trim(p_email))
    AND attempt_type = p_type
    AND attempted_at > NOW() - INTERVAL '1 hour';

  RETURN v_count < v_max;
END;
$$;

-- Record auth attempt
CREATE OR REPLACE FUNCTION record_auth_attempt(p_email text, p_type text, p_success boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO auth_rate_limits (email, attempt_type, success)
  VALUES (lower(trim(p_email)), p_type, p_success);
END;
$$;

-- Cleanup old rate limit records (run periodically via cron)
CREATE OR REPLACE FUNCTION cleanup_auth_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM auth_rate_limits
  WHERE attempted_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- RLS: no client access to rate limit table
ALTER TABLE auth_rate_limits ENABLE ROW LEVEL SECURITY;
