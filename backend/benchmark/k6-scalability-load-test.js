import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '3s', target: 30 },  // 1. Warm-up ramp to 30 VUs
    { duration: '8s', target: 100 }, // 2. High sustained load at 100 VUs
    { duration: '4s', target: 200 }, // 3. Sudden traffic spike to 200 VUs
    { duration: '3s', target: 0 },   // 4. Graceful recovery & ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<60', 'p(99)<180'], // 95% under 60ms, 99% under 180ms
    http_req_failed: ['rate<0.01'],               // Less than 1% errors
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

const CORRIDORS = [
  { from: 'Delhi', to: 'Chandigarh' },
  { from: 'Gurugram', to: 'Jaipur' },
  { from: 'Mumbai', to: 'Pune' },
  { from: 'Rohtak', to: 'Delhi' },
  { from: 'Panipat', to: 'Chandigarh' },
];

export default function () {
  const ip1 = 103;
  const ip2 = 21;
  const ip3 = (__VU % 250) + 1;
  const ip4 = (__ITER % 250) + 1;
  const clientIp = `${ip1}.${ip2}.${ip3}.${ip4}`;

  const headers = {
    'X-Forwarded-For': clientIp,
    'X-User-Id': '00000000-0000-0000-0000-000000000001',
    'User-Agent': 'CarryGo-k6-ScalabilityRunner/3.0.0',
    'Accept': 'application/json',
  };

  const corridor = CORRIDORS[__ITER % CORRIDORS.length];

  // 1. Corridor Search (Cached Hot Path)
  const tripsRes = http.get(
    `${BASE_URL}/trips?fromCity=${corridor.from}&toCity=${corridor.to}`,
    { headers },
  );

  check(tripsRes, {
    'trips status is 200': (r) => r.status === 200,
    'trips duration < 60ms': (r) => r.timings.duration < 60,
  });

  // 2. Health & Metrics Check (10% of requests)
  if (__ITER % 10 === 0) {
    const healthRes = http.get(`${BASE_URL}/health/metrics`, { headers });
    check(healthRes, {
      'health status is 200': (r) => r.status === 200,
    });
  }

  // Realistic human thinking time / mobile app debounce (5ms - 15ms)
  sleep(0.01);
}
