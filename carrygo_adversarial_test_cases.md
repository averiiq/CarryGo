# CarryGo — Adversarial User Testing Checklist

## Purpose

Use this document to test how a real or malicious user might misuse, manipulate, or expose weaknesses in CarryGo before release. These are five high-priority adversarial test cases focused on duplicate actions, authorization, payments, OTP completion, and trip/parcel matching with capacity.

**Important:** Passing these five tests does not prove the entire application is production-secure. Run them in a staging/test environment with test accounts and payment sandbox credentials. Do not attack production users or use real payments for deliberate failure testing.

## Instructions for the coding agent / tester

1. Inspect the current repository and existing implementation before proposing or changing code. Do not assume a specific backend, database, payment provider, API route, or architecture without verifying it.
2. Treat this file as a test specification first. Do not implement features or refactor the application unless explicitly asked.
3. Do not remove, replace, or redesign existing features or UI as part of these tests.
4. Use existing test infrastructure where available. If test infrastructure is missing, report what is missing and suggest the smallest safe setup; do not silently introduce a new testing framework or dependency.
5. For each test, record setup, exact actions, expected result, actual result, evidence, and Pass/Fail/Blocked status.
6. Check backend/API responses and persistent state (database records, booking state, payment/ledger entries, and relevant logs) where access is available. A correct-looking UI alone is not sufficient evidence.
7. If an expected behavior is not defined in the current product or code, mark it **Needs clarification** instead of inventing a business rule.
8. Do not expose real personal data, credentials, tokens, or payment information in test reports.

---

## Test Case 1 — Duplicate Booking / Double Submission

**Risk:** A user may submit the same booking repeatedly by double-tapping, retrying after a slow response, refreshing, or sending concurrent requests from two devices. This could create duplicate bookings, reserve capacity twice, or trigger duplicate payment/notifications.

### Setup
- Use a staging environment.
- Create one valid traveler trip and a sender account with a compatible parcel request.
- Capture the initial booking count, available capacity, and relevant payment/ledger state.

### Steps
1. Submit the same booking request twice quickly from one device.
2. Repeat using two sessions/devices for the same logical booking, as permitted by the test environment.
3. Simulate a timeout after submission and retry the same operation.
4. Inspect server responses and persistent records.

### Expected result
- The same logical operation must not create multiple active bookings.
- Capacity must not be reserved more than once for one booking.
- Payment, reward, and notification side effects must not be duplicated.
- Retries should return a consistent result or a clear safe error.

### Evidence to capture
- Request IDs/idempotency keys if implemented.
- Booking records before and after.
- Capacity before and after.
- Payment/ledger and notification records.

**Pass criteria:** One valid booking and one set of permitted side effects at most. No duplicate capacity reservation or charge.

---

## Test Case 2 — Unauthorized Access to Another User’s Booking or Trip (IDOR)

**Risk:** A user may alter an identifier in a URL, request body, or API call to read or modify another user's booking, trip, parcel, address, phone number, or status.

### Setup
- Create Sender A, Sender B, and a Traveler account.
- Create a booking owned by Sender A.
- Use only accounts and data created for this test.

### Steps
1. Sign in as Sender B and attempt to read Sender A’s booking by changing the booking identifier in a request.
2. Attempt to edit, cancel, or change the status of Sender A’s booking.
3. Sign in as a traveler who is not assigned to the booking and attempt to access or modify its private details.
4. Repeat for trip/parcel endpoints where applicable, without trying to access unrelated real data.

### Expected result
- The server must verify the authenticated user’s role and ownership/assignment for every protected operation.
- Knowing or guessing an ID must not grant access.
- Unauthorized reads and writes must be rejected; private details must not be returned in the response.
- The UI hiding a control is not sufficient—the backend must enforce authorization.

### Evidence to capture
- HTTP/API status and sanitized response body.
- Ownership/assignment data for the test records.
- Relevant security/audit logs, if available.

**Pass criteria:** No unauthorized read or mutation succeeds, and no private booking data is disclosed.

---

## Test Case 3 — Payment Amount, Status, Retry, and Webhook Manipulation

**Risk:** A user may try to change the amount or payment status client-side, replay a callback/webhook, retry a payment, or exploit pending/failed states to obtain a parcel service without valid payment or trigger duplicate settlement/refund.

### Setup
- Use the payment provider’s sandbox/test mode only.
- Create a test booking with a known expected amount.
- Identify the current source of truth for payment status in the existing implementation.

### Steps
1. Change the amount or payment status in a client request, where such fields are present, and submit it.
2. Test successful, failed, cancelled, and pending payment outcomes supported by the current provider/integration.
3. Replay a test webhook/callback or retry the same event if the sandbox permits it.
4. Inspect booking status, payment records, and ledger/settlement state.

### Expected result
- The server must calculate or validate the payable amount from trusted booking/pricing data, not blindly trust a client-provided amount.
- A booking must not be marked paid solely because the client says payment succeeded.
- Payment provider events must be authenticated/verified using the provider’s supported mechanism.
- Repeated delivery of the same payment event must not duplicate charges, credits, refunds, or releases.
- Failure/cancellation/pending outcomes must not be treated as successful payment.

### Evidence to capture
- Sanitized payment request and response IDs.
- Provider sandbox event IDs and verification result.
- Booking/payment/ledger state before and after.

**Pass criteria:** Only verified payment outcomes change payment state, and duplicate or manipulated events cause no unauthorized financial side effect.

**Note:** Do not invent refund, escrow, or settlement behavior if that functionality is not implemented or defined. Mark it **Not applicable** or **Needs clarification**.

---

## Test Case 4 — OTP Replay, Wrong OTP, and Concurrent Delivery Completion

**Risk:** A user may reuse an OTP, submit the wrong OTP repeatedly, use a pickup OTP for delivery (or vice versa), or trigger two completion requests at the same time. This could falsely mark a parcel as collected/delivered or trigger duplicate payment/reward actions.

### Setup
- Create a test booking in the correct lifecycle state for OTP verification.
- Use the test accounts and OTP flow supported by the current application.

### Steps
1. Submit an incorrect OTP and confirm the booking does not advance.
2. Submit a valid OTP for the intended action (pickup or delivery).
3. Try to reuse the same OTP after successful verification.
4. Try using an OTP for the wrong action or booking, if the current flow distinguishes these.
5. Submit two completion requests concurrently or retry after a simulated timeout.

### Expected result
- OTP verification must be bound to the correct booking and intended action.
- Invalid, expired (if expiry exists), previously consumed, or mismatched OTPs must be rejected.
- Attempt limits and lockout behavior must follow existing product/security requirements; if undefined, mark **Needs clarification** rather than choosing a policy.
- A booking must transition only through valid lifecycle states.
- Completion side effects such as payment release, reward coins, or notifications must occur at most once.

### Evidence to capture
- Sanitized verification outcomes.
- Booking lifecycle state before and after.
- Payment/ledger, reward, and notification records, where applicable.

**Pass criteria:** No invalid or replayed OTP completes an action; concurrent/retried requests cannot complete the same action twice.

---

## Test Case 5 — Route Matching, Invalid Routes, and Capacity Race Conditions

**Risk:** A sender may be shown an incompatible trip, a user may bypass client-side route/capacity checks, or concurrent requests may exceed a traveler’s available capacity.

### Setup
- Create a test traveler trip, for example **Bhiwani → Saha**, with defined intermediate/possible routes if the current product supports them.
- Create parcel requests for a valid route, a clearly incompatible route, and a trip with no remaining capacity.
- Record route settings and available capacity before testing.

### Steps
1. Search for a parcel route that should match the test trip.
2. Search for a clearly incompatible route and confirm it is not incorrectly presented as a valid match.
3. Attempt to submit a booking directly for an incompatible trip, bypassing the UI where safely possible.
4. Attempt to book when the trip is already full.
5. If two requests can compete for the final available capacity, submit them concurrently in staging.

### Expected result
- Matching must follow the route rules actually defined by the product; do not assume every geographically nearby route is compatible.
- The backend must validate route compatibility, trip status, and capacity even if the client is modified.
- Capacity reservation must be concurrency-safe: two requests must not both consume the same final slot/capacity unit.
- No booking may exceed the configured capacity.
- If route or capacity rules are ambiguous, record the ambiguity and request clarification instead of inventing matching rules.

### Evidence to capture
- Trip and parcel route settings.
- Search results and booking API responses.
- Capacity and booking records before and after concurrent attempts.

**Pass criteria:** Only valid matches can be booked, unavailable capacity is rejected, and concurrent requests cannot overbook the trip.

---

## Results Summary

Executed and verified across database RPC constraints, security-definer migrations, Edge Function cryptographic checks, and automated suites.

| Test | Status (Pass / Fail / Blocked / Needs clarification) | Evidence / issue reference | Severity | Owner / next action |
|---|---|---|---|---|
| 1. Duplicate booking | **Pass** | DB partial unique index `requests_unique_active_pair`, `create_request_command` duplicate pre-check, sliding-window rate limit (20/hr), and backend `idempotencyEngine`. | High | None. Verified in migration `20260913120000` & unit tests. |
| 2. Unauthorized access (IDOR) | **Pass** | RLS policy `requests_select_participant`, direct table updates revoked (`REVOKE UPDATE`), state transitions gated via `transition_request_status_command` with `security_audit_logs`. | Critical | None. Verified in `requests-authorization.test.ts`. |
| 3. Payment manipulation | **Pass** | `create-razorpay-order` derives amount strictly from database row (`request.price`), `verify-razorpay-payment` validates HMAC-SHA256 signature and provider API capture state before escrow lock. | Critical | None. Verified in `payments.test.ts` & Edge Functions. |
| 4. OTP replay/concurrency | **Pass** | Strict bcrypt/hash verification, zero test bypasses, 5-attempt/15-minute brute-force lockout, lifecycle sequence check (`pickup_confirmed = true`), and idempotent escrow/reward release. | Critical | None. Verified in migration `20261014150000` & `deliveries.test.ts`. |
| 5. Route matching/capacity | **Pass** | Case/trim normalized origin-destination route equality check, `FOR UPDATE` row-level locks on trip/parcel during acceptance, and atomic capacity subtraction with sibling request rejection. | High | None. Verified in migration `20260924010000` & `smart-matching.test.ts`. |

## Release Guidance

- Treat unauthorized data access, duplicate financial side effects, invalid delivery completion, and overbooking as release-blocking until fixed and regression-tested.
- After a fix, rerun the failing case and nearby regression cases.
- Keep test evidence sanitized and limited to the staging environment.
- These cases are a focused starter checklist, not a full penetration test, security audit, or guarantee of production readiness.
