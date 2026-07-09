# CarryGo Phase 3: Domain Commands

Date: June 8, 2026

## Status

Repository-level Phase 3 is complete.

## Completed Work

- Added trusted request commands:
  - `create_request_command`
  - `transition_request_status`
- Added trusted delivery commands:
  - `create_delivery`
  - `confirm_delivery_pickup`
  - `complete_delivery_command`
- Added trusted rating command:
  - `submit_rating_command`
- Added transactional audit and outbox storage:
  - `audit_events`
  - `outbox_events`
  - `emit_domain_event`
- Added OTP attempt tracking and temporary lockouts on deliveries.
- Added a basic outbox processor:
  - SQL function `process_outbox_events`
  - Edge function `supabase/functions/process-outbox`
- Switched client request, delivery, and rating services to RPC-backed domain commands.
- Switched conversation creation to request-keyed upsert behavior to collapse duplicate conversation races.
- Extended repository verification with `scripts/verify-domain-commands.mjs`.

## What Phase 3 Now Enforces

- Request creation validates actor, route match, listing state, duplicate pair prevention, and remaining trip capacity.
- Request acceptance is atomic and reserves trip capacity immediately.
- Accepting one request for a parcel rejects sibling pending requests for that same parcel.
- Delivery pickup is only allowed for the assigned traveller on an accepted request.
- Delivery completion is only allowed for the assigned traveller on an in-transit delivery.
- Delivery OTP verification is server-side, hashed, attempt-limited, and lockable after repeated failures.
- Completing delivery also completes the request, marks the parcel delivered, and increments both participants' delivery counters in trusted backend code.
- Ratings are only allowed by request participants after a completed request, only for the counterparty, and only once per actor/request pair.
- Domain commands emit audit and outbox events in the same transaction.

## Runtime Wiring

- `services/requests.service.ts` now uses request RPC commands.
- `services/deliveries.service.ts` now uses delivery RPC commands.
- `services/ratings.service.ts` now uses the rating RPC command.
- `app/delivery/[id].tsx` no longer completes requests or increments counters directly on the client.
- `components/feature/RatingModal.tsx` no longer recomputes profile rating on the client.

## Verification

- `pnpm.cmd run typecheck`: passed.
- `pnpm.cmd run lint`: passed with existing warnings only.
- `pnpm.cmd run test`: passed.
  - RLS verification passed for 14 tables.
  - Domain command verification passed for 6 functions.
- `pnpm.cmd run build:web`: passed and exported 26 static routes.

## Follow-On Work Beyond Phase 3

- Replace the basic outbox processor with a scheduled/queue-backed worker strategy.
- Add live database integration tests once a local or CI Supabase execution path is available.
- Move notification creation in older request flows fully onto outbox consumption to remove remaining client-authored notification rows.
