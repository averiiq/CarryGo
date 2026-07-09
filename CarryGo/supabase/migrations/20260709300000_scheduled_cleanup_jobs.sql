-- Cleanup function for old notifications (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM notifications
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND read = true;
END;
$$;

-- Schedule cleanup jobs via pg_cron (skips gracefully if extension unavailable)
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;

  PERFORM cron.schedule(
    'cleanup-api-rate-limits',
    '0 */6 * * *',
    'SELECT cleanup_api_rate_limits()'
  );

  PERFORM cron.schedule(
    'cleanup-auth-rate-limits',
    '0 */6 * * *',
    'SELECT cleanup_auth_rate_limits()'
  );

  PERFORM cron.schedule(
    'cleanup-old-notifications',
    '0 3 * * *',
    'SELECT cleanup_old_notifications()'
  );

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available — scheduled jobs skipped. Enable pg_cron extension in Supabase dashboard to activate.';
END;
$$;
