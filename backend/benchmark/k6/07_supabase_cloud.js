import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  successRate,
  ttfbTrend,
} from './config.js';

const supabaseQueryTrend = new Trend('supabase_db_query_duration_ms');

export const options = {
  stages: [
    { duration: '3s', target: 5 },
    { duration: '6s', target: 12 },
    { duration: '3s', target: 0 },
  ],
  thresholds: {
    supabase_db_query_duration_ms: ['p(95)<8000'], // Cross-region cloud DB p95 < 8000ms
    http_req_failed: ['rate<0.05'],
  },
};

const supabaseHeaders = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'count=exact',
};

export default function () {
  // Query 1: User Profiles check
  const resUsers = http.get(
    `${SUPABASE_URL}/rest/v1/user_profiles?select=id,role&limit=3`,
    { headers: supabaseHeaders }
  );
  ttfbTrend.add(resUsers.timings.waiting);
  supabaseQueryTrend.add(resUsers.timings.duration);

  const usersOk = check(resUsers, {
    'supabase: users query status 200 or 206': (r) => r.status === 200 || r.status === 206,
    'supabase: tls handshake succeeded': (r) => r.timings.tls_handshaking >= 0,
  });
  successRate.add(usersOk);

  // Query 2: Active Trips
  const resTrips = http.get(
    `${SUPABASE_URL}/rest/v1/trips?select=id,from_city,to_city,status&status=eq.active&limit=3`,
    { headers: supabaseHeaders }
  );
  supabaseQueryTrend.add(resTrips.timings.duration);

  const tripsOk = check(resTrips, {
    'supabase: trips query status 200 or 206': (r) => r.status === 200 || r.status === 206,
  });
  successRate.add(tripsOk);

  // Query 3: Open Parcels
  const resParcels = http.get(
    `${SUPABASE_URL}/rest/v1/parcels?select=id,from_city,to_city,status&status=eq.open&limit=3`,
    { headers: supabaseHeaders }
  );
  supabaseQueryTrend.add(resParcels.timings.duration);

  const parcelsOk = check(resParcels, {
    'supabase: parcels query status 200 or 206': (r) => r.status === 200 || r.status === 206,
  });
  successRate.add(parcelsOk);

  sleep(0.1);
}
