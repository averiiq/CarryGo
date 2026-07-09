/**
 * Client-side rate limiting to prevent abuse.
 * Uses in-memory Map with TTL-based cleanup.
 */

interface RateLimiterConfig {
  windowMs: number;
  maxAttempts: number;
}

interface RateLimitEntry {
  timestamps: number[];
}

export class RateLimiter {
  private readonly windowMs: number;
  private readonly maxAttempts: number;
  private readonly entries: Map<string, RateLimitEntry> = new Map();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: RateLimiterConfig) {
    this.windowMs = config.windowMs;
    this.maxAttempts = config.maxAttempts;
    this.startCleanup();
  }

  canProceed(key: string): boolean {
    const now = Date.now();
    const entry = this.entries.get(key);

    if (!entry) {
      return true;
    }

    const validTimestamps = entry.timestamps.filter(
      (ts) => now - ts < this.windowMs
    );

    return validTimestamps.length < this.maxAttempts;
  }

  record(key: string): void {
    const now = Date.now();
    const entry = this.entries.get(key);

    if (!entry) {
      this.entries.set(key, { timestamps: [now] });
      return;
    }

    const validTimestamps = entry.timestamps.filter(
      (ts) => now - ts < this.windowMs
    );
    validTimestamps.push(now);

    this.entries.set(key, { timestamps: validTimestamps });
  }

  remaining(key: string): number {
    const now = Date.now();
    const entry = this.entries.get(key);

    if (!entry) {
      return this.maxAttempts;
    }

    const validCount = entry.timestamps.filter(
      (ts) => now - ts < this.windowMs
    ).length;

    return Math.max(0, this.maxAttempts - validCount);
  }

  resetIn(key: string): number {
    const now = Date.now();
    const entry = this.entries.get(key);

    if (!entry || entry.timestamps.length === 0) {
      return 0;
    }

    const oldestValid = entry.timestamps.find(
      (ts) => now - ts < this.windowMs
    );

    if (!oldestValid) {
      return 0;
    }

    return Math.max(0, this.windowMs - (now - oldestValid));
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.entries) {
        const validTimestamps = entry.timestamps.filter(
          (ts) => now - ts < this.windowMs
        );
        if (validTimestamps.length === 0) {
          this.entries.delete(key);
        } else {
          this.entries.set(key, { timestamps: validTimestamps });
        }
      }
    }, this.windowMs * 2);
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.entries.clear();
  }
}

/** 3 attempts per 60 seconds */
export const paymentLimiter = new RateLimiter({
  windowMs: 60_000,
  maxAttempts: 3,
});

/** 10 attempts per 60 seconds */
export const requestLimiter = new RateLimiter({
  windowMs: 60_000,
  maxAttempts: 10,
});

/** 30 attempts per 60 seconds */
export const messageLimiter = new RateLimiter({
  windowMs: 60_000,
  maxAttempts: 30,
});

/** 20 attempts per 60 seconds */
export const searchLimiter = new RateLimiter({
  windowMs: 60_000,
  maxAttempts: 20,
});
