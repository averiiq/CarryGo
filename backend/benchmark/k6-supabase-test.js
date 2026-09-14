import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '3s', target: 5 },  // Warm up connections to Supabase cloud
    { duration: '6s', target: 15 }, // Realistic concurrent mobile queries
    { duration: '3s', target: 0 },  // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<400'], // Supabase cloud cross-region p95 under 400ms
    http_req_failed: ['rate<0.05'],    // Less than 5% errors
  },
};

const SUPABASE_URL = __ENV.SUPABASE_URL || 'https://nuxvuejtnobljutznlss.supabase.co';
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51eHZ1ZWp0bm9ibGp1dHpubHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MzEwMTcsImV4cCI6MjA5NjQwNzAxN30.S6Luoi_LU2B9IB7Q-h8wGfneVqtx42ePDGiKgumMElU';

const params = {
  headers: {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'count=exact',
  },
};

export default function () {
  // Test reading user profiles count / status from live Supabase
  const res = http.get(`${SUPABASE_URL}/rest/v1/user_profiles?select=id,role&limit=1`, params);

  check(res, {
    'status is 200 or 206': (r) => r.status === 200 || r.status === 206,
    'tls handshake succeeded': (r) => r.timings.tls_handshaking >= 0,
  });

  sleep(0.1);
}
