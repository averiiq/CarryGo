# CarryGo AWS Core Stack Implementation Baseline

This update implements the recommended core stack as deployable code scaffolding.

## What is now in the repo

- `infrastructure/` CDK app for core AWS platform resources
- `backend/` modular-monolith Lambda backend skeleton
- `CarryGo/` AWS-provider-aware service wiring for trips/parcels/requests
- `carrygo-cms/` AWS API utility + dashboard health probe wiring
- `carrygo-cms/` AWS-mode dashboard surfaces wired for trips/parcels/disputes actions

## Implemented core stack mapping

- Route 53: optional CloudFront alias records when zone + aliases are configured
- ACM: optional pre-issued certificate ARN for CloudFront custom domains
- CloudFront: private S3 origin, SPA routing, separate `api/*` behavior
- S3: private web bucket + private uploads bucket
- API Gateway HTTP API: `/health` and protected `/api/{proxy+}` routes
- Cognito: user pool + app client, JWT authorizer wiring
- Lambda: API handler + SQS worker + EventBridge scheduler
- DynamoDB: single table with GSIs and PITR enabled
- SQS/DLQ: async queue, dead-letter queue, Lambda event source mapping
- EventBridge: custom event bus + 5-minute schedule rule
- SNS: notifications topic
- SES: optional sender identity provisioning
- CloudWatch: API/Lambda/queue alarms
- CloudTrail: management + S3 data event auditing

## Important current scope

This is the production foundation, not a full Supabase feature migration yet.

The mobile app and CMS still run their current Supabase-driven runtime paths until
feature-by-feature migration is completed.

Provider controls added:

- Mobile: `EXPO_PUBLIC_BACKEND_PROVIDER` (`supabase` | `aws`), `EXPO_PUBLIC_AWS_API_BASE_URL`
- CMS: `CARRYGO_BACKEND_PROVIDER` (`supabase` | `aws`), `CARRYGO_AWS_API_BASE_URL`

## Next migration phases

1. Create data model mapping from Supabase tables/RPC to DynamoDB keys and GSIs.
2. Implement Lambda modules for trips/parcels/requests/payments/ratings.
3. Add adapter clients in `CarryGo/` and `carrygo-cms/` for AWS API + Cognito.
4. Run dual-write + shadow-read in staging, then cut over module-by-module.
5. Decommission Supabase only after parity, load, and rollback tests pass.
