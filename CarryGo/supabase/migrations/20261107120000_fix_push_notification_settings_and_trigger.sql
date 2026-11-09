-- Migration: Fix push notification app_settings table and trigger dispatch
-- Migration: 20261107120000_fix_push_notification_settings_and_trigger.sql

BEGIN;

-- 1. Create app_settings table if it doesn't already exist
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on app_settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users / service role
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'app_settings' AND policyname = 'Allow read app_settings'
  ) THEN
    CREATE POLICY "Allow read app_settings" ON public.app_settings
      FOR SELECT TO authenticated, anon, service_role
      USING (true);
  END IF;
END;
$$;

-- Seed default Edge Function endpoint and anon key for background webhook dispatches
INSERT INTO public.app_settings (key, value, description)
VALUES 
  ('supabase_edge_url', 'https://nuxvuejtnobljutznlss.supabase.co', 'Supabase project base URL for Edge Functions'),
  ('supabase_anon_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51eHZ1ZWp0bm9ibGp1dHpubHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MzEwMTcsImV4cCI6MjA5NjQwNzAxN30.S6Luoi_LU2B9IB7Q-h8wGfneVqtx42ePDGiKgumMElU', 'Anon public key for Edge gateway dispatch'),
  ('push_webhook_secret', '', 'Shared secret token for push webhook invocations')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = now();

-- 2. Update dispatch_push_notification_trigger function
CREATE OR REPLACE FUNCTION public.dispatch_push_notification_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_supabase_url text;
  v_anon_key text;
  v_webhook_secret text;
BEGIN
  -- Only attempt dispatch if pg_net extension exists
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'http_post' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'net')
  ) THEN
    BEGIN
      SELECT value INTO v_supabase_url FROM public.app_settings WHERE key = 'supabase_edge_url';
    EXCEPTION WHEN OTHERS THEN
      v_supabase_url := NULL;
    END;

    BEGIN
      SELECT value INTO v_anon_key FROM public.app_settings WHERE key = 'supabase_anon_key';
    EXCEPTION WHEN OTHERS THEN
      v_anon_key := NULL;
    END;

    BEGIN
      SELECT value INTO v_webhook_secret FROM public.app_settings WHERE key = 'push_webhook_secret';
    EXCEPTION WHEN OTHERS THEN
      v_webhook_secret := NULL;
    END;

    IF v_supabase_url IS NOT NULL AND v_supabase_url <> '' THEN
      PERFORM net.http_post(
        url := v_supabase_url || '/functions/v1/send-push-notifications',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'apikey', coalesce(v_anon_key, ''),
          'Authorization', 'Bearer ' || coalesce(v_anon_key, ''),
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
  -- Never abort database transactions if push dispatch HTTP fails
  RETURN NEW;
END;
$$;

-- Re-bind trigger on public.notifications
DROP TRIGGER IF EXISTS trg_dispatch_push_notification ON public.notifications;
CREATE TRIGGER trg_dispatch_push_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.dispatch_push_notification_trigger();

COMMIT;

