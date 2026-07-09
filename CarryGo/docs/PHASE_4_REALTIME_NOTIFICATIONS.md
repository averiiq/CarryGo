# CarryGo Phase 4: Realtime and Notifications

Date: June 9, 2026

## Status

Phase 4 is complete at the repo level.

## Completed

- Added realtime conversation-list subscriptions in `features/conversations/queries.ts`.
- Added realtime per-conversation message subscriptions in `features/conversations/queries.ts`.
- Added paginated chat message loading with infinite-query semantics and a "load earlier messages" affordance in `app/chat/[id].tsx`.
- Replaced the notification hook polling loop with a Supabase Realtime listener on `notifications`.
- Added cold-start notification deep-link handling through `Notifications.getLastNotificationResponseAsync()`.
- Removed duplicate `useNotifications()` mounting inside the home screen by passing notification state into the modal panel.
- Replaced chat's client-authored cross-user notification writes with `send_chat_message_command` plus outbox processing.
- Replaced remaining request acceptance, rejection, cancellation, and request-created notifications with server-authored outbox processing in `process_outbox_events`.
- Replaced route-alert 30-second polling in `app/subscriptions.tsx` with realtime database subscriptions to `trips` and `parcels`.
- Added server-authored route-match fanout through `notify_route_subscribers`.
- Added multi-device push token storage with `user_devices`.
- Added push delivery tracking with `notification_deliveries`.
- Added Expo ticket persistence and invalid-token cleanup in `supabase/functions/send-push-notifications/index.ts`.
- Added Expo receipt reconciliation in `supabase/functions/process-push-receipts/index.ts`.
- Added a repo verification script at `scripts/verify-phase4-realtime.mjs`.

## Repo-Level Outcome

- Chat and notifications now update from realtime events instead of client polling loops.
- Cross-user notifications no longer depend on unsafe direct client inserts into another user's rows.
- Route alerts can fan out from trusted server-side logic instead of ad hoc screen code.
- Push delivery is no longer single-device only and now has a concrete path for ticket tracking and stale-token cleanup.
- Notification handling covers foreground, background tap, and cold-start deep links.

## Deployment Follow-Up

- Apply `supabase/migrations/20260609010000_phase4_realtime_push_hardening.sql` to the database.
- Deploy `supabase/functions/send-push-notifications` and `supabase/functions/process-push-receipts`.
- Wire the push send and receipt functions into the production notification pipeline or scheduler.
