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
    { duration: '8s', target: 10 },
    { duration: '3s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<100', 'p(99)<250'],
    carrygo_success_rate: ['rate>0.98'],
  },
};

export default function () {
  const vuId = __VU;
  const iterId = __ITER;
  const ip = getClientIp(vuId, iterId);
  const cityPair = getRandomCityPair();

  const travellerId = `00000000-0000-0000-0001-${String(vuId).padStart(12, '0')}`;
  const senderId = `00000000-0000-0000-0002-${String(vuId).padStart(12, '0')}`;

  const travellerHeaders = getStandardHeaders({ userId: travellerId, ip }).headers;
  const senderHeaders = getStandardHeaders({ userId: senderId, ip }).headers;

  // Step 1: Traveller posts Trip
  const tripPayload = JSON.stringify({
    userId: travellerId,
    userName: `Traveller_${vuId}`,
    fromCity: cityPair.from,
    toCity: cityPair.to,
    date: '2026-10-20',
    time: '09:00',
    vehicleType: 'car',
    availableCapacity: 10,
    pricePerKg: 120,
    status: 'active',
  });

  const resTrip = http.post(`${BASE_URL}/trips`, tripPayload, { headers: travellerHeaders });
  ttfbTrend.add(resTrip.timings.waiting);
  let tripId = null;
  const tripOk = check(resTrip, {
    'flow: step 1 - trip created 201': (r) => {
      if (r.status === 201) {
        tripId = JSON.parse(r.body).data?.id;
        return !!tripId;
      }
      return false;
    },
  });
  successRate.add(tripOk);

  if (!tripId) return;

  // Step 2: Sender posts Parcel
  const parcelPayload = JSON.stringify({
    userId: senderId,
    userName: `Sender_${vuId}`,
    fromCity: cityPair.from,
    toCity: cityPair.to,
    description: 'Medical sample box',
    category: 'medicine',
    weight: 2.0,
    priceOffer: 300,
    status: 'open',
  });

  const resParcel = http.post(`${BASE_URL}/parcels`, parcelPayload, { headers: senderHeaders });
  let parcelId = null;
  const parcelOk = check(resParcel, {
    'flow: step 2 - parcel created 201': (r) => {
      if (r.status === 201) {
        parcelId = JSON.parse(r.body).data?.id;
        return !!parcelId;
      }
      return false;
    },
  });
  successRate.add(parcelOk);

  if (!parcelId) return;

  // Step 3: Sender sends delivery request to Traveller
  const requestPayload = JSON.stringify({
    parcelId,
    tripId,
    senderId,
    senderName: `Sender_${vuId}`,
    travellerId,
    travellerName: `Traveller_${vuId}`,
    price: 250,
  });

  const resRequest = http.post(`${BASE_URL}/requests`, requestPayload, { headers: senderHeaders });
  let requestId = null;
  const requestOk = check(resRequest, {
    'flow: step 3 - request sent 201': (r) => {
      if (r.status === 201) {
        requestId = JSON.parse(r.body).data?.id;
        return !!requestId;
      }
      return false;
    },
  });
  successRate.add(requestOk);

  if (!requestId) return;

  // Step 4: Traveller lists requests for their trip
  const resTripRequests = http.get(`${BASE_URL}/requests/by-trip/${tripId}`, { headers: travellerHeaders });
  const listOk = check(resTripRequests, {
    'flow: step 4 - traveller sees request 200': (r) => r.status === 200,
  });
  successRate.add(listOk);

  // Step 5: Traveller accepts the request
  const acceptPayload = JSON.stringify({
    status: 'accepted',
    message: 'Accepted! I can carry this parcel.',
  });

  const resAccept = http.patch(`${BASE_URL}/requests/${requestId}/status`, acceptPayload, { headers: travellerHeaders });
  const acceptOk = check(resAccept, {
    'flow: step 5 - traveller accepted 200': (r) => r.status === 200,
  });
  successRate.add(acceptOk);

  // Step 6: Verify request status is accepted
  const resGetReq = http.get(`${BASE_URL}/requests/${requestId}`, { headers: senderHeaders });
  const verifyOk = check(resGetReq, {
    'flow: step 6 - request status verified accepted': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data?.status === 'accepted';
      } catch {
        return false;
      }
    },
  });
  successRate.add(verifyOk);

  sleep(0.05);
}
