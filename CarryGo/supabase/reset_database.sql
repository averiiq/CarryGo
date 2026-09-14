-- CarryGo Production Launch Database Reset Script
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/nuxvuejtnobljutznlss/sql

BEGIN;

-- 1. Wipe all operational and dependent application tables
TRUNCATE TABLE
  public.notification_deliveries,
  public.user_devices,
  public.notifications,
  public.messages,
  public.conversations,
  public.deliveries,
  public.payments,
  public.ratings,
  public.requests,
  public.parcels,
  public.trips,
  public.route_subscriptions,
  public.kyc_documents,
  public.kyc_review_history,
  public.kyc_sessions,
  public.support_tickets,
  public.audit_events,
  public.outbox_events,
  public.razorpay_orders,
  public.cms_login_rate_limits
CASCADE;

-- 2. Remove all test user profiles except admins and reviewer (Option B)
DELETE FROM public.user_profiles
WHERE email NOT IN ('admin@carrygo.com', 'vermajatin477@gmail.com', 'carrygo.reviewer@gmail.com');

-- 3. Remove all test auth accounts except admins and reviewer (Option B)
DELETE FROM auth.users
WHERE email NOT IN ('admin@carrygo.com', 'vermajatin477@gmail.com', 'carrygo.reviewer@gmail.com');

COMMIT;
