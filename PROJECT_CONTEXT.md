yes# Project Context

## Project Overview




**CarryGo** is a peer-to-peer parcel delivery marketplace that connects **senders** (people who need parcels delivered) with **travellers** (people already making trips who can carry parcels along their route). The platform operates in India, focusing on intercity delivery via existing travellers.

**Business Model**: Senders post parcels, travellers post trips. The platform matches them via route/date/capacity scoring, facilitates communication, handles escrow payments (Razorpay), and ensures trust via KYC verification and ratings.

**Core Flow**: Create Trip/Parcel → Smart Matching → Send/Accept Request → Payment Escrow Lock → Delivery Tracking (OTP) → Payment Release → Ratings

**User Types**:
- **Sender**: Posts parcels, searches for travellers, pays for delivery
- **Traveller**: Posts trips, accepts delivery requests, earns money
- **Admin/Moderator**: Manages platform via CMS (KYC review, disputes, user management)

---

## Tech Stack

### Mobile App (CarryGo/)
| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 53 (React Native 0.79.6, React 19) |
| Language | TypeScript 5.8.3 (strict mode) |
| Routing | Expo Router 5.1 (file-based) |
| State (server) | TanStack React Query 5.101 |
| State (client) | React Context (Auth, Theme) |
| Database | Supabase PostgreSQL + RLS |
| Authentication | Supabase Auth (OTP, magic links) |
| Payments | Razorpay (react-native-razorpay) |
| Storage | Cloudinary (images), AWS S3 (KYC docs) |
| Push Notifications | Expo Notifications + Supabase Edge Functions |
| Animations | React Native Reanimated 3.17 |
| Lists | Shopify FlashList 1.7 |
| Maps | react-native-maps 1.20 |
| Package Manager | pnpm 10.11.0 |

### CMS Dashboard (carrygo-cms/)
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2 (App Router, React 19.2) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + CSS variables |
| Database | Supabase (same instance as mobile) |
| Auth | Supabase Auth (email/password) + role checks |
| Animations | Framer Motion |
| Charts | Recharts |
| Icons | Lucide React |

---

## Architecture

### Mobile App Architecture
```
UI Layer (Screens/Components)
    ↓ uses
Hooks Layer (React Query mutations/queries, custom hooks)
    ↓ calls
Services Layer (pure data access, returns {data, error} tuples)
    ↓ communicates with
Supabase (PostgreSQL + RLS + Edge Functions + Realtime)
```

**Key Patterns**:
- Service-oriented: All data access through services returning `{ data, error }`
- Immutable updates: New objects returned, never in-place mutation
- Optimistic updates: React Query cache updated before server confirmation
- Realtime subscriptions: Supabase Postgres channels (city-filtered)
- Rate limiting: Client-side (AsyncStorage) + server-side (Supabase RPC)
- Feature flags: Compile-time gates with env var overrides
- Domain commands: Critical state transitions via PostgreSQL security-definer functions
- Event sourcing: `audit_events` + `outbox_events` for async notification delivery

### CMS Architecture
```
Server Components (data fetching + rendering)
    ↓ uses
Server Actions (mutations with revalidatePath)
    ↓ calls
Supabase (service-role client, bypasses RLS)
    ↑ guarded by
requireAdmin() (auth + role verification)
```

---

## Folder Structure

### Root Monorepo
```
CarryGo-finall/
├── CarryGo/              # React Native mobile app (Expo)
├── carrygo-cms/          # Next.js admin dashboard
└── project.md            # Codebase audit report
```

### Mobile App (CarryGo/)
```
CarryGo/
├── app/                  # Expo Router file-based routes
│   ├── (tabs)/           # Bottom tab navigation (Home, Requests, Messages, Profile)
│   │   ├── index.tsx     # Home feed (447 lines) - infinite scroll, filters, realtime
│   │   ├── requests.tsx  # Request management (408 lines)
│   │   ├── messages.tsx  # Conversations list (309 lines)
│   │   └── profile.tsx   # User profile (526 lines)
│   ├── chat/[id].tsx     # Conversation screen
│   ├── delivery/[id].tsx # Delivery tracking (705 lines - needs splitting)
│   ├── trip/[id].tsx     # Trip detail screen
│   ├── parcel/[id].tsx   # Parcel detail screen
│   ├── payment/[id].tsx  # Payment screen
│   ├── create-trip.tsx   # Trip creation form (420 lines)
│   ├── create-parcel.tsx # Parcel creation form (432 lines)
│   ├── matching.tsx      # Smart match results (525 lines)
│   ├── search.tsx        # City/route search
│   ├── kyc.tsx           # KYC verification flow
│   ├── my-activity.tsx   # User activity history (731 lines - largest file)
│   ├── transactions.tsx  # Payment history
│   ├── subscriptions.tsx # Route subscriptions
│   ├── login.tsx         # OTP login (644 lines - needs splitting)
│   ├── onboarding.tsx    # First-time onboarding
│   ├── profile-setup.tsx # Profile completion
│   └── edit-profile.tsx  # Profile editing
├── components/
│   ├── ui/               # Reusable UI (Button, Card, Input, Skeleton, AsyncStateCard, etc.)
│   └── feature/          # Feature components (TripCard, ParcelCard, MatchResult, etc.)
├── services/             # Data access layer (18 service files, 3,446 lines total)
├── hooks/                # Custom hooks (18 hooks)
├── features/             # Feature-specific query logic (listings, requests, conversations)
├── contexts/             # React contexts (Auth, Theme)
├── lib/                  # Utilities (rate-limiter, validation, monitoring, query client, etc.)
├── constants/            # Theme tokens, feature flags, cities, error messages, security
├── types/                # TypeScript types (domain + generated Supabase types)
├── styles/               # Shared stylesheet utilities
├── supabase/
│   └── migrations/       # 20 SQL migration files (schema, RLS, RPCs)
├── __tests__/            # Jest tests
├── scripts/              # Verification scripts (RLS, domain commands, realtime)
└── assets/               # Images, fonts
```

### CMS Dashboard (carrygo-cms/)
```
carrygo-cms/
├── app/
│   ├── page.tsx              # Landing page
│   ├── login/                # Admin login (rate-limited)
│   ├── unauthorized/         # Access denied page
│   └── dashboard/
│       ├── page.tsx          # Overview (metrics, charts, activity, system health)
│       ├── analytics/        # Revenue, funnels, growth charts, CSV export
│       ├── users/            # User list, ban/activate
│       ├── kyc/              # KYC queue + review (with [id] detail, DocumentViewer, ReviewPanel)
│       ├── trips/            # Trip management
│       ├── parcels/          # Parcel management
│       ├── payments/         # Payment monitoring
│       ├── disputes/         # Dispute resolution
│       ├── support/          # Support tickets
│       ├── audit/            # Admin action log
│       ├── bulk/             # Bulk operations / CSV export
│       └── settings/         # Platform settings (scaffolded)
├── components/               # Sidebar, Header, CommandPalette, DataTable, Charts
├── utils/
│   ├── supabase/             # Server + admin Supabase clients
│   └── admin-guard.ts        # Authorization middleware (returns service-role client)
├── lib/
│   ├── rate-limit.ts         # In-memory rate limiter (lost on cold start)
│   ├── validation.ts         # UUID + text sanitization
│   └── cdn-url.ts            # CloudFront signed URLs
└── middleware.ts             # Security headers, session refresh, rate limiting
```

---

## Database Schema (Complete)

### Enums
```sql
kyc_status: 'pending' | 'submitted' | 'approved' | 'rejected'
vehicle_type: 'bike' | 'car' | 'bus' | 'train' | 'flight'
trip_status: 'active' | 'completed' | 'cancelled'
parcel_category: 'documents' | 'electronics' | 'clothing' | 'food' | 'medicine' | 'other'
parcel_status: 'open' | 'matched' | 'in_transit' | 'delivered' | 'failed'
request_status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed' | 'failed'
delivery_status: 'awaiting_pickup' | 'picked_up' | 'in_transit' | 'delivered' | 'failed'
payment_status: 'locked' | 'released' | 'refunded'
notification_type: 'new_request' | 'request_accepted' | 'request_rejected' | 'delivery_otp' | 'rating' | 'general' | 'route_match' | 'chat_message'
user_role: 'sender' | 'traveller' | 'both'
system_role: 'user' | 'support_agent' | 'admin'
account_status: 'active' | 'banned'
```

### Core Tables (All Columns)

| Table | Key Columns | Notes |
|-------|-------------|-------|
| `user_profiles` | id (uuid FK auth.users), email, username (unique, `^[a-z0-9_]{3,24}$`), full_name, phone (E.164), rating (0-5), total_deliveries, total_trips, verified, push_token, kyc_status, role, system_role, status, profile_completed_at | Denormalized rating; CHECK constraints on username/phone format |
| `trips` | id, user_id, user_name, user_rating (denormalized), from_city, to_city, date, time, vehicle_type, available_capacity (>0), price_per_kg (>=0), status | CHECK: from_city <> to_city |
| `parcels` | id, user_id, user_name, from_city, to_city, category, description, weight (>0), price_offer (>=0), image_url, status, delivery_date | CHECK: from_city <> to_city |
| `requests` | id, parcel_id, trip_id, sender_id, sender_name, traveller_id, traveller_name, status, price (>=0), message | UNIQUE(parcel_id, trip_id); CHECK: sender_id <> traveller_id |
| `deliveries` | id, request_id (unique), otp_hash (bcrypt), otp_attempt_count (>=0), otp_locked_until, pickup_confirmed, pickup_confirmed_at, delivery_confirmed, delivery_confirmed_at, traveller_lat, traveller_lng, location_updated_at, status | Function-only INSERT |
| `payments` | id, request_id (unique), sender_id, traveller_id, amount (>=0), status, locked_at, released_at, razorpay_order_id, razorpay_payment_id | Atomic release/refund via RPC |
| `conversations` | id, request_id (unique), participant_ids (uuid[]), participant_names (jsonb), route, parcel_description, last_message_text, last_message_sender_id, last_message_at, last_message_read | Denormalized last_message for list perf |
| `messages` | id, conversation_id, sender_id, sender_name, text, read | FK cascade on conversation delete |
| `ratings` | id, from_user_id, to_user_id, request_id, rating (1-5), comment | UNIQUE(from_user_id, request_id); CHECK: from <> to |
| `notifications` | id, user_id, title, body, type (enum), related_id, read | |
| `route_subscriptions` | id, user_id, from_city, to_city, active | UNIQUE(user_id, from_city, to_city); CHECK: from <> to |
| `kyc_sessions` | id, user_id, full_name, id_type, provider, provider_session_id, status, selfie_url, address_proof_url, id_back_url, reviewed_by, reviewed_at, rejection_reason, reviewer_notes, submission_attempt | |
| `kyc_documents` | id, session_id, document_type (id_front/id_back/selfie/address_proof), storage_path, file_size_bytes, mime_type, uploaded_at | UNIQUE(session_id, document_type) |
| `kyc_review_history` | id, session_id, reviewer_id, action, reason, notes, created_at | Admin audit trail |
| `support_tickets` | id, user_id, subject, description, status, assigned_to | assigned_to SET NULL on admin delete |
| `user_devices` | id, user_id, device_key, expo_push_token, platform, app_version, failure_count, invalidated_at, last_seen_at | UNIQUE(user_id, device_key); function-only access |
| `notification_deliveries` | id, notification_id, user_device_id, expo_ticket_id, expo_receipt_id, status, attempt_count, last_error, sent_at, delivered_at, checked_at | Server-only (deny-all RLS) |
| `audit_events` | id, actor_id, entity_type, entity_id, event_type, payload (jsonb), created_at | Server-only; FK RESTRICT on user delete |
| `outbox_events` | id, topic, entity_type, entity_id, payload (jsonb), status, attempt_count, available_at, processed_at | Server-only; SKIP LOCKED processing |
| `auth_rate_limits` | id, email, attempt_type, attempted_at, success | Function-only access |
| `api_rate_limits` | id, user_id, action, attempted_at | Function-only access |

### RPC Functions (Domain Commands)

```sql
-- Request lifecycle
create_request_command(p_parcel_id, p_trip_id, p_price, p_message) → request row
  -- Validates: route match, capacity, authorization, no self-requests, rate limit
transition_request_status(p_request_id, p_next_status) → request row
  -- FOR UPDATE lock; auto-adjusts capacity on accept; auto-rejects siblings; auto-releases payment on complete

-- Delivery lifecycle
create_delivery(p_request_id) → delivery row (generates bcrypt OTP hash)
confirm_delivery_pickup(p_delivery_id) → delivery row
complete_delivery_command(p_delivery_id, p_otp) → delivery row
  -- Verifies OTP (5 attempts → 15min lockout), marks delivered, transitions request to completed

-- Rating
submit_rating_command(p_request_id, p_to_user_id, p_rating, p_comment) → rating row
  -- Updates user_profiles.rating via full AVG recalculation

-- Payments (atomic with FOR UPDATE lock)
release_payment_atomic(p_payment_id, p_actor_id) → boolean (traveller-only)
refund_payment_atomic(p_payment_id, p_actor_id) → boolean (sender-only)

-- Messaging
send_chat_message_command(p_conversation_id, p_text) → message row

-- Notifications
notify_route_subscribers(p_listing_type, p_listing_id, p_from_city, p_to_city, p_title, p_body) → count
upsert_user_device(p_device_key, p_expo_push_token, p_platform, p_app_version) → device_id

-- Event system
emit_domain_event(p_actor_id, p_entity_type, p_entity_id, p_event_type, p_topic, p_payload) → void
process_outbox_events(p_limit default 50) → processed_count

-- Rate limiting
check_auth_rate_limit(p_email, p_type) → boolean
record_auth_attempt(p_email, p_type, p_success) → void
check_api_rate_limit(p_user_id, p_action) → boolean
enforce_rate_limit(p_user_id, p_action) → void (raises exception if exceeded)

-- Utility
get_system_role() → system_role (security definer, avoids RLS recursion)
check_username_available(check_username, exclude_user_id) → boolean
increment_counter(p_user_id, p_column) → void
```

### Indexes (Performance-Critical)
- **Composite**: trips(status, from_city, to_city, created_at DESC), parcels(status, from_city, to_city, created_at DESC), requests(sender_id/traveller_id + status + created_at DESC), messages(conversation_id, created_at), notifications(user_id, read, created_at DESC)
- **Partial**: user_profiles(lower(username)) WHERE profile_completed_at IS NOT NULL, user_devices(expo_push_token) WHERE invalidated_at IS NULL
- **Missing indexes identified**: trips.date, parcels.delivery_date, deliveries.status, payments.status, outbox_events.topic

### RLS Policy Summary

| Table | SELECT | INSERT | UPDATE | DELETE | Security Notes |
|-------|--------|--------|--------|--------|----------------|
| user_profiles | Own + Admin | Own | Own + Admin | None | No delete policy (intentional) |
| trips | Active OR Own + Admin | Own | Own + Admin | None | |
| parcels | Open/Matched OR Own + Admin | Own | Own + Admin | None | |
| requests | Participant + Admin | Sender only | Participant + Admin | None | **UPDATE too broad - should be function-only** |
| deliveries | Participant + Admin | None (function-only) | Participant | None | **UPDATE too broad** |
| payments | Participant + Admin | Sender only | Participant | None | **UPDATE too broad - use atomic RPCs** |
| conversations | Participant | Participant | Participant | None | |
| messages | Participant (via conv) | Sender + Participant | Participant | None | **UPDATE allows text edit - should restrict** |
| notifications | Own + Admin | Own | Own | None | **INSERT should be server-only** |
| ratings | Involved + Admin | From user | None | None | **INSERT should be function-only** |
| route_subscriptions | Own | Own | Own | Own | Only table with DELETE policy |
| audit_events/outbox | Admin SELECT only | Deny all | Deny all | Deny all | Properly locked |
| rate limit tables | Deny all | Deny all | Deny all | Deny all | Function-only |

---

## Services Layer (Deep Audit)

### Authorization Status (CRITICAL)
| Service | Auth Check | Risk |
|---------|-----------|------|
| `payments.service.ts` | Server-side rate limit + RPC auth | LOW |
| `kyc.service.ts` | Session ownership verified | LOW |
| `storage.service.ts` | UUID validation + auth check | LOW |
| `deliveries.service.ts` | Feature flag + rate limit + RPC auth | LOW |
| `requests.service.ts` | Comprehensive validation (but client-side rate limit) | MEDIUM |
| `parcels.service.ts` | **NO ownership check in updateParcelStatus** | **HIGH** |
| `trips.service.ts` | **NO ownership check in updateTripStatus** | **HIGH** |
| `profile.service.ts` | **NO authorization in updateProfile** | **HIGH** |
| `conversations.service.ts` | **NO authorization in markMessagesRead** | **HIGH** |
| `location.service.ts` | **NO authorization in updateDeliveryLocation** | **HIGH** |
| `subscriptions.service.ts` | **NO authorization in delete/toggle** | **HIGH** |
| `notifications.service.ts` | **NO input validation in createNotification** | MEDIUM |

### Rate Limiting Coverage
| Service | Status | Notes |
|---------|--------|-------|
| `payments.service.ts` | Server-side enforced | Proper |
| `kyc.service.ts` | Server-side enforced | Proper |
| `deliveries.service.ts` | Server-side enforced | Proper |
| `requests.service.ts` | **Client-side only** (bypassable) | Needs server-side |
| `parcels.service.ts` | **NONE** | createParcel unprotected |
| `trips.service.ts` | **NONE** | createTrip unprotected |
| `conversations.service.ts` | **NONE** | sendMessage unprotected |
| `profile.service.ts` | **NONE** | completeProfile unprotected |
| `notifications.service.ts` | **NONE** | createNotification unprotected |
| `subscriptions.service.ts` | **NONE** | createSubscription unprotected |

### Service Quality Scores
| Service | Lines | Quality | Notes |
|---------|-------|---------|-------|
| `storage.service.ts` | 294 | EXCELLENT | Magic byte validation, retry logic, auth checks |
| `requests.service.ts` | 144 | EXCELLENT | Comprehensive validation, uses validation utilities |
| `payments.service.ts` | 136 | GOOD | Rate limiting, RPC auth, proper error handling |
| `smart-matching.service.ts` | 133 | EXCELLENT | Pure algorithm, well-structured scoring |
| `profile.service.ts` | 273 | FAIR | Good validation but missing auth check |
| `notifications.service.ts` | 270 | FAIR | Good push logic but missing input validation |
| `parcels.service.ts` | 84 | NEEDS FIX | Missing auth + rate limit |
| `trips.service.ts` | 76 | NEEDS FIX | Missing auth + rate limit |
| `haptics.service.ts` | 49 | EXCELLENT | Simple utility, proper try-catch |

---

## Frontend System (Deep Audit)

### Critical Screen Issues

| Screen | Lines | Issues |
|--------|-------|--------|
| `app/login.tsx` | 644 | Race condition in OTP auto-submit (lines 188-201); no rate limit on verification |
| `app/(tabs)/index.tsx` | 447 | Missing memoization for filter functions; filter state not in URL |
| `app/matching.tsx` | 525 | Uses `useMutation` for read operations (incorrect pattern); no error retry UI |
| `app/delivery/[id].tsx` | 705 | Location polling interval never cleared on error; OTP entry not accessible |
| `app/my-activity.tsx` | 731 | Largest file - needs component extraction |
| `app/(tabs)/requests.tsx` | 408 | Mutation errors swallowed silently (lines 117-123) |
| `app/(tabs)/profile.tsx` | 526 | Expensive breathing animation may cause jank on low-end devices |
| `app/create-trip.tsx` | 420 | Duplicate CityPicker logic with create-parcel |
| `app/create-parcel.tsx` | 432 | Duplicate CityPicker logic with create-trip |

### Hook Issues

| Hook | Issue | Severity |
|------|-------|----------|
| `useMatching.ts` | Uses `useMutation` for read operations - no caching, deduplication | HIGH |
| `useSmartSearch.ts` | Fetches 5x page size, filters client-side - wasteful | HIGH |
| `useRateLimiter.ts` | Interval never cleared on unmount during countdown | MEDIUM |
| `useRetryableAction.ts` | Only checks network errors, ignores 5xx status codes | MEDIUM |
| `useNotifications.ts` | Deep link parameters not validated - potential open redirect | MEDIUM |

### Realtime Subscription Issues
- **Missing cleanup flags**: `subscribe()` is async but cleanup runs immediately on unmount; potential channel leaks
- **Overly broad**: Listings subscription fires for all city changes, not scoped to active route
- **No error recovery**: If subscription drops, no automatic reconnection logic

### Accessibility Issues
1. OTP entry in delivery screen not keyboard/screen-reader accessible (hidden TextInput)
2. Tab icons missing `accessibilityLabel` (screen readers say "Tab 1, Tab 2")
3. Color-only status indicators (route dots) - colorblind users can't distinguish
4. No accessibility announcements for form validation errors

### Performance Concerns
1. Home feed `filterTrips`/`filterParcels` recompute on every render (missing memoization)
2. Matching screen `loadMatches` not memoized - potential infinite re-fetch loop
3. Profile breathing animation (continuous loop) drains battery
4. Smart search fetches 100 items to filter client-side (should be server-side)

---

## CMS Dashboard (Deep Audit)

### Critical Security Issues

| Issue | File | Severity | Impact |
|-------|------|----------|--------|
| In-memory rate limit lost on cold start | `lib/rate-limit.ts` | CRITICAL | Attackers bypass by waiting for restart |
| CSP allows `unsafe-inline` + `unsafe-eval` | `middleware.ts` line 21 | CRITICAL | XSS possible |
| Service-role client returned to all admin callers | `utils/admin-guard.ts` line 30 | CRITICAL | Any admin action bypasses RLS |
| IP from x-forwarded-for spoofable | `middleware.ts` lines 5-10 | HIGH | Rate limit bypass |
| CSV export no pagination (LIMIT 1000) | `analytics/actions.ts` line 53 | HIGH | DoS on large datasets |
| Document URL validation checks hostname only | `kyc/[id]/DocumentViewer.tsx` line 29 | HIGH | Attacker-controlled subdomain bypass |
| No CSV injection escaping | `analytics/actions.ts` | MEDIUM | Excel formula injection |
| No audit log for data exports | `analytics/actions.ts` | MEDIUM | Compliance gap |

### CMS Feature Status

| Feature | Status | Issues |
|---------|--------|--------|
| Overview Dashboard | Complete | Mock sparkline data (line 106) |
| Analytics | Complete | Hardcoded revenue split (0.82), dead code (routeCounts) |
| KYC Review | Complete | No document expiry check, no face matching |
| User Management | Complete | No pagination beyond 100 |
| Trips/Parcels/Payments | Complete | Read-only views, no admin actions |
| Disputes | Partial | Resolution action exists but limited |
| Support | Partial | Ticket management but no email notifications |
| Bulk Operations | Scaffolded | CSV export works, bulk actions not wired |
| Audit Log | Scaffolded | Table exists but no detail view |
| Settings | Scaffolded | UI shells only |
| Command Palette | Complete | Cmd+K navigation works |

---

## Lib Layer (Deep Audit)

### Quality Assessment

| File | Lines | Quality | Critical Issues |
|------|-------|---------|-----------------|
| `query/queryClient.ts` | ~50 | EXCELLENT | None - proper retry, error capture, offline-first |
| `query/queryKeys.ts` | ~80 | EXCELLENT | Hierarchical, type-safe, no versioning |
| `error-handler.ts` | ~180 | EXCELLENT | Custom AppError class, Supabase error mapping |
| `monitoring.ts` | ~110 | FAIR | Buffer never drains; sensitive data logging risk |
| `retry.ts` | ~45 | EXCELLENT | Proper jitter, 30s cap |
| `rate-limiter.ts` | ~145 | GOOD | Clean OOP, TTL cleanup, destroy() method |
| `server-rate-limit.ts` | ~35 | **BROKEN** | Returns `allowed: true` on RPC error (fail-open) |
| `validation.ts` | ~180 | GOOD | Typed results, comprehensive regex |
| `sanitize.ts` | ~50 | FAIR | LIKE escaping good; no XSS protection |
| `secure-storage.ts` | ~100 | GOOD | SecureStore + AsyncStorage separation |
| `imageOptimizer.ts` | ~90 | GOOD | Preset compression; no EXIF stripping |
| `price-utils.ts` | ~60 | GOOD | Pure calculations |
| `dateFormat.ts` | ~40 | GOOD | date-fns wrappers |

### Critical Lib Issues
1. **`server-rate-limit.ts`**: Fails open - returns `allowed: true` when RPC errors. Should fail closed.
2. **`monitoring.ts`**: Log buffer (100 entries) never shipped to any service. Dead code in production.
3. **`sanitize.ts`**: `sanitizeTextInput` only trims - no HTML entity encoding or XSS protection.
4. **`imageOptimizer.ts`**: No EXIF stripping - GPS data in photos leaks user location.

---

## Authentication & Authorization

### Mobile (OTP-based)
1. User enters phone/email → OTP sent via Supabase Auth
2. OTP verified → Session created (stored in Expo Secure Store)
3. Profile completion enforced (username, full name, phone)
4. Push notification token registered
5. Rate limited: 5 OTP sends/hour, 10 verify attempts/hour (via `auth_rate_limits`)

**Issues**:
- No client-side rate limit on OTP verification attempts
- OTP stored in plain text state (visible if app backgrounded)
- Auth timeout durations hardcoded in 3+ places (8s, 15s, 20s)

### CMS (Email/Password + Role)
1. Admin enters email/password on `/login`
2. Rate limited: 5 attempts per 5 minutes per IP+email (in-memory - lost on restart)
3. Supabase Auth validates credentials
4. `requireAdmin()` checks `user_profiles.system_role` (must be `admin` or `support_agent`)
5. Service-role client returned for admin operations (bypasses RLS)

**Issues**:
- In-memory rate limit lost on serverless cold start
- No account lockout after N failures
- No session fingerprinting
- TOCTOU: role checked once, not re-validated per query

---

## API Routes

All data access is via Supabase client (no custom REST API). Key operations:

### Mobile Services (18 files, 3,446 lines total)
| Service | Key Operations | Quality |
|---------|---------------|---------|
| `trips.service` | CRUD trips, update status, fetch by route/date | NEEDS FIX (no auth on update) |
| `parcels.service` | CRUD parcels, update status, fetch by route/date | NEEDS FIX (no auth on update) |
| `smart-matching.service` | Multi-factor scoring (route, date, capacity, price, rating) | EXCELLENT |
| `requests.service` | Create/update delivery requests, validation | EXCELLENT (but client-side rate limit) |
| `deliveries.service` | Create delivery (OTP), confirm pickup/delivery | GOOD |
| `payments.service` | Razorpay order, lock escrow, release/refund atomic | GOOD |
| `conversations.service` | Create conversations, send messages, mark read | FAIR (no auth on markRead) |
| `notifications.service` | Push registration, in-app notifications | FAIR (no validation on create) |
| `profile.service` | CRUD profile, completion check, avatar upload | FAIR (no auth on update) |
| `ratings.service` | Submit rating, fetch user ratings | GOOD |
| `kyc.service` | Create session, upload documents, submit | GOOD |
| `subscriptions.service` | Route subscription CRUD | NEEDS FIX (no auth on delete) |
| `price-estimator.service` | Dynamic pricing (route, weight, vehicle) | GOOD |
| `route-intelligence.service` | Route recommendations, saved routes, distance calc | GOOD |
| `storage.service` | Cloudinary/S3 upload, magic byte validation, retry | EXCELLENT |
| `location.service` | Geolocation, realtime location updates | NEEDS FIX (no auth) |
| `analytics.service` | User activity tracking | GOOD |
| `haptics.service` | Haptic feedback patterns | EXCELLENT |

---

## Features & Functionalities

### 1. Trip Management
- **Create Trip**: Route (origin/destination cities), departure date, vehicle type, available capacity, price per kg
- **View/Edit Trip**: Trip details, status management
- **Trip Feed**: Infinite scroll (FlashList), filters (route, date, vehicle), realtime updates
- **Issues**: No rate limit on creation; no auth check on status update

### 2. Parcel Management
- **Create Parcel**: Route, weight, category, dimensions, delivery date, price offer, description
- **View/Edit Parcel**: Parcel details, status management
- **Parcel Feed**: Infinite scroll, filters, realtime updates
- **Issues**: Same as trips - no rate limit, no auth on status update

### 3. Smart Matching
- **Algorithm**: Multi-factor scoring (route proximity, date overlap, capacity fit, price compatibility, traveller rating)
- **Scoring weights**: Route (30%), Date (25%), Capacity (20%), Price (15%), Rating (10%)
- **Results**: Ranked matches with score breakdown visualization
- **Issues**: `useMatching` hook uses `useMutation` for read operations (no caching)

### 4. Request System
- **Create**: Via `create_request_command` RPC (validates route match, capacity, no self-request)
- **Accept**: Via `transition_request_status` RPC (locks rows, adjusts capacity, auto-rejects siblings)
- **Status Flow**: pending → accepted → (delivery created) → completed | rejected | cancelled | failed
- **Issues**: Client-side rate limit only (bypassable)

### 5. Messaging
- **Per-Request Conversations**: One conversation per request (UNIQUE constraint)
- **Send**: Via `send_chat_message_command` RPC (validates participant, sanitizes text)
- **Realtime**: Supabase channel subscription per active conversation
- **Unread Badges**: Tab bar badge count via query
- **Issues**: No rate limit on sending; markRead has no auth check

### 6. Payments (Razorpay)
- **Escrow Flow**: Payment locked on acceptance → released on delivery confirmation
- **Razorpay Integration**: Order creation → checkout → signature verification (Edge Function)
- **Atomic Operations**: `release_payment_atomic` (traveller-only), `refund_payment_atomic` (sender-only)
- **FOR UPDATE lock**: Prevents race conditions on concurrent release/refund
- **Feature Flag**: `PAYMENTS_ENABLED` gate

### 7. Delivery Tracking
- **OTP Confirmation**: 6-digit OTP generated, bcrypt hashed in DB
- **Brute-force protection**: 5 attempts → 15-minute lockout
- **Pickup/Delivery Confirmation**: Both parties confirm via separate endpoints
- **Location Sharing**: Realtime lat/lng updates (feature-flagged)
- **Photo Proof**: Delivery photo capture
- **Issues**: Location polling interval never cleared on error; OTP entry not accessible

### 8. KYC Verification
- **Document Upload**: ID front/back, selfie, address proof
- **Storage**: S3 with presigned URLs, magic byte MIME validation
- **Session Management**: Track attempts, status transitions
- **CMS Review**: Admin approves/rejects with notes, full audit trail
- **Feature Flag**: `KYC_ENABLED` gate
- **Missing**: No AI/OCR validation, no face matching, no document expiry check

### 9. Ratings & Reviews
- **Post-Delivery**: 1-5 stars + optional comment
- **Via RPC**: `submit_rating_command` validates request completion and unique rating
- **User Rating**: Recalculated via full AVG on every new rating (no materialized view)
- **Trust Signal**: Used in smart matching algorithm

### 10. Route Subscriptions
- **Subscribe to Routes**: Get notified when matching trips/parcels are posted
- **Notification**: Via `notify_route_subscribers` RPC (checks active subscriptions for city pair)
- **Issues**: No auth on delete/toggle; no rate limit on creation

### 11. Search & Discovery
- **Smart Search**: Fuzzy city search with autocomplete
- **Issues**: Fetches 5x page size and filters client-side (should use server-side filtering)
- **Saved Routes**: Frequently used route pairs
- **Route Intelligence**: Recommendations based on history, distance calculations
- **Price Estimator**: Real-time pricing based on route/weight/vehicle/demand

### 12. Event System (Backend)
- **Audit Events**: Full event log (actor, entity, event_type, payload)
- **Outbox Events**: Transactional outbox for async notification delivery
- **Processing**: `process_outbox_events()` with FOR UPDATE SKIP LOCKED (no worker contention)
- **Issues**: No retry backoff; failed events stay in 'processing' state forever

---

## Design System

### Mobile Themes
- **Light Mode**: Clean whites, subtle shadows, indigo accent
- **Dark Mode**: Deep grays, elevated surfaces, indigo accent
- **Tokens**: `constants/theme.ts` (colors, spacing, borderRadius, shadows, gradients, motion)
- **Typography**: System fonts + Inter (Google Fonts)
- **Components**: Button, Card, Input, Badge, Skeleton, EmptyState, AsyncStateCard
- **Animations**: Spring-based with Reanimated (haptic feedback on interactions)
- **Issues**: Some hardcoded colors bypass theme system; breathing animation wasteful

### CMS Design
- **Style**: Light theme, bento-style cards, indigo primary, orange accent
- **Typography**: Space Grotesk (headings) + DM Sans (body)
- **Animations**: Framer Motion (sidebar, modals, command palette)
- **No UI Library**: Custom components, Tailwind CSS 4
- **CSS Variables**: Full token system in `globals.css`

---

## External Integrations

| Service | Purpose | Status | Issues |
|---------|---------|--------|--------|
| Supabase | Database, Auth, Realtime, Edge Functions | Active | Credentials were in git history (rotate!) |
| Razorpay | Payment processing (test mode) | Active (feature-flagged) | Edge Function for signature verification |
| Cloudinary | Image upload/optimization | Active | Used in storage.service.ts |
| AWS S3 | KYC document storage | Active | Presigned URLs, magic byte validation |
| Expo Notifications | Push notifications | Active | Multi-device token tracking |
| Google Maps (react-native-maps) | Route visualization, delivery tracking | Active | No spatial/GIS indexes in DB |

---

## Security Audit Summary

### CRITICAL Issues (Fix Before Production)
1. **Server rate limit fails open** (`lib/server-rate-limit.ts`): Returns `allowed: true` on RPC error
2. **CMS rate limit in-memory** (`carrygo-cms/lib/rate-limit.ts`): Lost on serverless cold start
3. **CMS CSP allows unsafe-eval/unsafe-inline** (`middleware.ts`): XSS vector
4. **Service-role client exposed broadly** (`utils/admin-guard.ts`): Any admin call bypasses all RLS
5. **Missing authorization in 6 services**: parcels, trips, profile, conversations, location, subscriptions can be modified by any authenticated user
6. **Supabase credentials in git history**: Need rotation + BFG purge
7. **RLS UPDATE policies too permissive** on requests/deliveries/payments: Should be function-only

### HIGH Issues
1. Client-side rate limiting in `requests.service.ts` (bypassable)
2. No rate limiting on trip/parcel/message creation
3. Document URL validation in CMS checks hostname pattern only (subdomain bypass)
4. CSV export has no Excel injection escaping
5. OTP verification has no client-side rate limit (brute-force 6-digit = 1M combos)
6. Deep link parameters not validated (open redirect potential)
7. IP spoofing via x-forwarded-for in CMS middleware
8. No EXIF stripping on image uploads (GPS data leaks location)

### MEDIUM Issues
1. Monitoring buffer never drains (dead code)
2. `sanitizeTextInput` has no XSS protection (only trims)
3. No DELETE RLS policies (GDPR Right to Erasure gap)
4. Denormalized user_name drifts after profile update
5. Messages UPDATE policy allows text editing (should be read-field only)
6. Notifications INSERT open to clients (should be server-only via outbox)
7. No audit logging for payment operations or admin data exports
8. Smart search fetches 5x page size client-side (bandwidth waste)

---

## Known Issues

### Mobile App
1. **Race condition in login auto-submit** (`login.tsx` lines 188-201): Concurrent OTP edits can trigger double-submit
2. **Matching hook misuses mutation** (`useMatching.ts`): Should be useQuery for caching/deduplication
3. **Location polling leak** (`delivery/[id].tsx` line 254): Interval never cleared on error
4. **Realtime subscription leaks**: No mounted-flag guards on async `.subscribe()`
5. **Missing memoization**: Home feed filters recompute every render
6. **Duplicate CityPicker**: Identical 87-line component in create-trip and create-parcel
7. **Silent mutation failures** (`requests.tsx` lines 117-123): Errors caught but not shown to user
8. **Missing error boundaries**: FlashList crashes = white screen of death
9. **Magic numbers**: Timeout/animation durations hardcoded across files

### CMS Dashboard
1. **Dead code**: `routeCounts` variable in analytics page built but never used
2. **Mock data**: Sparkline data hardcoded instead of real queries
3. **Hardcoded constants**: Revenue split (0.82), rate limit config, pagination limits
4. **No test infrastructure**: Zero tests of any kind
5. **Memory leak risk**: In-memory rate limit Map grows unboundedly

### Database
1. **Missing indexes**: trips.date, parcels.delivery_date, deliveries.status, payments.status, outbox_events.topic
2. **Rating recalculation**: Full AVG scan on every new rating (no materialized view)
3. **Outbox retry**: Failed events stuck in 'processing' forever (no backoff/dead-letter)
4. **City normalization**: No normalization on INSERT (case mismatch risk)
5. **Push token cleanup**: Invalidated tokens not auto-cleaned

---

## Technical Debt

### Priority 1 (Security - Must Fix)
1. ~~Fix `server-rate-limit.ts` to fail closed~~ DONE
2. ~~Replace CMS in-memory rate limit with Redis/DB-backed~~ HARDENED (max size cap + eviction, short windows)
3. ~~Remove `unsafe-eval`/`unsafe-inline` from CSP~~ DONE
4. ~~Add authorization checks to 6 services~~ DONE
5. ~~Replace client-side rate limiting with server-side in requests service~~ DONE
6. ~~Add server-side rate limiting to trip/parcel/message creation~~ DONE
7. Rotate Supabase credentials + purge from git history (REQUIRES MANUAL ACTION)

### Priority 2 (Correctness - High Impact)
1. ~~Convert `useMatching` from mutation to query pattern~~ DONE
2. ~~Fix login OTP auto-submit race condition~~ DONE
3. ~~Fix location polling interval leak~~ DONE
4. ~~Add mounted-flag guards to realtime subscriptions~~ DONE
5. ~~Add error boundaries around all FlashList instances~~ DONE
6. ~~Show mutation errors to users (requests accept/reject)~~ ALREADY HANDLED
7. ~~Tighten RLS: messages UPDATE → read-only~~ DONE (via migration)

### Priority 3 (Quality - Medium Impact)
1. ~~Split oversized files: my-activity (731), delivery/[id] (705), login (644)~~ DONE
2. ~~Extract duplicate CityPicker component~~ DONE
3. ~~Memoize home feed filter functions~~ ALREADY MEMOIZED
4. ~~Move smart search filtering to server-side~~ DONE
5. ~~Centralize timeout/animation constants~~ DONE
6. ~~Add EXIF stripping to image uploads~~ CONFIRMED (manipulateAsync strips it)
7. ~~Connect monitoring buffer~~ DONE (auto-flush + PII scrubbing)
8. ~~Add missing database indexes~~ DONE (6 indexes in migration)

### Priority 4 (Architecture - Long Term)
1. Add shared types package between mobile and CMS
2. Implement remote feature flags (replace compile-time)
3. ~~Add offline query persistence (AsyncStorage)~~ DONE
4. ~~Add outbox retry with exponential backoff + dead-letter queue~~ DONE
5. ~~Replace full AVG with materialized view for ratings~~ DONE
6. ~~Add test infrastructure to CMS (Vitest + Playwright)~~ DONE
7. ~~Add comprehensive unit tests for business logic (matching, pricing)~~ DONE (276 tests)
8. ~~Implement proper CSV escaping for exports~~ DONE
9. Add i18n support for error messages

---

## Positive Findings (Architecture Strengths)

1. **Domain command pattern**: All critical state transitions in security-definer PostgreSQL functions with FOR UPDATE locks
2. **Transactional outbox**: Reliable event emission without distributed transactions
3. **Consistent service envelope**: All 18 services return `{ data, error }` tuples uniformly
4. **SQL injection protection**: 100% parameterized queries via Supabase SDK
5. **Storage security**: Magic byte MIME validation, file size limits, retry with backoff
6. **Feature flag gating**: Graceful degradation with user-facing messages
7. **Centralized query keys**: Type-safe factory prevents cache collisions
8. **Offline-first query client**: `networkMode: 'offlineFirst'` with proper retry
9. **Multi-device push**: Per-device token tracking with invalidation state
10. **Event sourcing audit trail**: Full actor/entity/payload logging for compliance

---

## Change Log

### 2026-07-19

#### Fixed (36 files, 520 insertions, 151 deletions)

**CRITICAL Security Fixes:**
- `lib/server-rate-limit.ts`: Now fails closed (returns `allowed: false` on RPC error)
- `carrygo-cms/middleware.ts`: Removed `unsafe-eval`/`unsafe-inline` from CSP script-src; added IP spoofing documentation
- `carrygo-cms/lib/rate-limit.ts`: Added MAX_STORE_SIZE cap (10,000 entries), eviction on overflow, documented cold-start tradeoff
- `carrygo-cms/utils/admin-guard.ts`: Added account_status check (blocks banned admins), `logAdminAction()` helper
- `carrygo-cms/app/dashboard/kyc/[id]/DocumentViewer.tsx`: Tightened URL validation (strict endsWith, protocol check, env-based Supabase URL)
- `carrygo-cms/app/dashboard/analytics/actions.ts`: Added CSV cell sanitization (prevents Excel formula injection)

**Authorization Fixes (6 services):**
- `services/parcels.service.ts`: `updateParcelStatus` now verifies user_id ownership
- `services/trips.service.ts`: `updateTripStatus` now verifies user_id ownership
- `services/profile.service.ts`: `updateProfile` now verifies currentUserId === userId
- `services/conversations.service.ts`: `markMessagesRead` now verifies user is participant
- `services/location.service.ts`: `updateDeliveryLocation` now verifies user is traveller (via requests join)
- `services/subscriptions.service.ts`: `deleteSubscription`/`toggleSubscription` now verify ownership

**Rate Limiting Fixes (5 services):**
- `services/parcels.service.ts`: Added `enforceRateLimit` to `createParcel`
- `services/trips.service.ts`: Added `enforceRateLimit` to `createTrip`
- `services/conversations.service.ts`: Added `enforceRateLimit` to `sendMessage`
- `services/subscriptions.service.ts`: Added `enforceRateLimit` to `createSubscription`
- `services/requests.service.ts`: Replaced client-side rate limiting with server-side `enforceRateLimit`

**Input Validation:**
- `services/notifications.service.ts`: Added title/body length validation and trimming to `createNotification`

**Correctness Fixes:**
- `hooks/useMatching.ts`: Converted from `useMutation` to `useQuery` (proper caching, deduplication, stale-while-revalidate)
- `app/matching.tsx`: Updated to use new declarative `useMatchingTrips`/`useMatchingParcels` API
- `app/login.tsx`: Fixed OTP auto-submit race condition (re-checks current value before submitting)
- `app/delivery/[id].tsx`: Fixed location polling interval leak (cleared on error after 3 failures)
- `features/listings/queries.ts`: Added mounted-flag pattern to realtime subscription cleanup
- `features/conversations/queries.ts`: Added mounted-flag pattern to realtime subscription cleanup
- `hooks/useSmartSearch.ts`: Removed 5x over-fetch; now fetches exact page size with server-side offset

**Code Quality:**
- `lib/sanitize.ts`: Added `escapeHtml()` and `sanitizeForDisplay()` for XSS protection
- `lib/monitoring.ts`: Added PII scrubbing, auto-flush on buffer full, `flushLogs()` export
- `lib/imageOptimizer.ts`: Confirmed + documented that EXIF is stripped by `manipulateAsync`
- `supabase/migrations/20260719000000_missing_indexes_and_rls_fixes.sql`: Added 6 missing indexes + tightened messages RLS (read-only update)

**Caller Updates (breaking signature changes propagated):**
- `features/listings/queries.ts`: Updated mutation hooks to pass userId
- `features/requests/queries.ts`: Updated to pass userId
- `app/trip/[id].tsx`, `app/parcel/[id].tsx`, `app/my-activity.tsx`: Pass user.id to status mutations
- `app/edit-profile.tsx`: Pass currentUserId to updateProfile
- `app/delivery/[id].tsx`: Pass user.id to updateDeliveryLocation
- `app/subscriptions.tsx`: Pass user.id to delete/toggle

#### Round 2: Architecture & Quality (28 new files, ~2400 insertions)

**File Splitting (3 oversized screens → manageable components):**
- `app/login.tsx`: 649→346 lines; extracted `LoginEmailForm.tsx` + `LoginOtpForm.tsx`
- `app/delivery/[id].tsx`: 705→346 lines; extracted `DeliveryTimeline.tsx` + `DeliveryOtpEntry.tsx` + `DeliveryActionCards.tsx`
- `app/my-activity.tsx`: 731→288 lines; extracted `ActivityTripsList.tsx` + `ActivityParcelsList.tsx`
- `components/feature/CityPicker.tsx`: Deduplicated from create-trip + create-parcel

**Error Boundaries:**
- Added `<ErrorBoundary>` wrappers around all FlashList instances (trips, parcels, conversations, activity lists)

**Constants:**
- `constants/timing.ts`: Centralized AUTH_TIMEOUTS, ANIMATION_DURATIONS, POLLING_INTERVALS, DELAYS (replaced magic numbers)

**Offline Persistence:**
- `lib/query/persister.ts`: AsyncStorage-backed React Query cache persister (1s throttle, CARRYGO_QUERY_CACHE key)
- Integrated with `PersistQueryClientProvider` in app layout

**Database Migrations:**
- `supabase/migrations/20260719100000_outbox_retry_backoff.sql`: Exponential backoff (30s × 4^attempt), dead-letter table, sweep function
- `supabase/migrations/20260719200000_rating_materialized_view.sql`: Materialized view `user_rating_stats` for O(1) rating lookups

**Test Infrastructure:**
- CMS: Added Vitest config + 33 tests (`rate-limit.test.ts`, `validation.test.ts`, `admin-guard.test.ts`)
- Mobile: Added 243 unit tests (`smart-matching.test.ts` 36, `price-estimator.test.ts` 40, `validation.test.ts` 82, `sanitize.test.ts` 60, `rate-limiter.test.ts` 25)
- Total: 276 new tests covering business logic, security, and validation

#### Documented
- Deep codebase audit completed (services, database, screens, hooks, CMS, lib)
- PROJECT_CONTEXT.md rewritten with comprehensive findings
- Complete database schema documented (22 tables, 30+ RPC functions, all indexes/constraints)
- All 18 services documented with authorization/rate-limit status
- Created prioritized technical debt list (4 tiers)

### 2026-07-18 (Recent Commits)

#### Added
- Test infrastructure and initial tests
- Improved notifications system
- Updated delivery, parcels, trips, payments services
- Improved matching and smart search hooks

### 2026-08-30 (Fresh Full-Repo Audit)

#### Scope Audited
- Root monorepo surfaces reviewed: `CarryGo/`, `carrygo-cms/`, `backend/`, and Supabase SQL migrations under `CarryGo/supabase/migrations/`.
- Validation run on live tree (not prior reports): mobile typecheck/domain checks, mobile web export, CMS build/tests, backend typecheck, dependency audits.

#### Current Validation Results
- `CarryGo`: `pnpm -C CarryGo run typecheck` passes.
- `CarryGo`: `pnpm run test:verify` passes (`verify-rls`, `verify-domain-commands`, `verify-phase4-realtime`).
- `CarryGo`: `pnpm -C CarryGo run build:web` fails before export with `Error: Cannot find module 'minipass'` from Expo CLI dependency chain.
- `CarryGo`: `npx -C CarryGo expo-doctor@latest` is currently blocked because `expo config --json --full` exits non-zero in this environment.
- `CarryGo`: `android/local.properties` exists and points to `C:\\Users\\somve\\AppData\\Local\\Android\\Sdk`.
- `carrygo-cms`: `pnpm -C carrygo-cms run build` fails in offline/blocked network with `next/font` Google Fonts fetch errors (`DM Sans`, `Space Grotesk`).
- `carrygo-cms`: `pnpm -C carrygo-cms run test:run` passes (34/34 tests) when run outside sandbox restrictions.
- `backend`: `pnpm -C backend run typecheck` passes.

#### Security and Integrity Snapshot (Current State)
- Payment SQL hardening is present: `release_payment_atomic` / `refund_payment_atomic` derive actor from `auth.uid()` and explicitly ignore client `p_actor_id`.
- CMS bulk actions now call `requireAdmin()` before every mutation/export path in `carrygo-cms/app/dashboard/bulk/actions.ts`.
- CMS short-lived role cookie remains configured at 30 seconds (`x-cms-role`) in middleware.

#### Dependency Audit Snapshot (2026-08-30)
- `CarryGo` (`pnpm audit --audit-level moderate`): **3 vulnerabilities** (`2 high`, `1 moderate`) currently reported.
  - High: `image-size` DoS advisories via React Native/Metro chain.
  - Moderate: `ajv` ReDoS via ESLint chain.
- `carrygo-cms` (`npm audit --audit-level=moderate`): **0 vulnerabilities** reported.

#### Highest-Priority Follow-ups
1. Reinstall/fix mobile dependency graph to resolve missing `minipass` in Expo CLI path, then rerun `build:web` and `expo-doctor`.
2. Decide CMS font strategy for deterministic builds (self-host via `next/font/local` or ensure CI/prod network/proxy access to Google Fonts).
3. Patch/override `image-size` and `ajv` transitive vulnerabilities in `CarryGo`, then re-run audit.

#### Updated
- CMS dashboard and project config
- Route intelligence service
- KYC service
- Server rate limiting
- Package.json dependencies
