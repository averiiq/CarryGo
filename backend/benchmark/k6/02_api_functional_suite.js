import http from 'k6/http';
import { check, sleep } from 'k6';
import {
  BASE_URL,
  getClientIp,
  getRandomCityPair,
  getStandardHeaders,
  successRate,
  ttfbTrend,
} from './config.js';

export const options = {
  stages: [
    { duration: '3s', target: 5 },
    { duration: '8s', target: 15 },
    { duration: '3s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<80', 'p(99)<200'],
    http_req_failed: ['rate<0.02'],
    carrygo_success_rate: ['rate>0.98'],
  },
};

export default function () {
  const vuId = __VU;
  const iterId = __ITER;
  const ip = getClientIp(vuId, iterId);
  const userId = `00000000-0000-0000-0000-${String(vuId).padStart(12, '0')}`;
  const headers = getStandardHeaders({ userId, ip }).headers;
  const cityPair = getRandomCityPair();

  // 1. Trips API: List trips
  const resListTrips = http.get(`${BASE_URL}/trips?fromCity=${cityPair.from}&toCity=${cityPair.to}&limit=10`, { headers });
  ttfbTrend.add(resListTrips.timings.waiting);
  const listTripsOk = check(resListTrips, {
    'trips: list status 200': (r) => r.status === 200,
    'trips: has data array': (r) => {
      try {
        return Array.isArray(JSON.parse(r.body).data);
      } catch {
        return false;
      }
    },
  });
  successRate.add(listTripsOk);

  // 2. Trips API: Create trip
  const tripPayload = JSON.stringify({
    userId,
    userName: `Traveller_${vuId}`,
    fromCity: cityPair.from,
    toCity: cityPair.to,
    date: '2026-10-15',
    time: '08:30',
    vehicleType: 'train',
    availableCapacity: 8,
    pricePerKg: 150,
  });

  const tripIdempKey = `TRIP-IDEMP-${vuId}-${iterId}-${Date.now()}`;
  const tripHeaders = Object.assign({}, headers, { 'Idempotency-Key': tripIdempKey });
  const resCreateTrip = http.post(`${BASE_URL}/trips`, tripPayload, { headers: tripHeaders });
  let createdTripId = null;

  const createTripOk = check(resCreateTrip, {
    'trips: create status 201': (r) => r.status === 201,
    'trips: returns created trip id': (r) => {
      try {
        const body = JSON.parse(r.body);
        createdTripId = body.data?.id;
        return !!createdTripId;
      } catch {
        return false;
      }
    },
  });
  successRate.add(createTripOk);

  // 2b. Trips API: Test Idempotency Replay
  const resReplayTrip = http.post(`${BASE_URL}/trips`, tripPayload, { headers: tripHeaders });
  const replayOk = check(resReplayTrip, {
    'trips: idempotent replay returns 201': (r) => r.status === 201,
    'trips: idempotent replay matches id': (r) => {
      try {
        return JSON.parse(r.body).data?.id === createdTripId;
      } catch {
        return false;
      }
    },
  });
  successRate.add(replayOk);

  // 3. Trips API: Get trip by ID
  if (createdTripId) {
    const resGetTrip = http.get(`${BASE_URL}/trips/${createdTripId}`, { headers });
    const getTripOk = check(resGetTrip, {
      'trips: get by id status 200': (r) => r.status === 200,
      'trips: get by id matches': (r) => {
        try {
          return JSON.parse(r.body).data?.id === createdTripId;
        } catch {
          return false;
        }
      },
    });
    successRate.add(getTripOk);
  }

  // 4. Parcels API: Create parcel (owned by sender)
  const senderId = `00000000-0000-0000-0001-${String(vuId).padStart(12, '0')}`;
  const senderHeaders = getStandardHeaders({ userId: senderId, ip }).headers;

  const parcelPayload = JSON.stringify({
    userId: senderId,
    userName: `Sender_${vuId}`,
    fromCity: cityPair.from,
    toCity: cityPair.to,
    description: 'Urgent contract documents',
    category: 'documents',
    weight: 1.5,
    priceOffer: 250,
    status: 'open',
  });

  const resCreateParcel = http.post(`${BASE_URL}/parcels`, parcelPayload, { headers: senderHeaders });
  let createdParcelId = null;

  const createParcelOk = check(resCreateParcel, {
    'parcels: create status 201': (r) => r.status === 201,
    'parcels: returns created parcel id': (r) => {
      try {
        const body = JSON.parse(r.body);
        createdParcelId = body.data?.id;
        return !!createdParcelId;
      } catch {
        return false;
      }
    },
  });
  successRate.add(createParcelOk);

  // 5. Parcels API: List parcels
  const resListParcels = http.get(`${BASE_URL}/parcels?fromCity=${cityPair.from}&limit=10`, { headers: senderHeaders });
  const listParcelsOk = check(resListParcels, {
    'parcels: list status 200': (r) => r.status === 200,
    'parcels: has data array': (r) => {
      try {
        return Array.isArray(JSON.parse(r.body).data);
      } catch {
        return false;
      }
    },
  });
  successRate.add(listParcelsOk);

  // 6. Requests API: Create delivery request (sender sends to traveller)
  if (createdTripId && createdParcelId) {
    const requestPayload = JSON.stringify({
      parcelId: createdParcelId,
      tripId: createdTripId,
      senderId: senderId,
      senderName: `Sender_${vuId}`,
      travellerId: userId,
      travellerName: `Traveller_${vuId}`,
      price: 200,
    });

    const resCreateReq = http.post(`${BASE_URL}/requests`, requestPayload, { headers: senderHeaders });
    let createdReqId = null;

    const createReqOk = check(resCreateReq, {
      'requests: create status 201': (r) => r.status === 201,
      'requests: returns request id': (r) => {
        try {
          const body = JSON.parse(r.body);
          createdReqId = body.data?.id;
          return !!createdReqId;
        } catch {
          return false;
        }
      },
    });
    successRate.add(createReqOk);

    // 7. Requests API: Get by Trip and by Parcel
    const resByTrip = http.get(`${BASE_URL}/requests/by-trip/${createdTripId}`, { headers });
    const byTripOk = check(resByTrip, {
      'requests: get by trip status 200': (r) => r.status === 200,
    });
    successRate.add(byTripOk);

    // 8. Trips API: Patch trip status after request is created
    const resPatchTrip = http.patch(
      `${BASE_URL}/trips/${createdTripId}/status`,
      JSON.stringify({ status: 'completed' }),
      { headers }
    );
    const patchTripOk = check(resPatchTrip, {
      'trips: patch status 200': (r) => r.status === 200,
    });
    successRate.add(patchTripOk);
  }

  // 9. Bookings API: Reserve booking with Idempotency Key
  const bookingPayload = JSON.stringify({
    tripId: createdTripId || '00000000-0000-0000-0000-000000000010',
    senderId: userId,
    units: 2,
  });
  const bookingHeaders = Object.assign({}, headers, {
    'Idempotency-Key': `BOOKING-KEY-${vuId}-${iterId}-${Date.now()}`,
  });
  const resBooking = http.post(`${BASE_URL}/bookings/reserve`, bookingPayload, { headers: bookingHeaders });
  const bookingOk = check(resBooking, {
    'bookings: reserve status 201 or 409': (r) => r.status === 201 || r.status === 409,
  });
  successRate.add(bookingOk);

  // 10. KYC API: Check status & Aadhaar initiation
  const resKycStatus = http.get(`${BASE_URL}/kyc/status`, { headers });
  const kycStatusOk = check(resKycStatus, {
    'kyc: get status 200': (r) => r.status === 200,
  });
  successRate.add(kycStatusOk);

  // 11. Admin API: Verify disputes endpoint with admin role
  const adminHeaders = getStandardHeaders({ userId, role: 'admin', ip }).headers;
  const resDisputes = http.get(`${BASE_URL}/admin/disputes`, { headers: adminHeaders });
  const disputesOk = check(resDisputes, {
    'admin: disputes status 200': (r) => r.status === 200,
  });
  successRate.add(disputesOk);

  sleep(0.05);
}
