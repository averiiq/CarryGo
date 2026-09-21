/**
 * Server-side IP-based rate limiting for the CMS (Next.js).
 * Uses in-memory store with automatic TTL cleanup.
 *
 * TRADEOFF: In-memory rate limiting resets on serverless cold starts.
 * Windows are kept short (60s) so a cold-start bypass only gives an attacker
 * one extra minute of attempts before the limiter re-engages.
 * For stronger guarantees, replace with a persistent store (Redis, Supabase RPC).
 */

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds: number;
}

interface RateLimitEntry {
  timestamps: number[];
}

/** Maximum entries to prevent unbounded memory growth in long-lived instances */
const MAX_STORE_SIZE = 10_000;

const store: Map<string, RateLimitEntry> = new Map();

let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function cleanup(windowMs: number): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    const valid = entry.timestamps.filter((ts) => now - ts < windowMs * 2);
    if (valid.length === 0) {
      store.delete(key);
    } else {
      store.set(key, { timestamps: valid });
    }
  }
}

function ensureCleanup(windowMs: number): void {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(() => {
    cleanup(windowMs);
  }, 60_000);
}

export function rateLimit(
  ip: string,
  config: RateLimitConfig
): RateLimitResult {
  const { windowMs, maxRequests } = config;
  const now = Date.now();

  ensureCleanup(windowMs);

  // Evict stale entries on every check to bound memory and recover from bursts
  if (store.size > MAX_STORE_SIZE) {
    cleanup(windowMs);
  }

  // If still over limit after cleanup, evict oldest entries
  if (store.size > MAX_STORE_SIZE) {
    const keysToDelete = Array.from(store.keys()).slice(0, store.size - MAX_STORE_SIZE + 1);
    for (const key of keysToDelete) {
      store.delete(key);
    }
  }

  const entry = store.get(ip);
  const timestamps = entry
    ? entry.timestamps.filter((ts) => now - ts < windowMs)
    : [];

  const allowed = timestamps.length < maxRequests;

  if (allowed) {
    timestamps.push(now);
  }

  store.set(ip, { timestamps });

  const oldestInWindow = timestamps.length > 0 ? timestamps[0] : now;
  const resetAt = new Date(oldestInWindow + windowMs);
  const remaining = Math.max(0, maxRequests - timestamps.length);
  const retryAfterSeconds = allowed ? 0 : Math.ceil((resetAt.getTime() - now) / 1000);

  return { allowed, remaining, resetAt, retryAfterSeconds };
}

/** Login: 5 attempts per 60 seconds (short window to minimize cold-start bypass) */
export function loginLimiter(ip: string): RateLimitResult {
  return rateLimit(ip, { windowMs: 60_000, maxRequests: 5 });
}

/** General API: 60 requests per 60 seconds */
export function apiLimiter(ip: string): RateLimitResult {
  return rateLimit(ip, { windowMs: 60_000, maxRequests: 60 });
}

/** Admin actions: 20 per 60 seconds */
export function adminActionLimiter(ip: string): RateLimitResult {
  return rateLimit(ip, { windowMs: 60_000, maxRequests: 20 });
}
