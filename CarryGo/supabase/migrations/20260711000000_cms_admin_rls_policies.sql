-- Grant admin read/write access to all tables the CMS needs.
-- This migration adds RLS policies so admin users can query all data
-- via the anon key + authenticated session (alternative to service_role key).
--
-- The get_system_role() security-definer function was created in
-- 20260610000000_cms_roles_and_support.sql

-- ═══════════════════════════════════════════
-- TRIPS
-- ═══════════════════════════════════════════
CREATE POLICY "trips_select_admin" ON public.trips
  FOR SELECT TO authenticated
  USING (public.get_system_role() IN ('admin', 'support_agent'));

CREATE POLICY "trips_update_admin" ON public.trips
  FOR UPDATE TO authenticated
  USING (public.get_system_role() = 'admin')
  WITH CHECK (public.get_system_role() = 'admin');

-- ═══════════════════════════════════════════
-- PARCELS
-- ═══════════════════════════════════════════
CREATE POLICY "parcels_select_admin" ON public.parcels
  FOR SELECT TO authenticated
  USING (public.get_system_role() IN ('admin', 'support_agent'));

CREATE POLICY "parcels_update_admin" ON public.parcels
  FOR UPDATE TO authenticated
  USING (public.get_system_role() = 'admin')
  WITH CHECK (public.get_system_role() = 'admin');

-- ═══════════════════════════════════════════
-- REQUESTS
-- ═══════════════════════════════════════════
CREATE POLICY "requests_select_admin" ON public.requests
  FOR SELECT TO authenticated
  USING (public.get_system_role() IN ('admin', 'support_agent'));

CREATE POLICY "requests_update_admin" ON public.requests
  FOR UPDATE TO authenticated
  USING (public.get_system_role() = 'admin')
  WITH CHECK (public.get_system_role() = 'admin');

-- ═══════════════════════════════════════════
-- PAYMENTS
-- ═══════════════════════════════════════════
CREATE POLICY "payments_select_admin" ON public.payments
  FOR SELECT TO authenticated
  USING (public.get_system_role() IN ('admin', 'support_agent'));

CREATE POLICY "payments_update_admin" ON public.payments
  FOR UPDATE TO authenticated
  USING (public.get_system_role() = 'admin')
  WITH CHECK (public.get_system_role() = 'admin');

-- ═══════════════════════════════════════════
-- KYC SESSIONS
-- ═══════════════════════════════════════════
CREATE POLICY "kyc_sessions_select_admin" ON public.kyc_sessions
  FOR SELECT TO authenticated
  USING (public.get_system_role() IN ('admin', 'support_agent'));

CREATE POLICY "kyc_sessions_update_admin" ON public.kyc_sessions
  FOR UPDATE TO authenticated
  USING (public.get_system_role() = 'admin')
  WITH CHECK (public.get_system_role() = 'admin');

-- ═══════════════════════════════════════════
-- KYC DOCUMENTS
-- ═══════════════════════════════════════════
CREATE POLICY "kyc_documents_select_admin" ON public.kyc_documents
  FOR SELECT TO authenticated
  USING (public.get_system_role() IN ('admin', 'support_agent'));

-- ═══════════════════════════════════════════
-- KYC REVIEW HISTORY
-- ═══════════════════════════════════════════
CREATE POLICY "kyc_review_history_select_admin" ON public.kyc_review_history
  FOR SELECT TO authenticated
  USING (public.get_system_role() IN ('admin', 'support_agent'));

CREATE POLICY "kyc_review_history_insert_admin" ON public.kyc_review_history
  FOR INSERT TO authenticated
  WITH CHECK (public.get_system_role() = 'admin');

-- ═══════════════════════════════════════════
-- DELIVERIES
-- ═══════════════════════════════════════════
CREATE POLICY "deliveries_select_admin" ON public.deliveries
  FOR SELECT TO authenticated
  USING (public.get_system_role() IN ('admin', 'support_agent'));

-- ═══════════════════════════════════════════
-- NOTIFICATIONS
-- ═══════════════════════════════════════════
CREATE POLICY "notifications_select_admin" ON public.notifications
  FOR SELECT TO authenticated
  USING (public.get_system_role() IN ('admin', 'support_agent'));

-- ═══════════════════════════════════════════
-- RATINGS
-- ═══════════════════════════════════════════
CREATE POLICY "ratings_select_admin" ON public.ratings
  FOR SELECT TO authenticated
  USING (public.get_system_role() IN ('admin', 'support_agent'));

-- ═══════════════════════════════════════════
-- AUDIT EVENTS (override the deny-all policy for admin)
-- ═══════════════════════════════════════════
CREATE POLICY "audit_events_select_admin" ON public.audit_events
  FOR SELECT TO authenticated
  USING (public.get_system_role() = 'admin');

-- ═══════════════════════════════════════════
-- CONVERSATIONS & MESSAGES
-- ═══════════════════════════════════════════
CREATE POLICY "conversations_select_admin" ON public.conversations
  FOR SELECT TO authenticated
  USING (public.get_system_role() IN ('admin', 'support_agent'));

CREATE POLICY "messages_select_admin" ON public.messages
  FOR SELECT TO authenticated
  USING (public.get_system_role() IN ('admin', 'support_agent'));
