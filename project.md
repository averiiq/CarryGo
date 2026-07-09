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