import http from 'k6/http';
import { check, sleep } from 'k6';
import {
  BASE_URL,
  getClientIp,
  getRandomCityPair,
  getStandardHeaders,
  loadShedCounter,
  successRate,
  ttfbTrend,
} from './config.js';

export const options = {
  stages: [
    { duration: '5s', target: 50 },   // Ramp-up to 50 VUs
    { duration: '10s', target: 150 }, // Heavy load at 150 VUs
    { duration: '8s', target: 250 },  // Extreme spike to 250 VUs
    { duration: '5s', target: 0 },    // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<250'], // Even under heavy stress of 250 VUs, p95 under 250ms
    http_req_failed: ['rate<0.15'],    // Under extreme spike, some 503 load-shedding is acceptable
  },
};

export default function () {
  const vuId = __VU;
  const iterId = __ITER;
  const ip = getClientIp(vuId, iterId);
  const cityPair = getRandomCityPair();
  const userId = `00000000-0000-0000-0000-${String(vuId).padStart(12, '0')}`;
  const headers = getStandardHeaders({ userId, ip }).headers;

  // Mix of read operations (simulating active marketplace browsing)
  const endpointChoice = iterId % 3;

  let res;
  if (endpointChoice === 0) {
    res = http.get(`${BASE_URL}/trips?fromCity=${cityPair.from}&limit=20`, { headers });
  } else if (endpointChoice === 1) {
    res = http.get(`${BASE_URL}/parcels?fromCity=${cityPair.from}&limit=20`, { headers });
  } else {
    res = http.get(`${BASE_URL}/health/metrics`, { headers });
  }

  ttfbTrend.add(res.timings.waiting);

  if (res.status === 200) {
    successRate.add(1);
    check(res, {
      'stress: status 200': (r) => r.status === 200,
    });
  } else if (res.status === 503) {
    // Load shedding activated gracefully by concurrencyGovernor
    loadShedCounter.add(1);
    check(res, {
      'stress: load-shed status 503': (r) => r.status === 503,
      'stress: load-shed message': (r) => {
        try {
          return JSON.parse(r.body).message.includes('overloaded');
        } catch {
          return false;
        }
      },
    });
  }

  // Realistic user think time
  sleep(0.02);
}
