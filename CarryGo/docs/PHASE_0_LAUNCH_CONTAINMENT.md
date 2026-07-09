# CarryGo Phase 0: Launch Containment

Date: June 7, 2026

## Status

Phase 0 is implemented in the working tree. Unsafe or simulated trust features are disabled by default and also require a code-level readiness switch before an environment variable can enable them.

## Implemented Controls

- Removed the exposed GitHub token from the current source tree.
- Stopped tracking `.env`, `.expo/`, and `expo-env.d.ts` while preserving local copies.
- Added `.env.example` with public client configuration and disabled safety defaults.
- Added centralized readiness and environment flags for KYC, payments, secure delivery confirmation, and precise location sharing.
- Removed client-visible delivery OTP data and client-side OTP comparison.
- Restricted delivery reads to explicit non-OTP columns.
- Guarded delivery, payment, KYC, and location service operations.
- Replaced the simulated KYC document flow with an unavailable-provider notice.
- Replaced the simulated payment screen with an informational quote and unavailable-provider notice.
- Paused parcel and trip creation until compliant identity verification exists.
- Removed launch-facing claims that implied active escrow, automatic payment release, or completed identity verification.
- Excluded Supabase Deno edge functions from the Expo TypeScript program.

## Required External Actions

1. Revoke the exposed GitHub personal access token immediately. Removing it from the current file does not invalidate it.
2. Purge the token from all Git history and force-push rewritten branches and tags before making the repository public.
3. Rotate any other credentials that were stored in tracked `.env` history if they were not intentionally public client keys.
4. Review Supabase Row Level Security policies before enabling marketplace writes.

## Verification

- `npx.cmd tsc --noEmit`: passed.
- `npm.cmd run lint`: passed with 0 errors and 87 existing warnings.
- `npx.cmd expo export --platform web --output-dir dist/phase0-web`: passed; 25 static routes exported.
- Secret and unsafe-pattern scan of active application source: no GitHub token, client OTP field, simulated KYC URI, or sensitive KYC document field references found.
- Expo Doctor: 14 of 18 checks passed. Remaining failures concern dependency compatibility, a directly installed Expo internal package, and React Native Directory maintenance/New Architecture metadata.

## Enablement Rule

Do not change a readiness switch in `constants/featureFlags.ts` to `true` until the corresponding provider-backed server flow, authorization policy, audit trail, error handling, and end-to-end tests are implemented.
