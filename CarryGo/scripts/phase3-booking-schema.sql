-- Phase 3 migration: collapse requests → bookings data model.
--
-- Context: Phase 1 removed the "traveller offers to carry" direction at the UI
-- and cancelled all pending traveller-initiated rows. Phase 2 moved payment to
-- booking time. Phase 3 brings the schema in line with the v2 model:
--
--   * one concept: a booking that a sender initiated against a trip
--   * no more bidirectional created_by flipping the meaning of a row
--   * explicit escrow columns (paid_at, escrow_id) so payment state is first-class
--   * instant_booked flag so the traveller-side UI can skip accept/decline
--   * collapsed status enum: pending → confirmed → picked_up → in_transit →
--     delivered → cancelled | disputed
--
-- SAFETY
--   - The DROP of created_by is irreversible. Review rows surfaced by step 1
--     before running step 2. Any lingering created_by = traveller_id rows should
--     be cancelled by the Phase 1 script first.
--   - All DML/DDL statements below are commented out. Review each section,
--     then uncomment the ones you want to run. Run one section at a time.
--   - Code references to the `requests` table (services/requests.service.ts,
--     features/requests/queries.ts, types) need to be updated in the same
--     deploy. The rename at the bottom will break the app until that ships.

-- ───────────────────────────────────────────────────────────────────────────
-- STEP 1: PREVIEW remaining anomalies before touching the schema.
-- ───────────────────────────────────────────────────────────────────────────

-- Any still-pending traveller-initiated rows (Phase 1 should have cancelled all)?
SELECT COUNT(*) AS lingering_traveller_offers
FROM requests
WHERE status = 'pending'
  AND created_by = traveller_id;

-- Distribution of legacy status values that will be remapped.
SELECT status, COUNT(*) AS n
FROM requests
GROUP BY status
ORDER BY n DESC;

-- Rows with no payment linked that are already accepted (would become unpaid
-- 'confirmed' after rename — surface them so you can decide: force-cancel or
-- let the on-accept safety-net redirect in app/(tabs)/requests.tsx catch them).
SELECT r.id, r.status, r.created_at, p.id AS payment_id, p.status AS payment_status
FROM requests r
LEFT JOIN payments p ON p.request_id = r.id
WHERE r.status IN ('accepted', 'completed')
  AND p.id IS NULL;

-- ───────────────────────────────────────────────────────────────────────────
-- STEP 2: ADD new columns (reversible — safe to run before the rename).
-- ───────────────────────────────────────────────────────────────────────────

-- ALTER TABLE requests ADD COLUMN IF NOT EXISTS paid_at timestamptz;
-- ALTER TABLE requests ADD COLUMN IF NOT EXISTS escrow_id text;
-- ALTER TABLE requests ADD COLUMN IF NOT EXISTS instant_booked boolean NOT NULL DEFAULT false;

-- Backfill paid_at from the linked payments row where we have one.
-- UPDATE requests r
--    SET paid_at = p.paid_at
--   FROM payments p
--  WHERE p.request_id = r.id
--    AND p.status IN ('captured', 'paid', 'succeeded')
--    AND r.paid_at IS NULL;

-- Backfill escrow_id from the Razorpay order id on the payment.
-- UPDATE requests r
--    SET escrow_id = p.razorpay_order_id
--   FROM payments p
--  WHERE p.request_id = r.id
--    AND r.escrow_id IS NULL
--    AND p.razorpay_order_id IS NOT NULL;

-- ───────────────────────────────────────────────────────────────────────────
-- STEP 3: COLLAPSE the status enum.
-- Legacy → v2:
--   'accepted'  → 'confirmed'
--   'completed' → 'delivered'
--   'failed'    → 'disputed'
--   'rejected'  → 'cancelled'
--   'pending' | 'in_transit' | 'cancelled' stay as-is.
--   NEW intermediate: 'picked_up' (set by OTP pickup action, unused by this migration)
-- ───────────────────────────────────────────────────────────────────────────

-- UPDATE requests SET status = 'confirmed' WHERE status = 'accepted';
-- UPDATE requests SET status = 'delivered' WHERE status = 'completed';
-- UPDATE requests SET status = 'disputed'  WHERE status = 'failed';
-- UPDATE requests SET status = 'cancelled' WHERE status = 'rejected';

-- If `status` is a Postgres ENUM type, the UPDATEs above fail until the enum
-- has the new values. In that case:
-- ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'confirmed';
-- ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'picked_up';
-- ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'disputed';
-- then re-run the UPDATEs, then (Postgres 14+):
-- ALTER TYPE request_status DROP VALUE 'accepted';
-- ALTER TYPE request_status DROP VALUE 'completed';
-- ALTER TYPE request_status DROP VALUE 'failed';
-- ALTER TYPE request_status DROP VALUE 'rejected';

-- ───────────────────────────────────────────────────────────────────────────
-- STEP 4: DROP the created_by column.
-- Irreversible. Only run after Phase 1 cancellation ran and lingering = 0.
-- ───────────────────────────────────────────────────────────────────────────

-- ALTER TABLE requests DROP COLUMN created_by;

-- ───────────────────────────────────────────────────────────────────────────
-- STEP 5: RENAME requests → bookings.
-- This BREAKS the app until the client-side rename ships in the same deploy.
-- Coordinate with the code rename pass:
--   services/requests.service.ts, features/requests/queries.ts, types/*.ts,
--   any .from('requests') call in the app.
-- ───────────────────────────────────────────────────────────────────────────

-- ALTER TABLE requests RENAME TO bookings;

-- If you keep the plural-noun RLS policy naming, rename those too:
-- ALTER POLICY "requests_select" ON bookings RENAME TO "bookings_select";
-- ALTER POLICY "requests_insert" ON bookings RENAME TO "bookings_insert";
-- ALTER POLICY "requests_update" ON bookings RENAME TO "bookings_update";

-- Update indexes with the old prefix:
-- ALTER INDEX requests_pkey RENAME TO bookings_pkey;
-- ALTER INDEX IF EXISTS idx_requests_sender_id RENAME TO idx_bookings_sender_id;
-- ALTER INDEX IF EXISTS idx_requests_traveller_id RENAME TO idx_bookings_traveller_id;
-- ALTER INDEX IF EXISTS idx_requests_trip_id RENAME TO idx_bookings_trip_id;
-- ALTER INDEX IF EXISTS idx_requests_parcel_id RENAME TO idx_bookings_parcel_id;
-- ALTER INDEX IF EXISTS idx_requests_status RENAME TO idx_bookings_status;

-- ───────────────────────────────────────────────────────────────────────────
-- STEP 6 (future, deferred): cancellation curve.
-- Add `refund_percent` and `cancellation_deadline_at` columns so the
-- asymmetric 24/6/1h cancellation curve can be enforced server-side.
-- Deferred to its own migration since it needs product-policy sign-off.
-- ───────────────────────────────────────────────────────────────────────────
