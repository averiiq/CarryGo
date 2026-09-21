import http from 'k6/http';
import { check, sleep } from 'k6';
import {
  BASE_URL,
  getStandardHeaders,
  throttledCounter,
  successRate,
} from './config.js';

export const options = {
  scenarios: {
    flood_single_ip: {
      executor: 'constant-vus',
      vus: 5,
      duration: '8s',
    },
  },
  thresholds: {
    carrygo_throttled_429_total: ['count>10'], // Must trigger rate limits
  },
};

export default function () {
  // Use ONE fixed IP for all requests in this test to trigger rate limiting
  const targetAttackerIp = '198.51.100.42';
  const headers = getStandardHeaders({
    userId: '00000000-0000-0000-0000-000000000999',
    ip: targetAttackerIp,
  }).headers;

  const payload = JSON.stringify({
    userId: '00000000-0000-0000-0000-000000000999',
    userName: 'SpamBot',
    fromCity: 'Delhi',
    toCity: 'Hisar',
    date: '2026-10-25',
    time: '12:00',
    vehicleType: 'bike',
    availableCapacity: 5,
    pricePerKg: 100,
  });

  // Rapid mutation POST to trigger mutationRateLimiter
  const res = http.post(`${BASE_URL}/trips`, payload, { headers });

  if (res.status === 429) {
    throttledCounter.add(1);
    check(res, {
      'throttle: returns status 429': (r) => r.status === 429,
      'throttle: has retry-after header': (r) => {
        const retryAfter = r.headers['Retry-After'] || r.headers['retry-after'];
        return !!retryAfter;
      },
      'throttle: error message mentions rate limit': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.message && body.message.toLowerCase().includes('rate');
        } catch {
          return false;
        }
      },
    });
  } else if (res.status === 201) {
    successRate.add(1);
  }

  // Also test KYC rate limit with rapid requests
  const kycRes = http.get(`${BASE_URL}/kyc/status`, { headers });

  if (kycRes.status === 429) {
    throttledCounter.add(1);
    check(kycRes, {
      'kyc throttle: returns 429': (r) => r.status === 429,
    });
  }

  // Intentionally tiny sleep (5ms) to create an aggressive burst
  sleep(0.005);
}
