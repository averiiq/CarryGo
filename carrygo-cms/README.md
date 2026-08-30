# CarryGo CMS

Internal admin dashboard for CarryGo, built with Next.js App Router and Supabase.

## What this app does

- Authenticated admin dashboard (`/dashboard/*`)
- KYC review and document moderation
- Dispute handling and support ticket management
- Trips, parcels, users, payments, analytics, and audit views
- Optional AWS backend provider mode for selected dashboard paths

## Tech stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Supabase (`@supabase/ssr`, `@supabase/supabase-js`)
- Tailwind CSS 4
- Vitest + Testing Library

## Environment variables

Create `.env.local` from `.env.example`.

Required for Supabase mode:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional AWS mode:

- `CARRYGO_BACKEND_PROVIDER=aws`
- `CARRYGO_AWS_API_BASE_URL`
- `CARRYGO_AWS_API_BEARER_TOKEN`

Cloudinary document delivery:

- `CLOUDINARY_CLOUD_NAME`

## Scripts

- `pnpm run dev` - start local dev server
- `pnpm run lint` - run ESLint
- `pnpm run test:run` - run test suite once
- `pnpm run build` - production build validation

## Security model

- Route protection and session refresh are enforced in `proxy.ts` + `utils/supabase/middleware.ts`.
- Admin authorization is enforced server-side via `requireAdmin()`.
- Dashboard mutations are implemented as server actions and use service-role client checks.
- Security headers and CSP are set in `next.config.ts`.

## Notes

- This is an internal CMS; public indexing is disabled on admin pages.
- If running AWS mode, keep `CARRYGO_AWS_API_BEARER_TOKEN` configured to avoid unauthenticated upstream requests.
