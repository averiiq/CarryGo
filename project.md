 CarryGo Monorepo — Full Codebase Audit

  Project Overview     
  Project: CarryGo/
  Tech Stack: React Native/Expo 53, TypeScript, Supabase, React Query,
    Zustand  Purpose: Mobile app — parcel delivery/carrier matching
  ────────────────────────────────────────
  Project: carrygo-cms/
  Tech Stack: Next.js (App Router), TypeScript, Supabase
  Purpose: Admin CMS panel

  ---
  CRITICAL Issues (Fix Immediately)

  1. Supabase Credentials Committed to Git History

  Mobile app .env was committed in earlier commits (645b93ff, b5f626408).
  Even though .gitignore now excludes it, the full anon key, URL, and
  publishable key are permanently in git history.

  Action: Rotate ALL Supabase keys immediately. Use BFG Repo-Cleaner to   
  purge .env from history.

  2. Payment Race Condition

  services/payments.service.ts uses check-then-update without database    
  locking. Concurrent requests can double-release funds.

  Action: Move to a Supabase RPC with FOR UPDATE row-level lock or atomic 
  transaction.

  3. CMS Admin Privilege Escalation

  - Role cookie cached for 5 minutes — demoted admins retain access during
   that window
  - Server Actions don't prevent admins from modifying other admins       
  (UI-only guard, not enforced server-side)

  Action: Remove role caching or reduce to <30s. Add resource ownership   
  checks in all server actions.

  ---
  HIGH Issues

  #: 4
  Finding: Vulnerable deps (shell-quote, glob, tar)
  Location: Mobile package.json
  ────────────────────────────────────────
  #: 5
  Finding: Auth validation is client-side only — depends on RLS being     
    correct
  Location: AuthContext.tsx
  ────────────────────────────────────────
  #: 6
  Finding: No input sanitization on user content (messages, descriptions) 
  Location: Multiple services
  ────────────────────────────────────────
  #: 7
  Finding: No rate limiting on payment, request, profile operations       
  Location: Mobile services
  ────────────────────────────────────────
  #: 8
  Finding: No rate limiting on CMS login or admin actions
  Location: CMS server actions
  ────────────────────────────────────────
  #: 9
  Finding: Missing CSRF protection in CMS
  Location: Next.js server actions
  ────────────────────────────────────────
  #: 10
  Finding: No security headers (CSP, HSTS, X-Frame-Options) in CMS        
  Location: next.config.ts
  ────────────────────────────────────────
  #: 11
  Finding: No pagination in listing queries — unbounded data fetch        
  Location: fetchTrips, fetchParcels
  ────────────────────────────────────────
  #: 12
  Finding: Large screen files (5 files >600 lines) need splitting
  Location: my-activity.tsx, delivery/[id].tsx, etc.
  ────────────────────────────────────────
  #: 13
  Finding: Massive DRY violation — identical mapRow patterns across 10    
    services
  Location: All *.service.ts files

  ---
  MEDIUM Issues

  #: 14
  Finding: Web sessions stored in localStorage (XSS-vulnerable)
  Location: template/core/client.ts
  ────────────────────────────────────────
  #: 15
  Finding: Push tokens in publicly queryable user_profiles table
  Location: notifications.service.ts
  ────────────────────────────────────────
  #: 16
  Finding: Inconsistent error handling (mixed {data, error} / {success,   
    error})
  Location: Across services
  ────────────────────────────────────────
  #: 17
  Finding: TypeScript any usage in realtime subscription
  Location: features/conversations/queries.ts
  ────────────────────────────────────────
  #: 18
  Finding: Insecure image loading in KYC viewer (no URL validation)       
  Location: CMS KycTable.tsx
  ────────────────────────────────────────
  #: 19
  Finding: Global realtime subscriptions (all table changes, not
    user-scoped)
  Location: features/listings/queries.ts
  ────────────────────────────────────────
  #: 20
  Finding: No shared types between mobile and CMS — same DB, zero type    
    contract
  Location: Both projects

  ---
  Architecture Strengths

  - Clean unidirectional data flow: Supabase → services → React Query →   
  components
  - Centralized query key factory preventing cache collisions
  - Immutable cache updates in mutation callbacks
  - Feature flags with dual-gate pattern (code + env var)
  - Proper use of Expo Secure Store on native, OTP with server-side rate  
  limiting
  - Server-side data fetching in CMS with requireAdmin() guard
  - Well-organized feature/component/service separation

  ---
  Architecture Weaknesses

  - No monorepo tooling — two independent projects, no workspace
  coordination
  - No shared types package — schema changes silently break the CMS       
  - Bloated mobile dependencies — unused packages (immutable,
  react-native-elements AND react-native-paper, nativewind not adopted,   
  react-native-webrtc)
  - template/ directory confusingly named, contains @ts-nocheck and       
  "OnSpace" branding from a project generator
  - Zero test infrastructure in the CMS
  - No background job system — notifications/matching happen inline       

  ---
  Priority Action Plan

  P0 — This Week (Security Critical)

  1. Rotate all Supabase credentials
  2. Purge .env from git history
  3. Fix payment race condition with DB-level locking
  4. Add resource ownership checks to CMS server actions
  5. Update vulnerable dependencies

  P1 — Next 2 Weeks

  6. Add pagination to all listing queries
  7. Add rate limiting to CMS login and critical mobile operations        
  8. Add security headers to CMS next.config.ts
  9. Add Zod validation to CMS server actions
  10. Implement comprehensive input sanitization (Zod schemas for mobile  
  services)

  P2 — Next Sprint

  11. Create shared types package (packages/shared-types/)
  12. Add pnpm-workspace.yaml for monorepo coordination
  13. Split large screen files (>600 lines)
  14. Extract generic mapRow utility to eliminate service duplication     
  15. Audit and prune unused mobile dependencies
  16. Scope realtime subscriptions to user-relevant data
  17. Rename template/ → lib/supabase/, remove @ts-nocheck

  P3 — Backlog

  18. Add test infrastructure to CMS
  19. Standardize service response envelope (ServiceResult<T>)
  20. Add audit logging for admin actions
  21. Create useRealtimeSubscription reusable hook

  ---
  Scorecard

  Dimension: Architecture
  Score: B+
  Notes: Clean layers, good patterns, needs shared types
  ────────────────────────────────────────
  Dimension: Security
  Score: D
  Notes: Critical credential exposure, missing server-side validation     
  ────────────────────────────────────────
  Dimension: Code Quality
  Score: B
  Notes: Good TypeScript usage, DRY violations at scale
  ────────────────────────────────────────
  Dimension: Scalability
  Score: C
  Notes: No pagination, unbounded subscriptions
  ────────────────────────────────────────
  Dimension: Testing
  Score: D
  Notes: No meaningful test coverage in either project
  ────────────────────────────────────────
  Dimension: Dependencies
  Score: C+
  Notes: Bloated mobile deps, CMS is lean

  Overall: Solid architecture with critical security gaps that need       
  immediate attention. The codebase patterns are well-designed for growth,
   but the security fundamentals (credential rotation, input validation,  
  rate limiting) must be addressed before any production deployment.   



    Executive Summary

  The codebase shows strong engineering fundamentals — clean layer separation, atomic server-side domain commands, comprehensive RLS, and defense-in-depth security.       
  However, there are blockers for production that need addressing.

  ---
  CRITICAL (Fix Before Launch)

  #: S1
  Issue: Exposed Supabase credentials in .env — if ever committed to git, rotate immediately
  Location: .env lines 2-3
  ────────────────────────────────────────
  #: S2
  Issue: Dependency vulnerabilities — shell-quote (RCE), tar (arbitrary file write), minimatch (ReDoS)
  Location: package.json transitive deps
  ────────────────────────────────────────
  #: A1
  Issue: Monitoring is a dead buffer — captureException pushes to an in-memory array that's never drained. Production crashes will go undetected.
  Location: lib/monitoring.ts

  ---
  HIGH (Required for Production Quality)

  ┌─────┬──────────────┬───────────────────────────────────────────────────────────────────┬─────────────────────────────────────────────────────────────────┐
  │  #  │   Category   │                               Issue                               │                               Fix                               │
  ├─────┼──────────────┼───────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ S3  │ Security     │ No DELETE policies on any table (GDPR Right to Erasure violation) │ Add scoped DELETE policies for trips, parcels, notifications    │
  ├─────┼──────────────┼───────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ S4  │ Security     │ Rate limiters exist but aren't called from service layer          │ Integrate requestLimiter/check_api_rate_limit in write services │
  ├─────┼──────────────┼───────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ A2  │ Architecture │ No optimistic updates for chat send — UX delay on messages        │ Add optimistic cache insert in useSendMessageMutation           │
  ├─────┼──────────────┼───────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ A3  │ Architecture │ Feature flags are compile-time only — no kill-switch              │ Adopt remote config (Supabase app_config table or Statsig)      │
  ├─────┼──────────────┼───────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ A4  │ Architecture │ No query persistence — "offline-first" incomplete                 │ Add persistQueryClient with AsyncStorage                        │
  ├─────┼──────────────┼───────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ A5  │ Architecture │ Realtime subscriptions unscoped — firehose at scale               │ Filter by route pair, or subscribe only when screen active      │
  ├─────┼──────────────┼───────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ A6  │ Architecture │ user_profiles SELECT policy blocks marketplace discovery          │ Add public-read policy for username/rating/verified             │
  ├─────┼──────────────┼───────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ Q1  │ Quality      │ 8 files exceed 700 lines (max: my-activity.tsx at 731)            │ Extract sub-components                                          │
  ├─────┼──────────────┼───────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ Q2  │ Quality      │ 32+ any type usages defeat TypeScript                             │ Type realtime payloads, refs, scroll handlers                   │
  ├─────┼──────────────┼───────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ Q3  │ Quality      │ Index-based keys in .map() lists                                  │ Use item.id or item.label                                       │
  └─────┴──────────────┴───────────────────────────────────────────────────────────────────┴─────────────────────────────────────────────────────────────────┘

  ---
  MEDIUM (Should Fix, Not Blocking)

  ┌─────┬──────────────────────────────────────────────────────────────────────────┬──────────────────────────────────────────────────────────┐
  │  #  │                                  Issue                                   │                          Impact                          │
  ├─────┼──────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────┤
  │ S5  │ Weak OTP generation (random() not cryptographic)                         │ Low practical risk due to bcrypt, but fix for compliance │
  ├─────┼──────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────┤
  │ S6  │ No audit logging for payment release/refund                              │ PCI DSS / dispute resolution gap                         │
  ├─────┼──────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────┤
  │ A7  │ Denormalized user_name in trips/requests drifts from profile             │ Ghost identities after profile update                    │
  ├─────┼──────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────┤
  │ A8  │ Outbox lacks retry backoff — stuck events stay processing forever        │ Silent notification failures                             │
  ├─────┼──────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────┤
  │ A9  │ secureClearAll reads AsyncStorage for SecureStore keys — never finds any │ Dead code, silently does nothing                         │
  ├─────┼──────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────┤
  │ Q4  │ Missing useMemo on search filter computations                            │ Unnecessary re-renders                                   │
  ├─────┼──────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────┤
  │ Q5  │ Animation hooks don't guard against unmounted components                 │ React warnings when delayed animations fire post-unmount │
  ├─────┼──────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────┤
  │ Q6  │ No test coverage for business logic (matching, pricing, services)        │ Regression risk                                          │
  ├─────┼──────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────┤
  │ Q7  │ Hardcoded theme colors bypass the theme system                           │ Dark mode inconsistencies                                │
  └─────┴──────────────────────────────────────────────────────────────────────────┴──────────────────────────────────────────────────────────┘

  ---
  LOW

  - Client-side feature flags bypassable (but server RPCs still enforce)
  - Magic numbers in animation durations (should use constants)
  - Conversations realtime subscription overly broad
  - Missing parcel_status = 'cancelled' in SQL enum (exists in TS type)

  ---
  Scalability Assessment

  ┌────────────┬──────────────────────────────────────────────────────────────────────────┬─────────────────────────────────────────────────────────┐
  │   Scale    │                                Bottleneck                                │                       Mitigation                        │
  ├────────────┼──────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────┤
  │ 10K users  │ Architecture adequate                                                    │ Monitor realtime connections                            │
  ├────────────┼──────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────┤
  │ 100K users │ Unfiltered realtime subs cause WAL decode load; outbox table bloats      │ Scope channels per-route; verify pg_cron active         │
  ├────────────┼──────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────┤
  │ 1M users   │ Single Postgres write throughput; client-side matching fetches ALL trips │ Read replicas; server-side matching; connection pooling │
  └────────────┴──────────────────────────────────────────────────────────────────────────┴─────────────────────────────────────────────────────────┘

  ---
  Recommended Action Plan

  Week 1 (Launch Blockers)

  1. Rotate Supabase credentials (supabase secrets set + dashboard)
  2. pnpm update to patch vulnerabilities, verify with pnpm audit
  3. Integrate Sentry (@sentry/react-native) — replace monitoring buffer
  4. Update eas.json production profile: APP_MODE=production
  5. Set EAS secrets for Supabase URL/key

  Week 2 (High Priority)

  6. Add optimistic updates to chat send mutation
  7. Add persistQueryClient for offline hydration
  8. Add public-read profile policy in Supabase
  9. Scope realtime subscriptions to active route pair
  10. Split oversized screen files, fix any types and list keys

  Week 3 (Compliance & Quality)

  11. Add DELETE policies for user-facing tables
  12. Integrate server rate limiting in all write services
  13. Add audit logging for payment operations
  14. Add unit tests for matching/pricing algorithms

## 2026-08-30 Live Audit Refresh

### Validation Commands and Outcomes
- `pnpm -C CarryGo run typecheck` ✅ pass
- `pnpm -C CarryGo run test:verify` ✅ pass (RLS/domain/phase4 checks)
- `pnpm -C CarryGo run build:web` ❌ fail (`Cannot find module 'minipass'` from Expo CLI dependency chain)
- `npx -C CarryGo expo-doctor@latest` ❌ blocked (`expo config --json --full` exits non-zero)
- `pnpm -C carrygo-cms run build` ❌ fail in this environment due `next/font` Google Fonts fetch errors
- `pnpm -C carrygo-cms run test:run` ✅ pass (34/34 tests)
- `pnpm -C backend run typecheck` ✅ pass

### Security/Integrity Recheck
- `release_payment_atomic` and `refund_payment_atomic` now derive identity from `auth.uid()` and ignore client `p_actor_id`.
- `carrygo-cms/app/dashboard/bulk/actions.ts` now consistently gates actions through `requireAdmin()`.
- `x-cms-role` short TTL cookie (30 seconds) remains in `carrygo-cms/utils/supabase/middleware.ts`.

### Dependency Audit Recheck
- `CarryGo` (`pnpm audit --audit-level moderate`): 3 vulnerabilities (`2 high`, `1 moderate`), primarily transitive `image-size` and `ajv`.
- `carrygo-cms` (`npm audit --audit-level=moderate`): 0 vulnerabilities.

### Immediate Next Actions
1. Repair/reinstall mobile dependencies (fix missing `minipass`) and rerun `build:web` + `expo-doctor`.
2. Make CMS font loading deterministic for builds (self-host or configure network/proxy).
3. Apply/verify transitive dependency remediations for `image-size` and `ajv`.
