-- Schedule background outbox event processing via pg_cron
-- Skips gracefully if pg_cron extension is not enabled in the current database environment

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;

  -- Remove existing job if already registered to prevent duplicates
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'cron' AND tablename = 'job'
  ) THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-outbox-events') THEN
      PERFORM cron.unschedule('process-outbox-events');
    END IF;
  END IF;

  PERFORM cron.schedule(
    'process-outbox-events',
    '* * * * *',
    'SELECT public.process_outbox_events(50)'
  );

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available — outbox cron job skipped. Can be triggered via process-outbox Edge Function or scheduled webhook.';
END;
$$;
