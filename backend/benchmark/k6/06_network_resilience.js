import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import {
  BASE_URL,
  getClientIp,
  getStandardHeaders,
  ttfbTrend,
  successRate,
} from './config.js';

const connectionTrend = new Trend('carrygo_tcp_connecting_ms');
const serverTimingTrend = new Trend('carrygo_server_execution_dur_ms');

export const options = {
  stages: [
    { duration: '3s', target: 20 },
    { duration: '8s', target: 40 },
    { duration: '3s', target: 0 },
  ],
  thresholds: {
    carrygo_ttfb_ms: ['p(95)<30'],
    carrygo_tcp_connecting_ms: ['p(95)<10'], // Connection reuse keep-alive check
    carrygo_server_execution_dur_ms: ['p(95)<25'],
  },
};

export default function () {
  const ip = getClientIp(__VU, __ITER);
  const headers = getStandardHeaders({ ip }).headers;

  const res = http.get(`${BASE_URL}/health/metrics`, { headers });

  ttfbTrend.add(res.timings.waiting);
  connectionTrend.add(res.timings.connecting);

  // Parse server-timing header (e.g. "app;dur=1.45")
  const serverTiming = res.headers['Server-Timing'] || res.headers['server-timing'];
  if (serverTiming) {
    const match = serverTiming.match(/dur=([\d.]+)/);
    if (match) {
      serverTimingTrend.add(parseFloat(match[1]));
    }
  }

  const ok = check(res, {
    'net: status is 200': (r) => r.status === 200,
    'net: ttfb is under 30ms': (r) => r.timings.waiting < 30,
    'net: server-timing header present': (r) => !!(r.headers['Server-Timing'] || r.headers['server-timing']),
  });

  successRate.add(ok);
  sleep(0.01);
}
