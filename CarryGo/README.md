# CarryGo

CarryGo is an Expo Router and React Native app for peer-to-peer parcel delivery. This repository is currently a demo-stage client with launch-containment safeguards enabled by default.

## Current Safety Posture

- KYC is unavailable until a compliant provider is integrated.
- Payments are unavailable until a real payment provider is integrated.
- Secure delivery confirmation is unavailable until trusted server-side verification is deployed.
- Parcel and trip creation remain paused in demo mode until the production trust stack exists.

See [docs/PHASE_0_LAUNCH_CONTAINMENT.md](./docs/PHASE_0_LAUNCH_CONTAINMENT.md) and [docs/CARRYGO_CODEBASE_QUALITY_REPORT.md](./docs/CARRYGO_CODEBASE_QUALITY_REPORT.md) for the current rollout and risk status.

## Getting Started

Install dependencies:

```bash
pnpm install
```

Run the app:

```bash
pnpm run start
pnpm run android
pnpm run ios
pnpm run web
```

## Environment

Use `.env.example` as the reference template and keep all safety flags disabled unless the corresponding provider-backed backend flow exists.

Only public Expo client variables belong in local env. Never commit service-role keys or other private credentials.

## Verification

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build:web
```

## Repository Notes

- This repo is private.
- `supabase/migrations/` contains the current source-controlled schema baseline.
- `constants/featureFlags.ts` is the readiness gate for launch-sensitive features.
