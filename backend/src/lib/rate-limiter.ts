interface RateLimitRecord {
  timestamps: number[];
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Sliding window in-memory rate limiter to protect hot paths against:
 * 1. Abusive flood attacks.
 * 2. Retry storms from misconfigured clients or network disconnects.
 */
export class SlidingWindowRateLimiter {
  private store = new Map<string, RateLimitRecord>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs = 60_000, maxRequests = 60) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  check(key: string, customLimit?: number): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const limit = customLimit ?? this.maxRequests;

    let record = this.store.get(key);
    if (!record) {
      record = { timestamps: [] };
      this.store.set(key, record);
    }

    // Filter out timestamps outside the sliding window
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    if (record.timestamps.length >= limit) {
      const oldestTimestamp = record.timestamps[0];
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((oldestTimestamp + this.windowMs - now) / 1000),
      );

      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds,
      };
    }

    record.timestamps.push(now);

    return {
      allowed: true,
      remaining: limit - record.timestamps.length,
      retryAfterSeconds: 0,
    };
  }

  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [key, record] of this.store.entries()) {
      record.timestamps = record.timestamps.filter((ts) => ts > windowStart);
      if (record.timestamps.length === 0) {
        this.store.delete(key);
      }
    }
  }
}

// Global rate limiters
// 1. General API limiter: 120 requests/minute per client
export const globalApiRateLimiter = new SlidingWindowRateLimiter(60_000, 120);

// 2. Sensitive mutation limiter (trips, parcels, requests, bookings): 30 requests/minute per client
export const mutationRateLimiter = new SlidingWindowRateLimiter(60_000, 30);

// 3. Sensitive KYC limiter (Aadhaar initiation, OTP/DigiLocker polling, PAN checks): 6 requests/minute per client
export const kycRateLimiter = new SlidingWindowRateLimiter(60_000, 6);

