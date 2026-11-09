-- Migration: Dispatch push notifications on notification insert via pg_net
-- Migration: 20261027170000_dispatch_push_notifications_trigger.sql

BEGIN;

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_net;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_net extension not available in current database environment. Push notifications can be invoked via Supabase Database Webhook or background worker.';
END;
$$;

-- Trigger function to dispatch push notification
CREATE OR REPLACE FUNCTION public.dispatch_push_notification_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_supabase_url text;
  v_webhook_secret text;
BEGIN
  -- Only attempt dispatch if pg_net is available and extension functions exist
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'http_post' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'net')
  ) THEN
    -- Read config from app_settings or defaults if configured
    BEGIN
      SELECT value INTO v_webhook_secret FROM public.app_settings WHERE key = 'push_webhook_secret';
    EXCEPTION WHEN OTHERS THEN
      v_webhook_secret := NULL;
    END;

    BEGIN
      SELECT value INTO v_supabase_url FROM public.app_settings WHERE key = 'supabase_edge_url';
    EXCEPTION WHEN OTHERS THEN
      v_supabase_url := NULL;
    END;

    IF v_supabase_url IS NOT NULL AND v_supabase_url <> '' THEN
      PERFORM net.http_post(
        url := v_supabase_url || '/functions/v1/send-push-notifications',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-webhook-secret', coalesce(v_webhook_secret, '')
        ),
        body := jsonb_build_object(
          'type', TG_OP,
          'table', TG_TABLE_NAME,
          'schema', TG_TABLE_SCHEMA,
          'record', row_to_json(NEW)
        )
      );
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never abort transaction if push notification HTTP call fails
  RETURN NEW;
END;
$$;

-- Recreate trigger on public.notifications
DROP TRIGGER IF EXISTS trg_dispatch_push_notification ON public.notifications;
CREATE TRIGGER trg_dispatch_push_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.dispatch_push_notification_trigger();

COMMIT;
