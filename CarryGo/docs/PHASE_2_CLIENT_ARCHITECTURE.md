# CarryGo Phase 2: Client Architecture

Date: June 8, 2026

## Status

Repository-level Phase 2 is complete.

The app now uses TanStack Query as the active server-state layer across the route tree. The temporary `DataContext` and `useData()` bridge have been removed, protected navigation is enforced at the root layout, and a global offline banner is mounted from the app shell.

## Completed Work

- Added TanStack Query as the server-state foundation.
- Added a shared query client in `lib/query/queryClient.ts`.
- Added a React Query provider in `lib/query/QueryProvider.tsx`.
- Connected React Query to React Native app focus and NetInfo online status.
- Added typed query keys in `lib/query/queryKeys.ts`.
- Introduced feature folders for:
  - `features/listings`
  - `features/requests`
  - `features/conversations`
- Added feature-owned queries and mutations for trips, parcels, requests, conversations, and messages.
- Migrated the remaining detail routes off the bridge:
  - `app/trip/[id].tsx`
  - `app/parcel/[id].tsx`
  - `app/payment/[id].tsx`
  - `app/delivery/[id].tsx`
- Removed `contexts/DataContext.tsx`.
- Removed `hooks/useData.ts`.
- Replaced per-screen auth assumptions with a root app-shell gate in `app/_layout.tsx`.
- Mounted a global offline banner from the root app shell.
- Confirmed query cache clearing on logout in `contexts/AuthContext.tsx`.

## Current Client Data Flow

```text
Screen
  -> feature query or mutation hook
    -> typed query key
      -> existing Supabase service function
        -> Supabase table or RPC
```

Mutation success now updates or invalidates the relevant query cache:

- Creating a trip updates `listings/trips`.
- Creating a parcel updates `listings/parcels`.
- Creating or updating a request updates request detail and invalidates request collections.
- Creating a conversation updates user conversation state and invalidates conversation collections.
- Sending a message updates conversation messages and the latest message preview.

## Files Added Earlier in Phase 2

- `lib/query/queryClient.ts`
- `lib/query/queryKeys.ts`
- `lib/query/QueryProvider.tsx`
- `features/listings/queries.ts`
- `features/requests/queries.ts`
- `features/conversations/queries.ts`

## Files Completed or Updated in the Final Phase 2 Pass

- `app/_layout.tsx`
  - Removed the obsolete data bridge provider.
  - Added root auth/profile gating.
  - Added the global offline banner shell.
- `app/trip/[id].tsx`
  - Uses direct trip, request, parcel, and conversation queries.
- `app/parcel/[id].tsx`
  - Uses direct parcel, request, and conversation queries.
- `app/payment/[id].tsx`
  - Uses direct request detail query.
- `app/delivery/[id].tsx`
  - Uses direct request detail query and request-status mutation.
- `contexts/AuthContext.tsx`
  - Already clears the query cache on logout; this now serves as the single logout cleanup path.

## Follow-On Work After Phase 2

These are worthwhile improvements, but they are no longer required to treat the client-architecture migration as complete:

- Split the largest route files into smaller feature screen components.
- Add richer screen-level mutation error UI for request acceptance, delivery, chat, and payment surfaces.
- Add pagination or infinite queries for large marketplace, request, message, notification, and transaction lists.
- Continue consolidating the duplicated theme abstractions.
- Add realtime subscriptions on top of the stable query-backed baseline.

## Verification

- `pnpm.cmd run typecheck`: passed.
- `pnpm.cmd run lint`: passed with pre-existing warnings only.
- `pnpm.cmd run test`: passed RLS verification for 12 tables.
- `pnpm.cmd run build:web`: passed and exported 26 static routes to `dist/web`.

Expo web export still prints the existing Expo Notifications web push-token warning. That warning was present before this completion pass and is not introduced by the Phase 2 changes.
