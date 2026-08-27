# CarryGo Backend (AWS Lambda Modular Monolith)

This backend is the initial AWS migration baseline.

## Current module boundaries

- auth
- users
- trips
- parcels
- matching
- bookings
- payments
- tracking
- ratings
- notifications
- admin

## Implemented endpoints

- `GET /health`
- `POST /api/bookings/reserve`
- `GET /api/trips`
- `GET /api/trips/:id`
- `POST /api/trips`
- `PATCH /api/trips/:id/status`
- `GET /api/parcels`
- `GET /api/parcels/:id`
- `POST /api/parcels`
- `PATCH /api/parcels/:id/status`
- `GET /api/requests?userId=...`
- `GET /api/requests/:id`
- `GET /api/requests/by-trip/:tripId`
- `GET /api/requests/by-parcel/:parcelId`
- `POST /api/requests`
- `PATCH /api/requests/:id/status`
- `GET /api/admin/disputes`

`POST /api/bookings/reserve` enforces:

- idempotency via `idempotency-key` header
- concurrency-safe capacity reservation via DynamoDB transaction

The `trips/parcels/requests` module endpoints are wired for AWS-mode clients and use DynamoDB keys + GSIs (no request-path scans).

## Local build

```bash
cd backend
npm install
npm run build
```

The Lambda entrypoint used by CDK is `src/lambda.ts`.
