# CarryGo AWS Core Stack (CDK)

This folder implements the recommended production baseline as Infrastructure as Code:

- Route 53 (optional alias records)
- ACM (optional pre-created cert ARN for CloudFront)
- CloudFront
- S3 (web + uploads, both private)
- API Gateway HTTP API
- Cognito User Pool + App Client
- Lambda (API, worker, scheduler)
- DynamoDB (single-table + GSIs)
- SQS + DLQ
- EventBridge
- SNS
- SES identity (optional)
- CloudWatch alarms
- CloudTrail

## Prerequisites

- AWS account credentials configured for CDK (`CDK_DEFAULT_ACCOUNT`, `CDK_DEFAULT_REGION`)
- Node.js 20+

## Install

```bash
cd infrastructure
npm install
```

## Configure

Use CDK context flags or env vars.

Common values:

- `projectName` (default: `carrygo`)
- `stage` (default: `dev`)
- `allowedOrigins` (CSV; default: `*`)
- `cloudFrontAliases` (CSV; optional)
- `cloudFrontCertificateArn` (optional; required if aliases are used)
- `hostedZoneName` (optional; required to create Route53 aliases)
- `sesSenderDomain` (optional)

Example synth:

```bash
npx cdk synth \
  -c projectName=carrygo \
  -c stage=staging \
  -c allowedOrigins=https://app.carrygo.in,https://admin.carrygo.in \
  -c cloudFrontAliases=app.carrygo.in \
  -c cloudFrontCertificateArn=arn:aws:acm:us-east-1:123456789012:certificate/xxxx \
  -c hostedZoneName=carrygo.in
```

## Deploy

```bash
npx cdk bootstrap
npx cdk deploy --all
```

## Notes

- Lambda entrypoint is `../backend/src/lambda.ts`.
- `bookings.reserve` flow in backend uses DynamoDB transactions for idempotency and concurrency-safe capacity updates.
- Keep `DynamoDB Scan` out of request paths; query by PK/SK or GSIs only.
- Core API routes currently wired: `health`, `bookings/reserve`, `trips`, `parcels`, `requests`.
- After deployment, use `ApiEndpoint` output to set:
  - `CarryGo/.env` -> `EXPO_PUBLIC_AWS_API_BASE_URL`
  - `carrygo-cms/.env.local` -> `CARRYGO_AWS_API_BASE_URL`
