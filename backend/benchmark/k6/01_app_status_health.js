import http from 'k6/http';
import { check, sleep } from 'k6';
import {
  BASE_URL,
  getClientIp,
  getStandardHeaders,
  ttfbTrend,
  successRate,
} from './config.js';

export const options = {
  stages: [
    { duration: '3s', target: 10 },
    { duration: '6s', target: 30 },
    { duration: '3s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<30', 'p(99)<80'],
    http_req_failed: ['rate<0.01'],
    'carrygo_success_rate': ['rate>0.99'],
  },
};

export default function () {
  const ip = getClientIp(__VU, __ITER);
  const params = getStandardHeaders({ ip });

  // 1. General Health Probe
  const resHealth = http.get(`${BASE_URL}/health`, params);
  ttfbTrend.add(resHealth.timings.waiting);
  const healthOk = check(resHealth, {
    'health: status 200': (r) => r.status === 200,
    'health: body status ok': (r) => {
      try {
        return JSON.parse(r.body).status === 'ok';
      } catch {
        return false;
      }
    },
    'health: latency < 30ms': (r) => r.timings.duration < 30,
  });
  successRate.add(healthOk);

  // 2. Liveness Probe
  const resLive = http.get(`${BASE_URL}/health/live`, params);
  const liveOk = check(resLive, {
    'live: status 200': (r) => r.status === 200,
    'live: body status live': (r) => {
      try {
        return JSON.parse(r.body).status === 'live';
      } catch {
        return false;
      }
    },
  });
  successRate.add(liveOk);

  // 3. Readiness Probe
  const resReady = http.get(`${BASE_URL}/health/ready`, params);
  const readyOk = check(resReady, {
    'ready: status 200': (r) => r.status === 200,
    'ready: body status ready': (r) => {
      try {
        return JSON.parse(r.body).status === 'ready';
      } catch {
        return false;
      }
    },
  });
  successRate.add(readyOk);

  // 4. Metrics Probe
  const resMetrics = http.get(`${BASE_URL}/health/metrics`, params);
  const metricsOk = check(resMetrics, {
    'metrics: status 200': (r) => r.status === 200,
    'metrics: has memory stats': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.memory && body.concurrency !== undefined;
      } catch {
        return false;
      }
    },
  });
  successRate.add(metricsOk);

  sleep(0.05);
}
