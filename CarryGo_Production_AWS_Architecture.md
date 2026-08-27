# CarryGo — Production-Grade, Cost-Optimized AWS Architecture

**Purpose:** Production architecture and implementation blueprint for CarryGo.

**Primary goals**
- Fast user experience
- Production-grade security and reliability
- Low fixed/idle cost
- Simple implementation for a small engineering team
- AWS-only infrastructure for platform services
- Clear path from MVP to large-scale production

**Recommended baseline:** Serverless, event-driven, modular monolith.

---

## 1. Executive Architecture Decision

CarryGo should **not** start with Kubernetes, ECS, Aurora, Redis/ElastiCache, OpenSearch, Kafka/MSK, or a large fleet of microservices.

Use this core stack:

```text
Users / Web / Mobile
        |
        v
   Route 53 + ACM
        |
        v
    CloudFront
     /      \
    v        v
 S3 Web   API Gateway HTTP API
             |
             v
      Cognito JWT Authorizer
             |
             v
       Lambda Application
       Modular Monolith
             |
      +------+-------+----------------+
      |              |                |
      v              v                v
  DynamoDB          S3              SQS + DLQ
      |              |                |
      |              |                v
      |              |          Worker Lambda
      |              |                |
      +--------------+---------+------+
                               |
                         EventBridge
                               |
                       SNS / SES / Jobs

All AWS resources -> CloudWatch + CloudTrail
```

AWS's own serverless reference architecture uses the same broad pattern of CloudFront/S3 for presentation, API Gateway/Lambda for logic, Cognito for identity, and DynamoDB for data. AWS specifically describes serverless as a way to scale with demand, reduce operational overhead, and avoid paying for idle infrastructure. citeturn0search1turn0search2

---

# 2. Architecture Principles

## 2.1 Serverless-first

Prefer pay-per-use managed services over always-running infrastructure.

Avoid paying for idle:
- EC2
- ECS services
- EKS/Kubernetes
- Redis clusters
- database instances

## 2.2 Modular monolith first

Do **not** create 10–20 microservices on day one.

Use one backend codebase with strict domain modules:

```text
backend/src/modules/
  auth/
  users/
  trips/
  parcels/
  matching/
  bookings/
  payments/
  tracking/
  ratings/
  notifications/
  admin/
```

Deploy as Lambda functions/handlers while keeping the domain boundaries clean. Extract a hot module into an independent service only when metrics justify it.

## 2.3 Synchronous only for user-critical work

The API should validate, authorize, perform the minimum required database operation, and return.

Everything non-critical should be asynchronous:
- notifications
- emails
- image processing
- reminders
- analytics events
- retries
- cleanup

## 2.4 Optimize for measured traffic

Build the system so it can scale, but do not provision expensive capacity before there is demand.

---

# 3. AWS Service Selection

| Requirement | AWS service | Why |
|---|---|---|
| DNS | Route 53 | AWS-native DNS |
| TLS | ACM | Managed certificates |
| Frontend | S3 | Very low-cost object/static hosting |
| CDN | CloudFront | Edge caching and fast global delivery |
| API | API Gateway HTTP API | Lower cost and latency than REST API when required features fit |
| Auth | Cognito User Pools | Managed identity/JWT |
| Compute | Lambda | Pay-per-use, autoscaling |
| Primary DB | DynamoDB | Serverless, low operational overhead |
| Files/images | S3 | Durable and inexpensive |
| Async queue | SQS | Reliable background processing |
| DLQ | SQS DLQ | Failure isolation |
| Events/schedules | EventBridge | Scheduled and event-driven jobs |
| Email | SES | Low-cost transactional email |
| Fan-out | SNS | Simple event/notification fan-out |
| Monitoring | CloudWatch | Native logs/metrics/alarms |
| Audit | CloudTrail | AWS API audit trail |
| Secrets/config | Secrets Manager / SSM Parameter Store | Secure configuration |
| Encryption | KMS | Encryption key management |
| Edge/API protection | WAF | Public-facing protection as traffic/risk warrants |
| IaC | AWS CDK (recommended) | TypeScript-friendly infrastructure |

### Important

Do not add an AWS service merely because it is available. Every additional service must have a documented requirement, expected cost, and operational reason.

---

# 4. Frontend Architecture

Recommended:

```text
React / Next.js static frontend
            |
            v
     Private S3 bucket
            |
       CloudFront OAC
            |
            v
         Internet
```

Use a private S3 origin and CloudFront Origin Access Control. Users should not directly access the bucket.

### Cache policy

Long-cache immutable assets:
- JS
- CSS
- fonts
- icons
- hashed images

Shorter cache for HTML/app shell.

Use content hashing:

```text
app.8d13a.js
vendor.92bc1.js
```

### Performance rules

- Code split routes.
- Lazy-load heavy components.
- Compress assets.
- Use WebP/AVIF where appropriate.
- Avoid shipping large libraries for small features.
- Preload only critical assets.
- Keep the initial JavaScript bundle small.
- Cache static assets aggressively through CloudFront.

CloudFront is specifically recommended by AWS for accelerating static content and can also optimize backend access. citeturn0search2

---

# 5. API Architecture

```text
https://api.carrygo.in
        |
        v
API Gateway HTTP API
        |
Cognito JWT Authorizer
        |
        v
Lambda
```

Use `/api/v1` from day one.

Example:

```text
GET    /api/v1/users/me
GET    /api/v1/trips
POST   /api/v1/trips
GET    /api/v1/trips/{tripId}
POST   /api/v1/parcels
GET    /api/v1/matches
POST   /api/v1/bookings
GET    /api/v1/bookings/{bookingId}
POST   /api/v1/payments
GET    /api/v1/tracking/{bookingId}
POST   /api/v1/ratings
```

HTTP APIs are preferred when CarryGo does not need REST API-specific management features. AWS documents HTTP APIs as lower-cost and lower-latency than REST APIs; AWS's comparison notes that HTTP APIs are designed with fewer features so they can be offered at lower cost. citeturn0search0turn0search12

### When NOT to use HTTP API

Move to API Gateway REST API only if CarryGo genuinely needs features unavailable in HTTP APIs, such as specific API-management features or other REST-only requirements. citeturn0search0

---

# 6. Authentication and Authorization

Use Amazon Cognito User Pools.

Flow:

```text
App
  |
  v
Cognito
  |
  v
JWT access token
  |
  v
API Gateway
  |
  v
Lambda
```

Use the verified JWT subject as the authenticated user ID.

Never trust a client-supplied `userId` for authorization.

Recommended roles:

```text
USER
TRAVELER
SENDER
SUPPORT
ADMIN
```

Roles can be represented through Cognito groups/claims, but **authorization must also be enforced in backend code** at resource boundaries.

AWS's reference architecture uses Cognito-issued JWTs with API Gateway and Lambda. citeturn0search1turn0search15

---

# 7. Backend Architecture

Recommended technology:

```text
Node.js
TypeScript
AWS SDK v3
AWS Lambda
Zod
```

Suggested repository:

```text
carrygo/
├── apps/
│   ├── web/
│   ├── mobile/
│   └── admin/
├── backend/
│   └── src/
│       ├── handlers/
│       ├── modules/
│       │   ├── auth/
│       │   ├── users/
│       │   ├── trips/
│       │   ├── parcels/
│       │   ├── matching/
│       │   ├── bookings/
│       │   ├── payments/
│       │   ├── tracking/
│       │   ├── ratings/
│       │   ├── notifications/
│       │   └── admin/
│       ├── shared/
│       │   ├── auth/
│       │   ├── db/
│       │   ├── errors/
│       │   ├── validation/
│       │   └── utils/
│       └── config/
├── infra/
└── packages/
    ├── types/
    └── validation/
```

Keep domain logic independent from AWS-specific plumbing as much as practical.

---

# 8. DynamoDB — Primary Database

Use DynamoDB as the primary transactional store initially.

Why:
- no database server to operate
- scales automatically
- low operational overhead
- good fit for route/trip/parcel/booking access patterns
- conditional writes support concurrency control

AWS recommends on-demand DynamoDB for variable/unpredictable traffic because it avoids paying for idle provisioned capacity and charges for actual request usage. citeturn0search13

## Initial capacity mode

Use **On-Demand** initially.

Review real usage after at least 2–4 weeks of meaningful traffic.

Move stable high-volume tables/indexes to provisioned + autoscaling only if the measured workload makes that cheaper.

---

# 9. DynamoDB Data Model

Do not blindly create one table for everything. Use access patterns to decide table/index design.

For the initial platform, a primary `CarryGo` table can work well if the team is comfortable with single-table design.

Example:

```text
PK                  SK
------------------------------------------------
USER#123            PROFILE
USER#123            TRIP#456
USER#123            BOOKING#789

TRIP#456            META
TRIP#456            MATCH#901

PARCEL#111          META
BOOKING#789         META
BOOKING#789         EVENT#001
```

The exact schema must be finalized only after documenting all production access patterns.

---

# 10. Required Access Patterns

Before creating DynamoDB indexes, document:

### Users

```text
Get profile
Get user's trips
Get user's parcels
Get user's bookings
```

### Travelers

```text
Find upcoming trips
View trip
View requests
Accept/decline request
```

### Senders

```text
Create parcel
Find candidate trips
View booking
Track parcel
```

### Matching

```text
Find trips by route
Find trips by date/time window
Filter by available capacity
Filter by parcel constraints
```

### Admin

```text
Find user
Find booking
Find parcel
Find payment
Find dispute
```

**Never use `Scan` in a latency-sensitive production request path.**

---

# 11. Trip Matching Architecture

Matching is a core CarryGo capability.

Never do:

```text
Scan every trip
    -> filter in Lambda
```

Instead maintain normalized route keys:

```text
originCode
destinationCode
travelDate
departureTime
status
availableCapacity
```

Example GSI access key:

```text
GSI1PK = ROUTE#HISAR#DELHI
GSI1SK = 2026-08-25T15:30:00Z
```

Then:

```text
Route + time window
       |
       v
DynamoDB Query
       |
       v
Small candidate set
       |
       v
Lambda ranking
```

For the MVP, ranking can use:

1. origin/destination match
2. time compatibility
3. available capacity
4. parcel constraints
5. traveler reliability score
6. price
7. urgency

Do not build complex GIS infrastructure until actual traffic demonstrates the need.

---

# 12. Capacity Reservation and Race Conditions

Booking capacity is concurrency-sensitive.

Example:

```text
Trip capacity = 10 kg

User A -> requests 7 kg
User B -> requests 6 kg
```

Both requests cannot succeed.

Use DynamoDB conditional writes and, where necessary, transactional writes.

Conceptually:

```text
Condition:
remainingCapacity >= requestedCapacity

Update:
remainingCapacity = remainingCapacity - requestedCapacity
```

The reservation must be atomic.

---

# 13. Idempotency

Every mutation involving money, booking, capacity or external side effects must support idempotency.

Example:

```http
Idempotency-Key: 6e8e2f...
```

If a mobile client retries due to a timeout:

```text
Request 1 -> booking created
Request 2 -> same idempotency key
             -> return original result
```

Never create duplicate bookings or duplicate payment operations because a client retried a request.

---

# 14. S3 File Architecture

Never send large uploads through Lambda.

Use direct browser/mobile upload:

```text
Client
  |
  | 1. request upload permission
  v
API Gateway -> Lambda
  |
  | 2. pre-signed S3 URL
  v
Client
  |
  | 3. direct upload
  v
S3
```

Store metadata in DynamoDB:

```text
fileId
ownerId
bucket
key
contentType
size
createdAt
```

Use S3 lifecycle policies for temporary/old data.

---

# 15. Image Optimization

When an image is uploaded:

```text
S3 upload
    |
    v
S3 event
    |
    v
Image-processing Lambda
    |
    +--> thumbnail
    +--> small
    +--> medium
    +--> large
```

Serve optimized images through CloudFront.

Do not return original 5–15 MB camera images to mobile clients.

---

# 16. Async Processing — SQS

Use SQS for work that should not block the user request:

- email
- notifications
- image processing
- booking reminders
- analytics events
- retryable external API work
- cleanup

Architecture:

```text
API Lambda
    |
    v
SQS
    |
    v
Worker Lambda
    |
    v
External service / DB / S3
```

Every queue should have a Dead Letter Queue.

Configure:
- visibility timeout
- retry limit
- DLQ
- partial batch failure handling

A notification failure must never cause a successful booking to fail.

---

# 17. EventBridge

Use EventBridge Scheduler for time-based jobs:

```text
Trip reminder
Booking expiry
Payment timeout
Pickup expiry
OTP expiry
Old-trip cleanup
```

Do not run a Lambda every minute just to ask whether something needs to happen.

Use event/schedule-driven execution.

---

# 18. Notifications

Recommended abstraction:

```text
Domain event
    |
    v
SQS
    |
    v
Notification Worker
    |
    +--> SES email
    +--> SNS / supported channel
```

The core booking transaction must not depend on notification delivery.

Keep notification providers behind an internal interface so the business domain does not depend directly on provider-specific code.

---

# 19. Tracking

Do not send GPS coordinates every second.

That increases:
- battery usage
- network usage
- database writes
- cost

For MVP:

```text
Active delivery
   |
   v
Location update every 30–60 seconds
```

Keep the latest location separately for fast reads.

Example:

```text
BOOKING#123
LATEST_LOCATION
```

Historical points should be sampled and retained according to product requirements.

---

# 20. Chat

Do not introduce WebSockets on day one unless real-time chat is a hard MVP requirement.

Start with:

```text
GET  /conversations/{id}/messages
POST /conversations/{id}/messages
```

Use short polling only while the chat screen is active if needed.

Later, when justified by usage:

```text
API Gateway WebSocket
        |
        v
Lambda
        |
        v
DynamoDB
```

AWS provides WebSocket APIs specifically for persistent two-way communication such as chat. citeturn0search4

---

# 21. Payment Architecture

AWS-only infrastructure does **not** remove the need for a regulated external payment processor if CarryGo accepts UPI/cards/bank payments. Do not attempt to implement a payment gateway yourself.

Isolate payment integration:

```text
PaymentService
  ├── createPayment()
  ├── verifyPayment()
  ├── capturePayment()
  ├── refundPayment()
  └── getPaymentStatus()
```

The rest of the application must depend on this internal interface, not directly on a provider SDK.

Never store:
- card numbers
- CVV
- banking credentials

---

# 22. Money Ledger

Do not model financial state with only:

```text
booking.status = PAID
```

Create an auditable transaction/ledger model.

Example states:

```text
PAYMENT_CREATED
PAYMENT_AUTHORIZED
FUNDS_HELD
DELIVERY_CONFIRMED
FUNDS_RELEASED
REFUND_REQUESTED
REFUNDED
DISPUTED
```

Every state transition must be:
- authenticated
- authorized
- idempotent
- auditable
- concurrency-safe

---

# 23. Security Architecture

## S3
- Block public access
- Use CloudFront OAC
- Encrypt objects
- Restrict prefixes where appropriate
- Lifecycle old data

## IAM
Use least privilege.

Do not use:

```text
Action: "*"
Resource: "*"
```

for application Lambda roles.

Each function/worker should have only the permissions it needs.

## API
- Cognito JWT authorization
- request validation
- payload limits
- throttling/rate limiting where supported
- abuse protection

## WAF
Enable for public production endpoints when the threat model and traffic justify it.

Protect especially:
- auth/OTP endpoints
- public APIs
- admin APIs
- high-cost endpoints

## Secrets
Never commit credentials.

Use SSM Parameter Store for non-secret configuration and Secrets Manager where secret lifecycle/rotation requirements justify it.

---

# 24. Avoiding the NAT Gateway Cost Trap

Do **not** put Lambda functions into a VPC by default.

If the Lambda functions only need:
- DynamoDB
- S3
- SQS
- EventBridge
- Cognito
- SES
- other public AWS APIs

keep the architecture outside a VPC unless a specific requirement demands private networking.

This avoids unnecessary VPC/NAT complexity and cost.

If a future private dependency requires VPC access, design the network path deliberately and evaluate VPC endpoints versus NAT based on actual traffic and service requirements.

---

# 25. Caching Strategy

Do not deploy Redis initially.

Use caching in this order:

```text
1. CloudFront
2. Browser/mobile cache
3. DynamoDB efficient query patterns
4. Short-lived application cache if truly useful
5. Redis/ElastiCache only after measured need
```

Caching should solve a measured bottleneck, not a hypothetical one.

---

# 26. API Performance

Target structure:

```text
Request
  |
  +--> authenticate
  +--> validate
  +--> 1–3 optimized DB operations
  |
  +--> return response
  |
  +--> asynchronous work via SQS/EventBridge
```

Avoid:

```text
Request
  |
  +--> many DB calls
  +--> external API calls
  +--> notification
  +--> analytics
  +--> heavy computation
  |
  +--> response
```

Keep Lambda bundles small and use AWS SDK v3 modular imports.

Do not put Lambda in a VPC without a concrete requirement.

Use Provisioned Concurrency only for measured latency-sensitive endpoints where cold starts materially affect user experience. Do not enable it globally.

---

# 27. API Response Design

Return only what the client needs.

Use cursor pagination:

```text
GET /trips?limit=20&cursor=...
```

Never return thousands of records.

Avoid over-fetching large profiles, histories and nested objects.

---

# 28. Database Cost Rules

1. Prefer `Query` over `Scan`.
2. Keep item sizes small.
3. Create GSIs only for real access patterns.
4. Project only required attributes into indexes where appropriate.
5. Avoid unnecessary strongly consistent reads.
6. Use conditional writes for concurrency.
7. Use batch APIs when appropriate.
8. Use TTL for temporary data.
9. Monitor consumed capacity.
10. Re-evaluate capacity mode from real traffic.

AWS documents on-demand capacity as a strong fit for variable workloads because billing follows actual read/write usage rather than idle provisioned capacity. citeturn0search13

---

# 29. TTL and Lifecycle

Use DynamoDB TTL for temporary records such as:
- OTP records
- temporary reservations
- short-lived sessions
- temporary matching data
- expiring tokens

Use S3 Lifecycle for:
- temporary uploads
- old exports
- archived files
- old image variants where appropriate

Do not retain everything forever by default.

---

# 30. Observability

Create CloudWatch dashboards for:

### API
- request count
- 4xx
- 5xx
- p50 latency
- p95 latency
- p99 latency

### Lambda
- invocations
- errors
- duration
- throttles
- concurrency

### DynamoDB
- throttling
- consumed capacity
- latency
- errors

### SQS
- queue depth
- oldest message age
- DLQ messages

### Business
- successful bookings
- booking failures
- payment failures
- matching success rate
- delivery success rate
- cancellations
- disputes

---

# 31. Logging

Every request should have a correlation/request ID.

Structured JSON logs should contain fields such as:

```json
{
  "requestId": "...",
  "userId": "...",
  "route": "/api/v1/bookings",
  "action": "CREATE_BOOKING",
  "durationMs": 123,
  "status": 201
}
```

Never log:
- passwords
- access tokens
- OTP values
- payment secrets
- full sensitive identity documents

Set CloudWatch log retention explicitly. Do not keep logs forever without a compliance reason.

---

# 32. Alerts

Production alarms should include:

```text
API 5xx spike
Lambda error spike
Lambda throttling
DynamoDB throttling
SQS DLQ > 0
SQS oldest-message-age spike
Payment failure spike
Booking failure spike
Authentication abuse spike
```

Alerts should be actionable rather than noisy.

---

# 33. Reliability and Recovery

Enable:
- DynamoDB point-in-time recovery
- S3 versioning where appropriate
- S3 lifecycle rules
- CloudTrail
- IaC-managed infrastructure

Recovery must be tested, not merely documented.

The team should have a tested procedure to:

```text
Detect incident
   -> isolate
   -> rollback/fix
   -> restore if required
   -> verify
   -> communicate
```

---

# 34. Environment Strategy

Use:

```text
development
staging
production
```

Prefer separate AWS accounts for staging/production as the company matures.

Never run experimental migrations against production tables.

Use separate resources and configuration per environment.

---

# 35. Infrastructure as Code

Recommended for this TypeScript codebase:

**AWS CDK + TypeScript**

Suggested:

```text
infra/
├── bin/
└── lib/
    ├── auth-stack.ts
    ├── storage-stack.ts
    ├── database-stack.ts
    ├── api-stack.ts
    ├── queue-stack.ts
    ├── monitoring-stack.ts
    └── frontend-stack.ts
```

Everything production-related should be reproducible from source.

Do not manually create production infrastructure through the console except for diagnosis/emergency operations.

---

# 36. CI/CD

```text
Git push
   |
   v
CI
 ├── lint
 ├── typecheck
 ├── unit tests
 ├── integration tests
 ├── security/dependency checks
 └── build
   |
   v
Deploy staging
   |
   v
Smoke tests
   |
   v
Approval
   |
   v
Production deployment
```

Use Lambda versions/aliases and safe rollback mechanisms as the system matures.

---

# 37. Cost Optimization — Concrete Rules

## Fixed-cost elimination

Do not run always-on servers.

## API

Use HTTP API when feature requirements fit. AWS documents HTTP APIs as lower-cost than REST APIs. citeturn0search0turn0search12

## Database

Start DynamoDB On-Demand for unpredictable early traffic. Re-evaluate from metrics later. citeturn0search13

## Compute

Lambda instead of EC2/ECS for the application API.

## Storage

S3 for objects, lifecycle old/temporary data.

## Network

Avoid unnecessary VPC/NAT Gateway deployment.

## CDN

CloudFront should cache static assets aggressively.

## Queues

SQS for retries and background work instead of keeping requests open.

## Logs

Set retention periods.

## Indexes

Every GSI has a business reason.

## Concurrency

Use reserved concurrency only where necessary to protect downstream systems; do not set arbitrary high values.

## Provisioned Concurrency

Use only after measuring cold-start impact.

---

# 38. CarryGo Domain Model

Core entities:

```text
User
TravelerProfile
SenderProfile
Trip
Parcel
Match
Booking
Payment
LedgerEntry
TrackingEvent
Conversation
Message
Rating
Notification
KYCRecord
Dispute
```

Core booking state machine:

```text
REQUESTED
   |
   v
ACCEPTED
   |
   v
PAYMENT_PENDING
   |
   v
CONFIRMED
   |
   v
PICKUP_VERIFIED
   |
   v
IN_TRANSIT
   |
   v
DELIVERED
   |
   v
SETTLED
```

Terminal/exception states:

```text
CANCELLED
EXPIRED
DISPUTED
REFUNDED
```

All transitions must be explicit and validated server-side.

---

# 39. Recommended Production Architecture Diagram

```text
                              INTERNET
                                  |
                                  v
                          Route 53 + ACM
                                  |
                                  v
                           CloudFront CDN
                           /             \
                          /               \
                         v                 v
                Private S3 Bucket     API Gateway HTTP API
                Frontend Assets              |
                                             v
                                      Cognito JWT Auth
                                             |
                                             v
                                  Lambda Application Layer
                                             |
             +----------------+--------------+------------------+
             |                |                                 |
             v                v                                 v
        DynamoDB             S3                              SQS + DLQ
             |                |                                 |
             |                +--> Image Worker Lambda          v
             |                                             Worker Lambdas
             |                                                  |
             +--------------------------+-----------------------+
                                        |
                                        v
                                  EventBridge
                                        |
                             +----------+----------+
                             |                     |
                             v                     v
                            SES                   SNS

                       Observability / Security
                    CloudWatch + CloudTrail + WAF
```

---

# 40. What We Explicitly Do NOT Use Initially

```text
❌ Supabase
❌ Firebase
❌ MongoDB Atlas
❌ External managed database
❌ ECS for the core API
❌ EKS/Kubernetes
❌ Redis/ElastiCache
❌ OpenSearch
❌ Kafka/MSK
❌ Always-on EC2
❌ Multi-region active-active
❌ Provisioned Lambda concurrency everywhere
❌ NAT Gateway without a real private-network requirement
❌ API Gateway REST API when HTTP API satisfies requirements
```

The objective is not “maximum number of AWS services”.

The objective is:

> **minimum infrastructure that can safely support production.**

---

# 41. Scaling Roadmap

## Stage 1 — MVP / Early Production

```text
S3
CloudFront
Route 53
ACM
API Gateway HTTP API
Cognito
Lambda
DynamoDB On-Demand
SQS + DLQ
EventBridge
SES/SNS
CloudWatch
CloudTrail
```

## Stage 2 — Growth

Add only if metrics justify:

```text
WAF
advanced alarms
DynamoDB capacity tuning
DynamoDB Streams
WebSockets
more sophisticated matching
specialized background workers
```

## Stage 3 — High Scale

Potentially evaluate:

```text
ElastiCache
OpenSearch
streaming infrastructure
service extraction
multi-region
specialized data stores
```

These are **evolution options, not day-one dependencies**.

---

# 42. Aurora Decision

Do not use Aurora merely because it sounds more “production grade”.

Consider Aurora PostgreSQL later if measured requirements demand:
- complex relational joins
- SQL-heavy reporting
- accounting workloads
- sophisticated relational transactions
- strong relational constraints beyond the current access model

Until that requirement exists, DynamoDB keeps the architecture simpler and more operationally lightweight.

---

# 43. Performance Targets

Initial engineering targets, to be validated by load tests:

| Metric | Initial target |
|---|---:|
| Simple API p50 | < 150 ms |
| Normal API p95 | < 400 ms |
| Normal write p95 | < 600 ms excluding external payment |
| DynamoDB normal query | low tens of ms or better |
| Static asset delivery | CloudFront cached |
| Booking reservation | atomic |
| Duplicate booking from retry | prevented |
| Notification | asynchronous |

These are **engineering targets, not guarantees**. Production measurements determine whether the targets are achieved.

---

# 44. Security Threat Model

## Fake accounts / account takeover

Use Cognito, appropriate MFA/step-up verification, rate limits and anomaly monitoring.

## Fake travelers

Use KYC/identity verification workflow and reputation history.

## Fake parcels

Parcel declaration, prohibited-item rules, risk controls and operational review.

## Booking fraud

Idempotency, conditional writes, payment state machine and audit trail.

## API abuse

Authentication, authorization, throttling/rate limiting and WAF where appropriate.

## Data leakage

Every resource endpoint must check ownership or explicit authorization.

Example:

```text
GET /bookings/B123
```

must verify:

```text
request.user owns B123
OR
request.user has authorized support/admin access
```

Frontend route guards are never sufficient security.

---

# 45. Implementation Order for Codex

## Phase 0 — Audit

Before changing code:

1. Audit current repository.
2. Identify Supabase/Firebase/other backend dependencies.
3. Identify current database schema.
4. Identify all API endpoints.
5. Identify authentication flows.
6. Identify file uploads.
7. Identify payments.
8. Identify background jobs.
9. Identify real-time features.
10. Produce a migration map.

Do not delete existing business logic blindly.

## Phase 1 — AWS foundation

```text
1. CDK project
2. environments
3. S3
4. CloudFront
5. ACM
6. Route 53
7. Cognito
8. DynamoDB
9. API Gateway HTTP API
10. Lambda
11. SQS + DLQ
12. EventBridge
13. SES/SNS
14. CloudWatch
15. CloudTrail
```

## Phase 2 — Backend foundation

```text
1. error model
2. request validation
3. auth middleware/context
4. authorization
5. structured logging
6. correlation IDs
7. idempotency
8. database repository layer
9. configuration
```

## Phase 3 — Core CarryGo

```text
1. users
2. traveler profiles
3. trips
4. parcels
5. matching
6. booking
7. capacity reservation
8. tracking
9. ratings
```

## Phase 4 — Payments

```text
1. payment abstraction
2. payment creation
3. verification
4. ledger
5. settlement/release
6. refunds
7. disputes
```

## Phase 5 — Async

```text
1. notifications
2. reminders
3. image processing
4. cleanup
5. retry workers
```

## Phase 6 — Production hardening

```text
1. WAF where appropriate
2. alarms
3. dashboards
4. load testing
5. security testing
6. failure testing
7. rollback testing
8. backup/recovery test
9. cost monitoring
```

---

# 46. Codex Non-Negotiable Rules

Codex must follow these rules while implementing:

### Rule 1
Never introduce a new AWS service without documenting the reason.

### Rule 2
Never introduce always-running infrastructure when a serverless solution meets the requirement.

### Rule 3
Never use DynamoDB Scan in a production request path.

### Rule 4
Never put Lambda in a VPC without a specific requirement.

### Rule 5
Never route large S3 uploads through API Gateway/Lambda.

### Rule 6
Never make notifications part of the critical booking transaction.

### Rule 7
Never hardcode secrets.

### Rule 8
Never use wildcard IAM permissions for production application roles.

### Rule 9
Never add Redis/OpenSearch/Kafka for hypothetical future scale.

### Rule 10
Every GSI must map to a documented access pattern.

### Rule 11
Every payment/booking mutation must be idempotent.

### Rule 12
Every capacity/payment state transition must be concurrency-safe.

### Rule 13
Every protected API must enforce authorization server-side.

### Rule 14
Every production resource must be tagged.

Example:

```text
Project=CarryGo
Environment=production
ManagedBy=CDK
Component=backend
```

### Rule 15
Optimize based on measured p95/p99 latency and actual AWS billing metrics, not assumptions.

---

# 47. Definition of Done

Migration/production readiness is complete only when:

```text
[ ] No Supabase dependency
[ ] No Firebase dependency
[ ] No third-party database dependency
[ ] Production infrastructure is IaC-managed
[ ] Frontend served through CloudFront
[ ] S3 buckets private where appropriate
[ ] Authentication uses Cognito
[ ] APIs use API Gateway HTTP API
[ ] Business logic runs on Lambda
[ ] Primary database uses DynamoDB
[ ] Async processing uses SQS
[ ] Scheduled work uses EventBridge
[ ] Secrets are not hardcoded
[ ] IAM follows least privilege
[ ] Critical writes are idempotent
[ ] Booking capacity is concurrency-safe
[ ] CloudWatch monitoring exists
[ ] DLQs exist for retryable queues
[ ] DynamoDB PITR enabled where required
[ ] Staging environment works
[ ] Production deployment is repeatable
[ ] Load testing completed
[ ] Security review completed
[ ] Cost monitoring/budget alerts configured
[ ] Rollback procedure tested
[ ] Recovery procedure tested
```

---

# 48. Final Architecture Position

CarryGo should be built as a:

> **Serverless, event-driven, modular intercity logistics platform on AWS.**

The initial architecture deliberately stays small:

```text
S3
+
CloudFront
+
Route 53
+
API Gateway HTTP API
+
Cognito
+
Lambda
+
DynamoDB
+
SQS
+
EventBridge
+
SES/SNS
+
CloudWatch
+
CloudTrail
```

This gives CarryGo:

- low idle cost
- automatic scaling
- low operational overhead
- managed high availability
- fast static content delivery
- efficient API execution
- asynchronous processing
- secure authentication
- reproducible infrastructure
- a clean path from MVP to high scale

The core principle is:

> **Build for scale, but provision for actual demand.**

Do not pay for infrastructure before CarryGo has the traffic to justify it.

---

# 49. AWS Reference Notes

This architecture is based on AWS's documented serverless patterns and current service guidance:

- AWS serverless web application pattern: CloudFront/S3 + API Gateway/Lambda + Cognito + DynamoDB. citeturn0search1turn0search2
- API Gateway HTTP APIs are designed as a lower-cost/lower-latency option when REST-only management features are not required. citeturn0search0turn0search12
- DynamoDB on-demand is suited to variable/unpredictable workloads and charges according to actual request consumption. citeturn0search13

---

# 50. Instruction to Codex

Treat this document as the target production architecture.

Before implementation:

1. Audit the current CarryGo repository.
2. Map current features to the target AWS modules.
3. Identify migration risks.
4. Produce a dependency/migration matrix.
5. Implement infrastructure through CDK.
6. Migrate feature-by-feature.
7. Preserve business behavior unless explicitly redesigned.
8. Add automated tests before destructive migrations.
9. Verify DynamoDB access patterns before creating indexes.
10. Verify IAM permissions using least privilege.
11. Add observability before production migration.
12. Load-test critical endpoints.
13. Test duplicate requests, retries and concurrency.
14. Test queue failures and DLQ recovery.
15. Test rollback.
16. Test backup/recovery.
17. Review AWS costs after staging load tests.
18. Do not add infrastructure merely because it may be needed in the future.

**The final implementation must optimize for the three constraints simultaneously: production reliability, speed, and minimum total cost.**
