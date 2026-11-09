# Web ↔ Mobile Feature Parity Checklist

**Audit date:** 2026-11-07
**Mobile baseline:** `CarryGo/` (28 screens, 49 components, 19 services)
**Web baseline:** `carrygo-web/` (app router, Supabase client)
**Methodology:** Opened actual files on both sides. Any route marked present was checked for live Supabase wiring vs placeholder copy.

---

## 1. Executive summary — parity by area

| # | Area | Parity | Notes |
|---|---|---|---|
| 1 | Auth + session | 90% ✅ | Email OTP end-to-end; reviewer bypass exists. Missing: profile-setup guard after first sign-in. |
| 2 | KYC | 20% 🟡 | Route exists but is **client-side simulated** — no DigiLocker, no `sandbox-kyc` edge fn, no PAN Digio call, no real selfie upload. |
| 3 | Profile + edit + deletion | 35% 🟡 | Basic edit (name/phone/city/bio) wired. No avatar upload, no notif prefs, no rewards/referral/subscriptions links. Delete-account is a legal page, no `soft_delete_user_account` RPC. |
| 4 | Create trip / parcel | 80% ✅ | `ParityCreateForm` (915 LOC) inserts into `trips`/`parcels` tables. Lacks: image upload for parcel, 7-day schedule picker, Haryana corridor helper, face-verification gate. |
| 5 | Search + smart matching | 85% ✅ | `/search` + `/matching` live; `lib/smart-matching.ts` (638 LOC) ports the service. Advanced filter modal and sort controls thinner than mobile. |
| 6 | Requests lifecycle | 55% 🟡 | Accept/decline/cancel via `transition_request_status` in `/activity`. **No counteroffer/negotiate modal**, no request detail modal, no success modal, no separate `/requests` inbox screen. |
| 7 | Chat | 70% 🟡 | List + thread with Supabase realtime + `send_chat_message_command`. Missing: image attachments, delivery-context pill. |
| 8 | Payment + escrow | 90% ✅ | Full Razorpay flow via `create-razorpay-order` + `verify-razorpay-payment` edge functions, success page. Missing: InAppBrowser/link fallback mode, `finalize_razorpay_payment` is covered by edge verify. |
| 9 | Delivery + dual-OTP | 85% ✅ | 1311-LOC page calls `get_or_create_pickup_otp`, `confirm_delivery_pickup_with_otp`, `complete_delivery_command`, `issue_delivery_otp`, `update_delivery_trip_progress`. Lockout UI present. Missing: live map, haptic feedback (N/A). |
| 10 | Ratings | 95% ✅ | `rating-modal.tsx` calls `submit_rating_command`. Parity good. |
| 11 | Notifications | 10% ❌ | No notifications table query anywhere on web, no realtime banner, no `/notifications` center, no prefs screen. Expo push (➖ N/A for web). |
| 12 | Coins & Rewards | 0% ❌ | No route, no component, no reads from rewards tables. |
| 13 | Subscriptions (route alerts) | 0% ❌ | No route, no `route_subscriptions` reads/writes on web. |
| 14 | Support + FAQ ticket submission | 40% 🟡 | `/faq`, `/contact` are static marketing pages with mailto links. No ticket form, no `support.service` equivalent. |
| 15 | Promotional banners | 0% ❌ | No carousel component on homepage; no `promotional_banners` table read. |
| 16 | My Activity center | 60% 🟡 | 3 tabs (parcels/trips/payments) vs mobile 5 (active trips, active parcels, completed, archived, transactions). No archived segmentation, no tax-invoice download. |
| 17 | Referral | 0% ❌ | Not implemented on web. |
| 18 | Price estimator | 60% 🟡 | `rate-calculator.tsx` exists as marketing widget. Not integrated into create-parcel flow and does not share the mobile service's multiplier logic 1:1. |

**Overall weighted parity ≈ 50%.** Core booking funnel (auth → create → search → request → accept → pay → OTP handover → rate) is at ~75% and usable. Engagement + retention layer (notifications, rewards, referrals, subscriptions, support tickets) is at ~5%.

---

## 2. Prioritized gap table

| Area | Gap | Status | Pri | Effort | Files to touch (web side) | Depends on |
|---|---|---|---|---|---|---|
| KYC | Real DigiLocker Aadhaar OTP via `sandbox-kyc` edge fn | 🟡 | **P0** | L | `app/kyc/page.tsx` (rewrite), new `components/kyc/aadhaar-digilocker-step.tsx`, `components/kyc/pan-step.tsx`, `components/kyc/selfie-step.tsx` | `sandbox-kyc` edge fn (exists), `verify_aadhaar_sandbox` RPC |
| KYC | PAN verification via Digio call (mirror `kyc.service.ts` lines 440–500) | 🟡 | P0 | M | same KYC page | edge fn |
| KYC | Selfie upload to storage bucket + persist URL | 🟡 | P0 | M | KYC page + `storage.service` port | `kyc-documents` bucket |
| Requests | Counteroffer/negotiate flow with price modal | ❌ | **P0** | L | new `components/requests/negotiate-modal.tsx`, extend `/activity` or new `/requests` route | `counter_offer_request` RPC (verify exists), `NegotiateTripModal.tsx` as reference |
| Requests | Request detail modal (full context before accept) | ❌ | P1 | M | new `components/requests/request-detail-modal.tsx` | — |
| Requests | Request success modal with next-step CTA | ❌ | P2 | S | small component | — |
| Payment | Link-based fallback (InAppBrowser path on mobile) for users without JS Razorpay | ❌ | P2 | M | extend `payment/[id]/page.tsx` | existing edge fn |
| Delivery | Live traveller location map (web currently shows coords only) | 🟡 | P1 | M | new `components/delivery/live-map.tsx` using Leaflet/Mapbox | `location_updated_at` already on row |
| Chat | Image attachments | ❌ | P1 | M | `components/chat/chat-thread.tsx`, add storage upload | `chat-attachments` bucket |
| Chat | Delivery context pill (shows route/weight/status in thread header) | ❌ | P2 | S | `chat-thread.tsx` | — |
| Notifications | `/notifications` inbox center | ❌ | **P0** | M | new `app/notifications/page.tsx`, new `components/notifications/list.tsx` | `notifications` table + RLS already exist |
| Notifications | Realtime in-app banner (mirror `InAppNotificationBanner`) | ❌ | **P0** | M | new `components/notifications/realtime-banner.tsx`, mount in `marketing-shell.tsx` | realtime channel on `notifications` |
| Notifications | Notification preferences screen (channel toggles) | ❌ | P1 | S | new `app/notification-settings/page.tsx` | `user_notification_preferences` table |
| Rewards | Coins/rewards ledger screen | ❌ | P1 | L | new `app/rewards/page.tsx`, read ledger tables | rewards schema (`carrygo-coins-rewards.md`), mobile `rewards.service.ts` |
| Subscriptions | Route-match alert creation + list | ❌ | P1 | M | new `app/subscriptions/page.tsx`, form | `route_subscriptions` + `notify_route_subscribers` RPC (both exist) |
| Support | In-app ticket submission form | ❌ | P1 | M | new `app/support/page.tsx` or extend `/contact`; call `submit_support_ticket` RPC | mobile `support.service.ts` for payload shape |
| Support | FAQ as data-driven list (bilingual) | 🟡 | P2 | S | refactor `/faq/page.tsx` | content source |
| Profile | Avatar upload | ❌ | P1 | S | `app/profile/page.tsx`, add storage upload | `avatars` bucket |
| Profile | Hardcoded rating/reviews (5.0 / 12) replaced with real data | 🟡 | P1 | S | `app/profile/page.tsx` | `ratings` aggregate query |
| Profile | Nav links to rewards / subscriptions / referral / notif-settings | ❌ | P1 | S | `app/profile/page.tsx` | those pages need to exist |
| Account deletion | Actual delete action via `soft_delete_user_account` RPC | 🟡 | **P0** | M | rewrite `app/delete-account/page.tsx` as action form (not legal page) | RPC exists; also need `recreate_user_account` on re-signup |
| My Activity | Add archived + explicit transactions tabs (5-segment pill like mobile) | 🟡 | P2 | M | `app/activity/page.tsx` | — |
| My Activity | Tax invoice download | ❌ | P2 | M | activity page + invoice edge fn | needs invoice generator (check if mobile has one) |
| Referral | Referral code screen + share + ledger | ❌ | P2 | M | new `app/referral/page.tsx` | referral schema (verify exists) |
| Price estimator | Wire `rate-calculator` into create-parcel to pre-fill `price_offer` | 🟡 | P2 | S | `parity-create-form.tsx`, `rate-calculator.tsx` | — |
| Promotional banners | Homepage carousel reading `promotional_banners` | ❌ | P2 | S | `app/page.tsx`, new carousel | table + mobile service |
| Create parcel | Image upload for parcel photo | ❌ | P1 | S | `parity-create-form.tsx` | `parcel-images` bucket |
| Create trip | 7-day schedule picker (recurring) | ❌ | P2 | M | `parity-create-form.tsx` | `SevenDaySchedulePicker.tsx` as reference |
| Legal | Bilingual EN/HI versions | ❌ | P2 | M | each legal page | content from `carrygo-bilingual-content.md` |
| Auth | Profile-setup guard after first sign-in (mobile has `requiresProfileSetup`) | ❌ | P1 | S | `components/auth/login-form.tsx`, middleware | — |
| Haptics / push / native sheet | — | ➖ | — | — | N/A for web | — |

---

## 3. Suggested execution order

### Wave 1 — unblock core flow gaps (P0)
1. **KYC real wiring** (DigiLocker + PAN + selfie) — biggest UX lie currently; users think they're verified but aren't.
2. **Request counteroffer/negotiate modal** — mobile users can negotiate, web users cannot; blocks price discovery flow on web.
3. **Notifications inbox + realtime banner** — users have no way to know anything happened after they close the tab; also blocks confidence in the OTP handshake step on web.
4. **Account deletion actual action** — DPDP Act 2023 compliance risk; current page is info only.

### Wave 2 — parity for engagement surface (P1)
5. Profile: avatar upload + real rating + nav links.
6. Rewards ledger screen.
7. Subscriptions (route alerts).
8. Support ticket submission form.
9. Chat image attachments.
10. Delivery live map.
11. Parcel image upload in create flow.
12. Notification preferences screen.
13. Auth profile-setup guard.
14. Request detail modal.

### Wave 3 — polish & retention (P2)
15. My Activity 5-segment pill + tax invoices.
16. Referral screen.
17. Price estimator integration into create flow.
18. Promotional banner carousel.
19. 7-day trip scheduler.
20. Bilingual legal pages.
21. Payment link fallback.
22. Chat delivery-context pill.
23. Request success modal.

**Dependency chain to respect:**
- Notifications banner → must exist before Rewards/Subscriptions (those trigger notifications users need to see).
- Account deletion action → should land with legal page copy updated to point to it.
- Rewards → Referral (same ledger backbone).
- KYC real flow → unlocks higher-trust create-trip gating (face-verification step).

---

## 4. Items to verify with the user

1. **Is web a full app replica, or a lightweight companion?** PROJECT_CONTEXT lists 28 mobile screens; web currently has ~18 app screens. Confirm whether rewards/referral/subscriptions are intentionally mobile-only (push-dependent) or must reach parity.
2. **KYC provider on web:** mobile uses Sandbox (Aadhaar) + Digio (PAN) via `sandbox-kyc` edge fn. Web should reuse the same edge fn — confirm no legal reason to force DigiLocker only via mobile deep-link.
3. **Payment link fallback:** mobile has a native SDK path and an InAppBrowser link path. Web only has SDK. Do we need a hosted-page fallback for Safari-locked-down browsers?
4. **Tax invoice generator:** does the backend currently emit PDF invoices? If not, "transactions" tab parity is blocked by that service.
5. **Bilingual legal:** mobile ships EN+HI. Is the marketing stance to keep web EN-only, or to serve HI at `/hi/...`?
6. **Haptics, push notifications, native sheets, live activity pill** — confirmed N/A for web (treat as intentional divergence, do not file as gaps).
7. **Admin panel** (`carrygo-cms`) is out of scope for this audit — confirm.
8. **Hardcoded profile stats** (rating 5.0, 12 reviews) in `app/profile/page.tsx` lines 90–91: confirm these should be replaced with live aggregates vs removed from the UI entirely.
9. **Counteroffer RPC name** — mobile uses negotiation modal flow; verify the exact RPC name in Supabase (`counter_offer_request`? `negotiate_request`?) before scoping the web modal.
10. **Face verification** service on mobile — should this gate web create-trip too, or stay mobile-only due to camera UX?
