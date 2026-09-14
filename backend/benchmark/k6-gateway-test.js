import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '3s', target: 20 },  // Ramp-up to 20 virtual users
    { duration: '8s', target: 50 },  // Steady-state load at 50 virtual users
    { duration: '4s', target: 100 }, // Spike test to 100 virtual users
    { duration: '3s', target: 0 },   // Graceful ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<50', 'p(99)<150'], // 95% of requests under 50ms, 99% under 150ms
    http_req_failed: ['rate<0.01'],               // Error rate < 1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

export default function () {
  // Generate distinct virtual client IP based on VU and iteration
  const ip1 = 103;
  const ip2 = 21;
  const ip3 = (__VU % 250) + 1;
  const ip4 = (__ITER % 250) + 1;
  const clientIp = `${ip1}.${ip2}.${ip3}.${ip4}`;

  const params = {
    headers: {
      'X-Forwarded-For': clientIp,
      'User-Agent': 'CarryGo-k6-LoadTester/2.2.0',
      'Accept': 'application/json',
    },
  };

  // 1. Health check & latency verification
  const res = http.get(`${BASE_URL}/health`, params);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'has valid response body': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === 'ok';
      } catch {
        return false;
      }
    },
    'latency is < 50ms': (r) => r.timings.duration < 50,
  });

  // Short realistic pause between user actions (5ms to 20ms)
  sleep(0.01);
}
