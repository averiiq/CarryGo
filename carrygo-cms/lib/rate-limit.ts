/**
 * Server-side IP-based rate limiting for the CMS (Next.js).
 * Uses in-memory store with automatic TTL cleanup.
 */

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

interface RateLimitEntry {
  timestamps: number[];
}

const store: Map<string, RateLimitEntry> = new Map();

let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function ensureCleanup(windowMs: number): void {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      const valid = entry.timestamps.filter((ts) => now - ts < windowMs * 2);
      if (valid.length === 0) {
        store.delete(key);
      } else {
        store.set(key, { timestamps: valid });
      }
    }
  }, 60_000);
}

export function rateLimit(
  ip: string,
  config: RateLimitConfig
): RateLimitResult {
  const { windowMs, maxRequests } = config;
  const now = Date.now();

  ensureCleanup(windowMs);

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

  return { allowed, remaining, resetAt };
}

/** Login: 5 attempts per minute */
export function loginLimiter(ip: string): RateLimitResult {
  return rateLimit(ip, { windowMs: 60_000, maxRequests: 5 });
}

/** General API: 60 requests per minute */
export function apiLimiter(ip: string): RateLimitResult {
  return rateLimit(ip, { windowMs: 60_000, maxRequests: 60 });
}

/** Admin actions: 20 per minute */
export function adminActionLimiter(ip: string): RateLimitResult {
  return rateLimit(ip, { windowMs: 60_000, maxRequests: 20 });
}
