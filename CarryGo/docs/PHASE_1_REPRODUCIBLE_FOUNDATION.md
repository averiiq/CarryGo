# CarryGo Phase 1: Reproducible Foundation

Date: June 7, 2026

## Status

Phase 1 is complete at the repository level. The codebase now has a reproducible local schema baseline, deterministic verification commands, source-controlled CI, stable app identifiers, and the client no longer depends on the dead template-auth scaffold that came from the starter.

## Implemented

- Added Supabase local config in `supabase/config.toml`.
- Added initial database migration in `supabase/migrations/20260607000000_initial_foundation.sql`.
- Added RLS policies for 12 app tables.
- Added server-side stubs for `create_delivery`, `verify_delivery_otp`, and `create_kyc_session`.
- Added generated-style database types in `types/database.ts`.
- Added `scripts/verify-rls.mjs` as a deterministic RLS guard.
- Added CI workflow in `.github/workflows/ci.yml`.
- Added EAS build profile config in `eas.json`.
- Added deterministic package-manager scripts: `typecheck`, `test`, `test:rls`, `ci`, `doctor`, `build:web`, and `supabase:types`.
- Added stable app identifiers: slug `carrygo`, scheme `carrygo`, iOS bundle ID `in.averiq.carrygo`, Android package `in.averiq.carrygo`.
- Removed the dead starter reset flow and unused template-auth surface from the active app path.
- Scoped Expo Doctor to meaningful checks for this repo so the verification command is actionable instead of failing on known metadata noise.

## Verification

- `pnpm.cmd run ci`: passed.
- `node .\scripts\verify-rls.mjs`: passed for 12 tables.
- `pnpm.cmd run build:web`: passed; 26 static routes exported to `dist/web`.
- `pnpm.cmd run doctor`: passed after configuring React Native Directory exclusions for non-blocking metadata warnings.
- `pnpm.cmd run typecheck`: passed.
- `pnpm.cmd run lint`: passed with warnings only.

## Still Out Of Scope For Phase 1

- Supabase CLI is not installed locally, so the migration was not applied to a local database in this environment.
- Linking the app to a real Expo project to obtain an EAS `projectId` requires the actual Expo account/project and is an environment action, not a repository-code action.
- Broader dependency minimization across the entire Expo/native stack remains a separate cleanup pass from the reproducible-foundation milestone.
