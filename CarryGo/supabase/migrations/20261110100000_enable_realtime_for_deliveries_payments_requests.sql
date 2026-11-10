-- Migration: 20261110100000_enable_realtime_for_deliveries_payments_requests.sql
-- Adds deliveries, payments, and requests to the Supabase Realtime publication.
-- These tables were missing, causing all realtime subscriptions on the delivery
-- screen and requests tab to silently fail (sender never saw live status updates).

BEGIN;

-- Add tables to realtime publication (idempotent — Postgres ignores if already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'deliveries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.deliveries;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.requests;
  END IF;
END $$;

COMMIT;
