# CarryGo Notification System — Comprehensive Codebase Audit

**Date:** September 22, 2026  
**Status:** Audit Complete  
**Scope:** Mobile App (`CarryGo/`), Admin CMS (`carrygo-cms/`), Backend (`backend/`), Database & Serverless (`CarryGo/supabase/`)

---

## 1. Executive Summary

A comprehensive architectural audit was conducted across the entire CarryGo monorepo to assess the current notification infrastructure against production-grade peer-to-peer marketplace requirements.

While foundational building blocks exist (such as basic in-app notifications, Supabase Realtime listeners, `user_devices` push token storage, and an outbox table), the current notification system has significant gaps:
- It lacks centralized event routing and taxonomy.
- It lacks city-based matching broadcasts with relevance filtering and spam controls.
- It lacks trip/parcel modification notifications (e.g., when a traveler changes date, time, or destination).
- Payment lifecycle events (initiated, locked, released, refunded) do not reliably trigger push or in-app notifications.
- The Admin Panel (`carrygo-cms`) has zero broadcast or marketing notification tooling.
- Users have no notification preference controls.
- Deep links are only partially mapped and lack strict payload verification.
- Deduplication and rate-limiting are absent for notification generation.

---

## 2. Component-by-Component Audit

### 2.1 Mobile Application (`CarryGo/`)
- **Framework:** Expo SDK 53, React Native 0.79.6, React 19, Expo Router 5.1.
- **Push Library:** `expo-notifications` (`~0.31.2`).
- **Push Registration:**
  - `CarryGo/services/notifications.service.ts`: Calls `Notifications.getExpoPushTokenAsync({ projectId: '85ee60ab-6a6a-4f2e-9688-9fbd4dabca3b' })`.
  - Saves token via RPC `upsert_user_device` and updates `user_profiles.push_token`.
  - Configures Android channels: `default`, `deliveries`, `payments`.
- **In-App Notification Center:**
  - `CarryGo/components/feature/NotificationPanel.tsx`: A slide-over modal that displays grouped notifications (by `chat_message` or `relatedId`).
  - Supports marking individual or grouped notifications as read via `markNotificationRead` / `markNotificationsRead`.
  - Supports swipe-to-mark actions using Reanimated Swipeable.
- **State Management:**
  - `CarryGo/hooks/useNotifications.ts`: React Query (`['notifications', user.id]`) + Supabase Realtime subscription on `notifications` table (`postgres_changes`).
  - App state listener refreshes notifications on app foregrounding.
- **Deep Linking:**
  - Handled in `useNotifications.ts` via `handleNotificationRoute`.
  - Supported routes in `getDeepLinkRoute`: `/(tabs)/requests`, `/(tabs)/messages`, `/chat/[id]`, `/subscriptions`, `/delivery/[id]`, `/(tabs)/profile`.
  - Missing deep links for trips (`/trip/[id]`), parcels (`/parcel/[id]`), payments, admin announcements, and app updates.
- **User Preferences:**
  - None exist. Users cannot toggle notification categories (Matching, Chat, Payment, Trip Updates, Promotions).

### 2.2 Admin CMS (`carrygo-cms/`)
- **Framework:** Next.js 16.2 (App Router), React 19, Tailwind CSS 4.
- **Auth:** Supabase Auth + `requireAdmin()` check (enforcing `system_role = 'admin'`).
- **Existing Dashboard Sections:**
  - Overview (`/dashboard`), Analytics (`/dashboard/analytics`), Trips, Parcels, Payments, Users, KYC, Disputes, Support, Bulk Ops, Audit Log, Settings.
- **Notification Functionality:**
  - **Completely Missing.** No notification manager, no broadcast sender, no campaign composer, and no audience filter UI.

### 2.3 Backend & Serverless (`backend/` & `CarryGo/supabase/`)
- **Database:** Supabase PostgreSQL 15.
- **Database Models:**
  1. `public.notifications`:
     - Fields: `id`, `user_id`, `title`, `body`, `type` (enum `notification_type`), `related_id`, `read`, `created_at`.
     - Deficiencies: Missing `category`, `image_url`, `deep_link`, `entity_type`, `entity_id`, `data` (jsonb), `priority`, `read_at`, `expires_at`, `metadata`.
  2. `public.user_devices`:
     - Fields: `id`, `user_id`, `device_key`, `expo_push_token`, `platform`, `app_version`, `failure_count`, `invalidated_at`, `last_seen_at`, `created_at`, `updated_at`.
     - Supports multi-device tracking and invalid token cleanup.
  3. `public.notification_deliveries`:
     - Fields: `id`, `notification_id`, `user_device_id`, `expo_ticket_id`, `expo_receipt_id`, `status` ('pending', 'ticketed', 'delivered', 'failed', 'invalid_token'), `attempt_count`, `last_error`, `sent_at`, `delivered_at`, `checked_at`.
  4. `public.outbox_events`:
     - Fields: `id`, `topic`, `entity_type`, `entity_id`, `payload`, `status`, `attempt_count`, `available_at`, `processed_at`, `created_at`, `max_attempts`, `last_error`.
- **Edge Functions:**
  - `send-push-notifications`: Sends Expo push notifications via `https://exp.host/--/api/v2/push/send` for a given notification record to all valid devices in `user_devices`. Records delivery ticket in `notification_deliveries`.
  - `process-push-receipts`: Checks receipt tickets and flags invalid tokens (`DeviceNotRegistered`).
  - `process-outbox`: Calls RPC `process_outbox_events()`.
- **Database Functions & Triggers:**
  - `emit_domain_event`: Emits domain event into `audit_events` and `outbox_events`.
  - `process_outbox_events`: Reads pending `outbox_events` (with `FOR UPDATE SKIP LOCKED`) and inserts into `public.notifications`.
  - Currently handles only: `request.created`, `request.accepted`, `request.rejected`, `request.cancelled`, `request.completed`, `delivery.picked_up`, `delivery.completed`, `rating.submitted`, `chat.message`.
  - Missing from `process_outbox_events`: `route.match`, `trip.created`, `trip.updated`, `trip.cancelled`, `parcel.created`, `parcel.updated`, `parcel.cancelled`, `payment.initiated`, `payment.success`, `payment.failed`, `payment.refunded`, `payment.released`, `admin.broadcast`, `promo.alert`, `system.alert`.

---

## 3. Detailed Gap & Problem Analysis

| Area | Current Implementation | Problem / Missing Requirement |
|---|---|---|
| **Notification Schema** | Basic columns only (`title`, `body`, `type`, `read`, `related_id`). | Missing `category`, `image_url`, `deep_link`, `priority`, `data`, `read_at`, `expires_at`. |
| **Notification Taxonomy** | 8 basic types in Postgres enum (`new_request`, `request_accepted`, `request_rejected`, `delivery_otp`, `rating`, `general`, `route_match`, `chat_message`). | Inadequate for trip lifecycle, parcel lifecycle, payment lifecycle, city matching, admin broadcasts, and promotions. |
| **Trip/Parcel Updates** | `set_trip_status` and `set_parcel_status` only change row status. | No notifications to matched/requesting senders when a traveler changes destination, pickup location, schedule, or cancels a trip. |
| **City-Based Matching** | Only exact route string match in `notify_route_subscribers`. | Senders and travelers in home cities do not receive smart proximity notifications; no rate limiting or anti-spam cooldowns. |
| **Payment Events** | Local notification helpers exist in client code, but are not triggered by real backend payment state changes. | Edge functions `verify-razorpay-payment`, `razorpay-webhook`, and RPCs `finalize_razorpay_payment`, `release_payment_atomic`, `refund_payment_atomic` do not emit outbox events. |
| **In-App Messaging** | `send_chat_message_command` emits `chat.message` outbox event. | No check to suppress push notification if recipient is actively inside that chat conversation. |
| **Admin Broadcasts** | None. | No UI in `carrygo-cms` to compose notifications, select audience (by city, role, all), schedule, or view broadcast analytics. |
| **User Preferences** | None. | Users cannot control push notification settings for marketing, trips, chat, or payments. |
| **Deduplication** | Idempotency only on message ID in `backend/` stub. | In Postgres, identical events can insert duplicate notifications if fired concurrently. |
| **Delivery Trigger** | `send-push-notifications` Edge Function exists, but must be called explicitly or via cron/webhook. | When a notification is created in DB, push delivery is not automatically dispatched. |

---

## 4. Proposed Target Architecture

```text
                                  Event Sources
        [Trip / Parcel Actions]  [Payment Webhook / RPC]  [Chat RPC]  [Admin CMS]
                                       │
                                       ▼
                       emit_domain_event (Audit + Outbox)
                                       │
                                       ▼
                        Central Notification Engine (DB RPC)
              ┌────────────────────────┼────────────────────────┐
              ▼                        ▼                        ▼
       Audience Resolver      Preference Filter       Deduplication Guard
       (City/Role/Match)      (User Preferences)      (Idempotency Key)
                                       │
                                       ▼
                             public.notifications
                         (Rich Schema + Realtime sync)
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
        Mobile In-App Realtime             Async Push Delivery Trigger
        (Notification Center UI)           (Edge Function / Dispatcher)
                                                          │
                                                          ▼
                                                  user_devices (Expo/FCM)
                                                          │
                                                          ▼
                                                Expo Push Notification API
                                                          │
                                                          ▼
                                                  User Mobile Device
```

### 4.1 Key Architecture Principles
1. **Centralized Server-Side Processing:** All notification determination is server-side via trusted Postgres functions, triggers, and edge functions. Clients never insert arbitrary notifications for other users.
2. **Backward Compatibility:** Maintain existing table columns (`read`, `related_id`, `type`) while expanding the schema with rich fields (`category`, `deep_link`, `priority`, `data`, `is_read`, `read_at`, `expires_at`).
3. **Smart Relevance & Anti-Spam:** City-based and match notifications enforce a 24-hour deduplication window and frequency capping so users are never spammed.
4. **Preference Enforcement:** Every non-critical notification checks the recipient's `user_notification_preferences` before inserting or sending push.
5. **Admin Broadcaster:** A dedicated CMS module (`/dashboard/notifications`) allows system administrators to compose broadcasts, target audiences, and review analytics.
6. **Mobile In-App Center:** Enhanced `NotificationPanel` with rich categories, empty/loading states, timestamp formatting, deep linking, and preference settings screen.

---

## 5. Implementation Roadmap

1. **Database Schema Enhancements:**
   - Add columns to `notifications` (`category`, `deep_link`, `image_url`, `priority`, `data`, `read_at`, `expires_at`, `idempotency_key`).
   - Create `user_notification_preferences` table with defaults.
   - Create `admin_broadcasts` table with delivery statistics.
2. **Central Notification Engine & Event Handlers:**
   - Update `process_outbox_events()` to handle all 22+ event topics:
     - `trip.created`, `trip.updated`, `trip.cancelled`
     - `parcel.created`, `parcel.updated`, `parcel.cancelled`
     - `payment.initiated`, `payment.success`, `payment.failed`, `payment.refunded`, `payment.released`
     - `match.route_found`, `match.city_activity`
     - `admin.broadcast`, `system.alert`, `promo.offer`
   - Update `set_trip_status`, `set_parcel_status`, `finalize_razorpay_payment`, `release_payment_atomic`, and `refund_payment_atomic` to emit domain events.
   - Add push dispatcher trigger/hook on `notifications` table to invoke `send-push-notifications`.
3. **Mobile App (`CarryGo/`) Integration:**
   - Centralize notification types and deep-link router in `notifications.service.ts`.
   - Update `useNotifications.ts` to support rich categories, preferences, and deep navigation.
   - Upgrade `NotificationPanel.tsx` UI with categorized badges, relative times, and empty states.
   - Create `app/notification-settings.tsx` screen for user preference management.
   - Link notification settings from `app/(tabs)/profile.tsx`.
   - Handle active chat suppression (don't push or sound if user is actively in that conversation).
4. **Admin Panel (`carrygo-cms/`) Integration:**
   - Create `/dashboard/notifications` page in `carrygo-cms`.
   - Add audience filtering: All Users, All Travelers, All Senders, Specific City, Custom Users.
   - Server action to insert broadcast event and dispatch notifications.
   - Add "Notifications" link to CMS Sidebar.
5. **Verification & Testing:**
   - End-to-end automated scripts to verify:
     - Outbox processing for all lifecycle events.
     - User preferences filtering.
     - Deduplication via idempotency keys.
     - Admin broadcast targeting and delivery.
     - Deep link payload structure.
