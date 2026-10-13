-- ============================================================================
-- Migration: 20261011150000_enterprise_scalability_and_performance_indexing.sql
-- Description: Enterprise-grade database indexing for maximum concurrency,
--              high-throughput route matching, zero-sequential-scan RLS checks,
--              GIN trigram fuzzy city search, and ultra-fast queue sweeps.
-- ============================================================================

-- 1. Enable pg_trgm extension for fast ILIKE and trigram text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- 2. TRIPS & CORRIDOR INDEXES
-- ============================================================================

-- Trigram GIN indexes for fuzzy/partial city search (solves ILIKE '%city%' full table scan)
CREATE INDEX IF NOT EXISTS idx_trips_from_city_trgm
  ON public.trips USING GIN (from_city gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_trips_to_city_trgm
  ON public.trips USING GIN (to_city gin_trgm_ops);

-- High-performance partial index for active trips by corridor + date
CREATE INDEX IF NOT EXISTS idx_trips_active_corridor_date
  ON public.trips (from_city, to_city, date, created_at DESC)
  WHERE status = 'active';

-- High-performance covering index for smart matching algorithm on active trips
CREATE INDEX IF NOT EXISTS idx_trips_active_matching_covering
  ON public.trips (from_city, to_city, available_capacity, price_per_kg, user_rating)
  WHERE status = 'active';

-- City marketplace discovery index (for user city home feed lookup)
CREATE INDEX IF NOT EXISTS idx_trips_active_origin_date
  ON public.trips (from_city, date, created_at DESC)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_trips_active_dest_date
  ON public.trips (to_city, date, created_at DESC)
  WHERE status = 'active';


-- ============================================================================
-- 3. PARCELS & SHIPMENT INDEXES
-- ============================================================================

-- Trigram GIN indexes for fuzzy/partial city search
CREATE INDEX IF NOT EXISTS idx_parcels_from_city_trgm
  ON public.parcels USING GIN (from_city gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_parcels_to_city_trgm
  ON public.parcels USING GIN (to_city gin_trgm_ops);

-- High-performance partial index for open/matched parcels on route corridors
CREATE INDEX IF NOT EXISTS idx_parcels_open_corridor_date
  ON public.parcels (from_city, to_city, delivery_date, created_at DESC)
  WHERE status IN ('open', 'matched');

-- High-performance covering index for matching engine against open parcels
CREATE INDEX IF NOT EXISTS idx_parcels_open_matching_covering
  ON public.parcels (from_city, to_city, weight, price_offer)
  WHERE status = 'open';


-- ============================================================================
-- 4. CONVERSATIONS & CHAT INDEXES (ELIMINATES RLS SEQUENTIAL SCANS)
-- ============================================================================

-- GIN index on participant_ids uuid[]:
-- Vital: Every conversations & messages RLS check executes `auth.uid() = ANY(participant_ids)`.
-- Without GIN on participant_ids, every chat read causes a full sequential table scan.
CREATE INDEX IF NOT EXISTS idx_conversations_participant_ids_gin
  ON public.conversations USING GIN (participant_ids);

-- Fast sorted messages inbox listing
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at_desc
  ON public.conversations (last_message_at DESC NULLS LAST);

-- Covering index for conversation messages pagination and unread counts
CREATE INDEX IF NOT EXISTS idx_messages_conv_created_read
  ON public.messages (conversation_id, created_at DESC, read);


-- ============================================================================
-- 5. REQUESTS & ESCROW STATE MACHINE INDEXES
-- ============================================================================

-- Fast lookup of requests per parcel / trip (prevents overbooking concurrency race conditions)
CREATE INDEX IF NOT EXISTS idx_requests_parcel_status_covering
  ON public.requests (parcel_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_requests_trip_status_covering
  ON public.requests (trip_id, status, created_at DESC);

-- Fast lookup of in-flight active negotiations
CREATE INDEX IF NOT EXISTS idx_requests_active_flow
  ON public.requests (status, created_at DESC)
  WHERE status IN ('pending', 'accepted');


-- ============================================================================
-- 6. DELIVERIES & PAYMENTS (TRANSACTION AUDIT & TRACKING)
-- ============================================================================

-- Fast verification of delivery status & handoff state
CREATE INDEX IF NOT EXISTS idx_deliveries_status_handoff
  ON public.deliveries (status, pickup_confirmed, delivery_confirmed);

-- User payment transaction history lookups
CREATE INDEX IF NOT EXISTS idx_payments_sender_history
  ON public.payments (sender_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_traveller_history
  ON public.payments (traveller_id, status, created_at DESC);


-- ============================================================================
-- 7. NOTIFICATIONS & OUTBOX WORKER HIGH-THROUGHPUT INDEXES
-- ============================================================================

-- Partial index for background worker sweeps (FOR UPDATE SKIP LOCKED)
CREATE INDEX IF NOT EXISTS idx_outbox_events_pending_sweep
  ON public.outbox_events (available_at, created_at)
  WHERE status = 'pending';

-- Instant unread notifications badge count
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread_badge
  ON public.notifications (user_id, created_at DESC)
  WHERE read = false;


-- ============================================================================
-- 8. USER PROFILES & SEARCH DISCOVERY
-- ============================================================================

-- Trigram GIN indexes for fast user search and autocomplete
CREATE INDEX IF NOT EXISTS idx_user_profiles_username_trgm
  ON public.user_profiles USING GIN (username gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_user_profiles_full_name_trgm
  ON public.user_profiles USING GIN (full_name gin_trgm_ops);

-- Active unbanned users lookup
CREATE INDEX IF NOT EXISTS idx_user_profiles_active_status
  ON public.user_profiles (status, created_at DESC)
  WHERE is_deleted = false;


-- ============================================================================
-- 9. RATE LIMIT TABLES CONCURRENCY INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_user_action_attempted
  ON public.api_rate_limits (user_id, action, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_email_attempt_time
  ON public.auth_rate_limits (email, attempt_type, attempted_at DESC);
