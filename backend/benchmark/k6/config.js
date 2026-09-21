import { Counter, Rate, Trend } from 'k6/metrics';

// Global Environment Variables & Defaults
export const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:4000';
export const SUPABASE_URL = __ENV.SUPABASE_URL || 'https://nuxvuejtnobljutznlss.supabase.co';
export const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51eHZ1ZWp0bm9ibGp1dHpubHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MzEwMTcsImV4cCI6MjA5NjQwNzAxN30.S6Luoi_LU2B9IB7Q-h8wGfneVqtx42ePDGiKgumMElU';

// Custom Metrics for Precision Analysis
export const ttfbTrend = new Trend('carrygo_ttfb_ms');
export const successRate = new Rate('carrygo_success_rate');
export const throttledCounter = new Counter('carrygo_throttled_429_total');
export const loadShedCounter = new Counter('carrygo_loadshed_503_total');

// Helper to generate simulated unique client IP for distributed simulation
export function getClientIp(vu, iter) {
  const o1 = 103;
  const o2 = 21;
  const o3 = ((vu || 1) % 250) + 1;
  const o4 = ((iter || 1) % 250) + 1;
  return `${o1}.${o2}.${o3}.${o4}`;
}

// Standard header builder
export function getStandardHeaders(options = {}) {
  const {
    userId = '00000000-0000-0000-0000-000000000001',
    role = 'user',
    ip,
    idempotencyKey,
  } = options;

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'CarryGo-k6-Benchmarker/3.0.0',
    'x-user-id': userId,
    'x-role': role,
  };

  if (ip) {
    headers['X-Forwarded-For'] = ip;
  }
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  return { headers };
}

// Indian city pairs for realistic routing
export const CITY_PAIRS = [
  { from: 'Hisar', to: 'Delhi' },
  { from: 'Delhi', to: 'Chandigarh' },
  { from: 'Delhi', to: 'Jaipur' },
  { from: 'Mumbai', to: 'Pune' },
  { from: 'Bengaluru', to: 'Chennai' },
  { from: 'Hyderabad', to: 'Vijayawada' },
];

export function getRandomCityPair() {
  return CITY_PAIRS[Math.floor(Math.random() * CITY_PAIRS.length)];
}
