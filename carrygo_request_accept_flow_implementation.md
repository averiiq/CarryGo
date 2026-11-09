# CarryGo — Request & Accept Flow Implementation Specification

## 1. Purpose

Implement only the agreed **Sender → send request → Traveler → accept/reject** flow and the navigation placement described in this document.

**Critical requirement:** Existing **Post a Trip** and **Send a Parcel** creation flows were carefully designed. Do not remove, skip, combine, reorder, simplify, rename, or otherwise change any existing step, field, input, validation, selection, upload, option, or confirmation in either flow. Their current behaviour must remain intact.

This document is a narrowly scoped implementation specification, not permission to redesign the app or rebuild unrelated features.

## 2. Bottom Navigation

Keep exactly these four bottom-navigation options, in this order:

1. **Home**
2. **Explore**
3. **Post**
4. **Messages**

Remove **My Activity** from the bottom navigation only. Do not remove its functionality or create a duplicate screen/menu item elsewhere.

The existing **Profile → My Activity** entry remains the way to open My Activity.

### Post entry point

Keep the existing Post entry point and its current options for:
- **Send a Parcel**
- **Post a Trip**

Opening either option must preserve its existing creation flow exactly as it is today.

## 3. Roles and permissions

The app supports Sender, Traveler, and Both roles. Preserve the existing account and role model.

- **Sender:** can post a parcel and send a request to a Traveler for a suitable trip.
- **Traveler:** can post a trip and accept or reject incoming Sender requests.
- **Both:** can use both Sender and Traveler workflows from the same account. No logout, account switching, or duplicate account should be required.

### Non-negotiable permission rules

- Only a **Sender** initiates a booking/request to a Traveler.
- Only a **Traveler** can accept or reject an incoming request.
- A Traveler must not get a new action to initiate a request to a Sender.
- A Sender must not get an action to accept/reject incoming Traveler requests.
- Enforce role and ownership permissions in the backend/API as well as in the UI. Hiding a button alone is not authorization.

## 4. Sender request flow

1. The Sender opens **Post → Send a Parcel**.
2. The Sender completes the **entire existing parcel-posting flow without any changes**.
3. The parcel must be posted successfully even when no matching trip is found. Show an appropriate no-match state; do not block or fail the post.
4. If suitable trips are available, show the existing relevant trip/matching information and let the Sender choose a Traveler.
5. The Sender sends a request to the selected Traveler.
6. The request is visible to the Sender under **Profile → My Activity → Sent Requests** (or the existing equivalent section, if already named differently).
7. The Sender can see the request status. The Sender cannot accept or reject their own sent request.
8. If the Traveler accepts, show the confirmed booking state using the existing booking/lifecycle logic.
9. If the Traveler rejects, show the rejected state. Do not create a confirmed booking.

Do not create a new request step inside the parcel form if the current product places matching/requesting after posting. Preserve the existing posting sequence and connect the request flow at the appropriate existing point.

## 5. Traveler request flow

1. The Traveler opens **Post → Post a Trip**.
2. The Traveler completes the **entire existing trip-creation flow without any changes**.
3. The trip must be posted successfully even when no matching parcel is found. Show an appropriate no-match state; do not block or fail the trip post.
4. The Traveler can view relevant matching parcels using the existing Explore/matching functionality.
5. When a Sender sends a request for that trip, it appears under **Profile → My Activity → Incoming Requests**.
6. The Traveler can open the request and review the relevant parcel, Sender, trip, route, and price information already available in the app.
7. The Traveler can **Accept** or **Reject** the incoming request.
8. Accepting must update the request/booking through the existing valid backend lifecycle. It must not create duplicate bookings if the action is submitted more than once.
9. Rejecting must update the request state and must not create a confirmed booking.

The Traveler must not be able to create a request to the Sender. The Traveler responds only to a request initiated by the Sender.

## 6. My Activity location and organization

Keep My Activity accessible from **Profile → My Activity**. Do not add it back to the bottom navigation.

Within My Activity, preserve existing screens and functionality where they already exist. Organize or expose the relevant sections without rebuilding unrelated areas:

- **Sent Requests** — requests created by the current user as Sender.
- **Incoming Requests** — requests received by the current user as Traveler; accept/reject actions live here.
- **Active/Confirmed Bookings** — requests that have been accepted and are now confirmed or active according to the existing lifecycle.
- **History** — completed, rejected, cancelled, or expired records according to existing supported statuses.
- **My Parcels** and **My Trips** — keep existing access and functionality for the relevant role(s).

A Sender-only account should not be shown Traveler-only actions. A Traveler-only account should not be shown Sender-only actions. A Both account should be able to access both sets of relevant sections from the same account. Reuse existing names and components when practical; do not create duplicate screens merely to match these labels.

## 7. Request states and lifecycle

Use the current backend's existing status model if it already represents these states correctly. Map UI labels to existing statuses where possible; do not introduce a parallel status system unnecessarily.

Expected user-visible distinctions:

- **Posted / No Match Yet:** a parcel or trip has been posted, but no match is currently available. Posting still succeeds.
- **Request Sent / Awaiting Response:** the Sender has sent a request and the Traveler has not responded.
- **Confirmed:** the Traveler accepted the request and the booking is confirmed according to existing business rules.
- **Rejected:** the Traveler rejected the request.
- **Active / Completed / Cancelled / Expired:** retain the existing lifecycle and rules for these states.

Important distinctions:
- A match is **not** an accepted request.
- Posting a parcel or trip is **not** a confirmed booking.
- Sending a request is **not** confirmation.
- A booking becomes confirmed only after a valid Traveler acceptance and the existing required backend checks.

Do not invent new cancellation, expiry, payment, or confirmation rules. If the current codebase has conflicting or unclear rules, report the conflict before changing them.

## 8. Payment, chat, OTP, and delivery

This task is only about the agreed request/accept flow and navigation placement.

- Keep existing payment logic and payment verification unchanged.
- Keep existing chat behaviour and permissions unchanged. Messages remains a separate bottom-navigation item.
- Keep existing pickup/delivery OTP logic, delivery confirmation, and status transitions unchanged.
- Do not move payment, OTP, or delivery steps earlier in the flow or add new mandatory steps.
- Only expose the existing next-stage actions when the current business rules say they are available. Do not crowd all actions onto the post, request, or activity screen.
- Do not change pricing, negotiation, fees, refunds, escrow, or payment timing as part of this task.

## 9. Strict change boundaries

### Allowed changes

- Change the bottom navigation to exactly **Home, Explore, Post, Messages**.
- Keep **My Activity** accessible from the existing Profile entry.
- Connect and correct the Sender-send / Traveler-accept-or-reject request lifecycle.
- Correct role/ownership checks required for this lifecycle.
- Display the appropriate request state using the existing UI conventions.
- Fix directly related bugs in request creation, response, and status updates, provided unrelated flows remain unchanged.

### Forbidden changes

- Do not remove, skip, reorder, merge, simplify, or rename any step in **Post a Trip**.
- Do not remove, skip, reorder, merge, simplify, or rename any step in **Send a Parcel**.
- Do not remove fields, validation, route/location options, date/time options, pricing options, parcel details, photos/uploads, review/confirmation screens, or other existing form controls.
- Do not redesign the whole app, rebuild navigation architecture, or introduce a new state-management architecture for this task.
- Do not rewrite unrelated APIs, database schemas, authentication, notifications, chat, payment, OTP, delivery, or profile features.
- Do not add Traveler-initiated requests to Senders.
- Do not make a successful post depend on finding a match.
- Do not create duplicate My Activity screens or duplicate requests/bookings.
- Do not delete existing working code just because a new implementation seems cleaner.

## 10. Required implementation approach

Before editing:

1. Inspect the current navigation, Profile → My Activity entry, trip-posting flow, parcel-posting flow, request APIs, booking/status model, and role/ownership checks.
2. Identify the exact existing steps in both creation flows and treat them as protected.
3. Identify the smallest code changes needed for the requested request/accept behaviour.
4. If a change appears to require modifying a protected trip/parcel creation step, stop and explain why before making that change. Do not silently alter the form.

While editing:

1. Make minimal, targeted changes only.
2. Reuse existing components, APIs, status values, and database structures wherever possible.
3. Do not replace working code wholesale.
4. Do not fabricate files, functions, APIs, schema fields, or business rules. Inspect the repository and verify names before referencing or editing them.
5. Keep unrelated modifications out of the change set.

After editing:

1. Summarize each changed file and why it needed to change.
2. Explicitly confirm whether any trip-posting or parcel-posting step, field, validation, or screen was changed. The expected answer is **none**.
3. Report tests run and their actual results. Do not claim tests passed unless they were run.
4. Flag any unresolved ambiguity rather than guessing.

## 11. Acceptance checklist

Implementation is acceptable only if all applicable checks pass:

- [x] Bottom navigation contains exactly Home, Explore, Post, and Messages.
- [x] My Activity is accessible from Profile and is absent from bottom navigation.
- [x] Existing Post menu still offers Send a Parcel and Post a Trip.
- [x] Every existing Send a Parcel step, field, validation, option, and screen remains intact and in the same order.
- [x] Every existing Post a Trip step, field, validation, option, and screen remains intact and in the same order.
- [x] A parcel can be posted successfully when there is no matching trip.
- [x] A trip can be posted successfully when there is no matching parcel.
- [x] Sender can send a request to a suitable Traveler.
- [x] Traveler sees the request in Incoming Requests and can accept or reject it.
- [x] Sender cannot accept/reject the sent request.
- [x] Traveler cannot initiate a request to Sender.
- [x] A request is not treated as confirmed before a valid Traveler acceptance.
- [x] Repeated accept/request actions do not create duplicate bookings or inconsistent states.
- [x] Sent Requests, Incoming Requests, Active/Confirmed Bookings, and History remain accessible through My Activity as supported by the existing app.
- [x] Both-role users can use both workflows without switching accounts.
- [x] Existing chat, payment, OTP, delivery, authentication, and unrelated features continue to behave as before.
- [x] Backend authorization is checked; UI-only restrictions are not considered sufficient.

## Final instruction to the coding agent

**Implement only the request-send / request-accept-or-reject flow and the four-item bottom navigation described here. Preserve every existing step in both Post a Trip and Send a Parcel flows exactly as it currently exists. Do not make any unrelated improvements or changes.**
