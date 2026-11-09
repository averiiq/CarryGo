# CarryGo — Coins and Rewards System

## 1. Purpose
Build a new Coins/Rewards functionality from scratch for both Travelers and Senders. The app currently has no such functionality.

## 2. Why this change is needed
- Encourage Travelers to continue providing reliable parcel delivery service.
- Encourage Senders to prepare and send parcels responsibly and complete successful transfers.
- Give both user types a clear, automatically credited reward after eligible successful transfers.
- Allow the product owner/admin to configure the coin award amount rather than hard-coding it.

## 3. Confirmed product requirements
### 3.1 Both user types
- Travelers and Senders can earn coins.
- Coins are awarded automatically after a successful parcel delivery/transfer, subject to the final eligibility rules approved by the product owner.
- Admin-configurable rules determine how many coins are awarded per successful delivery/transfer.
- Ratings and service quality may be considered as reward criteria, as described below, but the exact formula is not yet specified.

### 3.2 Traveler rewards
- Travelers can redeem earned coins for rewards such as coupons.
- Third-party coupon integrations may be considered for coupon fulfillment.
- Do not choose a provider or implement a third-party integration until the provider, credentials, commercial terms, and integration requirements are confirmed.

### 3.3 Sender rewards
- Senders can redeem coins for coupons.
- Senders can also use coins as credit/balance toward parcel-sending charges.
- Conversion for sender parcel credit is fixed at **10 coins = ₹1** (₹0.10 per coin).
- Examples: 100 coins = ₹10; 1,000 coins = ₹100.

### 3.4 Admin controls
- The admin panel must allow authorized admins to configure the coin award amount per eligible successful delivery/transfer.
- Awarding must be automatic; admins should not need to manually credit coins for each normal successful delivery.
- Only add other admin controls after their behavior is defined and approved.

## 4. Scope
### Included
- Inspect the existing app, backend, database, authentication/user roles, parcel lifecycle, delivery completion logic, and admin panel before implementation.
- Design and implement the smallest complete system that fits the existing architecture.
- Track coin balances and coin earning/redemption transactions reliably.
- Automatically credit eligible coins after a confirmed successful delivery/transfer.
- Add the required admin setting for coins awarded per eligible success.
- Support sender coin redemption as parcel-sending credit using the fixed conversion rate.
- Provide a way for users to see their coin balance and relevant coin transaction history, using existing UI conventions.
- Provide a redemption flow for coupons only to the extent that the reward catalog and redemption behavior are defined and can be implemented without inventing product policy.

### Explicitly excluded unless separately approved
- Cash withdrawal, bank transfer, or conversion of coins to cash.
- Coins as a payment method for Travelers' expenses or any use other than stated Traveler rewards.
- New subscription tiers, referrals, leaderboards, streaks, badges, multipliers, expiry, or promotional campaigns.
- A specific third-party coupon provider or paid integration before approval.
- Changing existing parcel prices, commission, payment provider, escrow, refund, dispute, or payout logic except where an explicitly approved sender-credit redemption requires a narrow integration.
- Manually awarding coins as the normal delivery flow.
- Deleting or replacing existing app features.

## 5. Important rules and integrity requirements
1. A coin award must be tied to a confirmed successful delivery/transfer state, not merely a booking, request, acceptance, pickup, or user-submitted claim.
2. The same parcel transfer must not earn duplicate coins because of retries, repeated status updates, app restarts, or duplicate events. Use an idempotent award mechanism appropriate to the existing backend.
3. Coin balance changes must be recorded as transactions, not implemented only by changing a displayed number.
4. Coin balance and redemption validation must be performed by trusted backend logic; do not trust client-calculated balances or redemption amounts.
5. Sender conversion must use 10 coins = ₹1. Define rounding so partial rupee amounts are handled consistently; do not silently round in the user's favor or against them. If existing charge rules do not settle this, ask the product owner before enabling redemption.
6. A redemption must not spend more coins than the available balance. Prevent duplicate redemption and concurrent double-spend.
7. Do not award coins for failed, cancelled, disputed, or reversed transfers unless a separate policy is explicitly approved.
8. Rating/service-quality conditions are not fully defined. Do not invent a rating threshold, bonus, penalty, or formula. Keep the initial award rule limited to confirmed success plus the admin-configured base amount unless the product owner approves a more detailed rule.
9. Do not implement coin expiry, reversals, negative balances, refund treatment, or fraud penalties without an explicit policy. If these are necessary for a safe launch, stop and ask for a decision.
10. Do not claim coupon redemption is available until a reward catalog/provider and fulfillment flow have been selected and configured.

## 6. Implementation instructions for the coding agent
1. Inspect the repository before coding. Identify the current app framework, backend services, database, parcel status lifecycle, trusted success event, admin panel structure, and existing payment/credit flow.
2. Before editing, provide a short implementation plan naming the exact files/modules likely to change and explaining how successful transfer completion is currently verified.
3. Reuse the existing architecture and conventions. Do not migrate frameworks, replace the database, add a new service, or introduce dependencies unless necessary; if necessary, explain the reason and request approval first.
4. Implement an auditable coin ledger or equivalent transaction model that fits the existing database. Record, at minimum, user, transaction type, coin amount, reason/reference to the parcel transfer when applicable, timestamp, and resulting/derivable balance. Follow current schema conventions and do not assume field names without inspecting the code.
5. Implement automatic award processing on the backend at the existing trusted successful-completion point. Ensure it is idempotent and safe under retries/concurrent processing.
6. Add an admin-configurable base award amount. Validate input and restrict edits to authorized admin roles already present in the system.
7. Display each user's balance and relevant transaction history using existing UI patterns; expose only the current user's own records except for authorized admin views.
8. Implement sender parcel-credit redemption at 10 coins per ₹1 only after tracing the current parcel pricing/payment flow. Show the conversion clearly and validate balance and final amount on the backend. Do not silently change the existing checkout or payment process.
9. Build coupon redemption only after confirming the reward catalog, redemption values, coupon fulfillment method, and any third-party provider. If these are not available in the repository or supplied configuration, implement no fake coupon fulfillment; report the blocker and leave the integration as a clearly identified pending item.
10. Do not add a rating-based bonus/eligibility formula until approved. Keep ratings visible as existing data only; do not change rating behavior.
11. Add tests for award idempotency, successful versus unsuccessful statuses, admin authorization/configuration, balance accuracy, sender conversion, insufficient balance, and duplicate/concurrent redemption.
12. Summarize changed files, database changes, configuration requirements, tests, and any decisions still needed.

## 7. Acceptance criteria
- [ ] The system is built from scratch in the existing architecture; no unrelated rewrite is performed.
- [ ] An eligible confirmed successful transfer automatically credits the admin-configured coin amount.
- [ ] Repeated events/retries cannot award coins twice for the same transfer.
- [ ] Failed/cancelled transfers do not earn coins under the initial rule.
- [ ] Traveler and Sender balances are tracked separately per user account, not shared between users.
- [ ] Users can view their own balance and transaction history.
- [ ] Authorized admins can configure the base award amount.
- [ ] Sender credit conversion is exactly 10 coins = ₹1, with rounding behavior explicitly resolved before launch.
- [ ] Sender redemption cannot exceed available coins and cannot double-spend under concurrent requests.
- [ ] Coupon integration is either implemented against an explicitly approved provider/catalog or reported as blocked; no fake or placeholder redemption success is shown.
- [ ] No unapproved rating formula, expiry, cash-out, referral, or extra rewards feature is added.
- [ ] Tests cover the key success, failure, retry, and redemption paths.

## 8. Product decisions that must not be guessed
The following details are not specified yet. Inspect the code for existing constraints, but ask the product owner before choosing a new policy:
- Exact minimum rating or service-quality rule, if any, for earning coins.
- Whether the base coin award differs between Traveler and Sender, or is the same configurable amount for both. The current requirement says both earn coins and the admin sets the amount per successful transfer, but does not fully specify separate settings.
- Whether an award can be reversed after a refund, dispute, chargeback, or delivery reversal.
- Coin expiry, if any.
- Sender-credit rounding behavior for amounts that do not divide into whole rupees.
- Coupon catalog, coin price per coupon, eligible users, provider, and fulfillment process.
- Whether sender coin credit applies before payment, at checkout, or to a wallet/balance already present in the app. Inspect the current implementation and ask if it is not clear.

Do not block basic architecture inspection on these questions. Implement only clearly defined portions, and do not enable unresolved policy paths in production until approved.

## 9. Required final report
Provide:
- Current success event/state used to trigger coin awards.
- Files/modules changed and why.
- Database/schema changes and migration steps, if any.
- Award idempotency strategy.
- How admins configure coin awards.
- How Sender conversion and redemption are validated.
- Tests performed and results.
- Coupon integration status and any required provider configuration.
- The unresolved product decisions above that need approval.

## 10. Change-control rule
Implement only what is stated in this document and what is necessary to make those requirements work safely in the existing system. Do not add features, remove existing features, refactor unrelated code, invent product policy, or assume third-party services. If a decision is not defined here or evident from the existing code, ask before implementing that decision.
