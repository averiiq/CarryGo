-- Phase 1 migration: cancel all pending traveller-initiated offers.
--
-- Context: the v2 BlaBlaCar-style flow removes the "traveller offers to carry"
-- initiation path. Senders are the only party who can initiate a booking.
-- Pending requests created by travellers (created_by = traveller_id) are now
-- unreachable from the UI and must be cancelled so they stop showing up as
-- actionable items in both inboxes.
--
-- Safe to re-run. Only touches rows that are still pending.
--
-- USAGE
--   1. Review the preview SELECT below and confirm the row count matches
--      your expectation in the Supabase SQL editor.
--   2. Run the UPDATE statement. There is no automatic undo — snapshot the
--      affected rows first if you want a rollback path.

-- PREVIEW: rows that will be cancelled.
SELECT
  id,
  parcel_id,
  trip_id,
  sender_id,
  traveller_id,
  created_by,
  status,
  created_at
FROM requests
WHERE status = 'pending'
  AND created_by = traveller_id;

-- EXECUTE: uncomment to perform the cancellation.
-- UPDATE requests
--    SET status = 'cancelled',
--        updated_at = NOW()
--  WHERE status = 'pending'
--    AND created_by = traveller_id;
