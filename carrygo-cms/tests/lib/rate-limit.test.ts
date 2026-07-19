import { describe, it, expect, beforeEach, vi } from 'vitest';
import { rateLimit, loginLimiter, apiLimiter } from '@/lib/rate-limit';

describe('rateLimit', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('allows requests within the limit', () => {
    const config = { windowMs: 60_000, maxRequests: 5 };
    const ip = '192.168.1.1';

    const result = rateLimit(ip, config);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.retryAfterSeconds).toBe(0);
  });

  it('allows up to maxRequests within the window', () => {
    const config = { windowMs: 60_000, maxRequests: 3 };
    const ip = '10.0.0.1';

    const r1 = rateLimit(ip, config);
    const r2 = rateLimit(ip, config);
    const r3 = rateLimit(ip, config);

    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it('blocks requests after max attempts are reached', () => {
    const config = { windowMs: 60_000, maxRequests: 2 };
    const ip = '10.0.0.2';

    rateLimit(ip, config);
    rateLimit(ip, config);
    const result = rateLimit(ip, config);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('resets after the window expires', () => {
    const config = { windowMs: 1_000, maxRequests: 1 };
    const ip = '10.0.0.3';

    vi.useFakeTimers();

    rateLimit(ip, config);
    const blocked = rateLimit(ip, config);
    expect(blocked.allowed).toBe(false);

    // Advance time past the window
    vi.advanceTimersByTime(1_100);

    const afterReset = rateLimit(ip, config);
    expect(afterReset.allowed).toBe(true);
    expect(afterReset.remaining).toBe(0);

    vi.useRealTimers();
  });

  it('evicts entries when MAX_STORE_SIZE is exceeded', () => {
    const config = { windowMs: 60_000, maxRequests: 100 };

    // Fill the store beyond MAX_STORE_SIZE (10,000) by making requests from many IPs
    for (let i = 0; i < 10_001; i++) {
      rateLimit(`evict-test-${i}`, config);
    }

    // The next request should still work (eviction happened)
    const result = rateLimit('evict-new-ip', config);
    expect(result.allowed).toBe(true);
  });

  it('tracks different IPs independently', () => {
    const config = { windowMs: 60_000, maxRequests: 1 };

    const r1 = rateLimit('ip-a', config);
    const r2 = rateLimit('ip-b', config);

    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
  });
});

describe('loginLimiter', () => {
  it('allows 5 login attempts', () => {
    const ip = 'login-test-ip';

    for (let i = 0; i < 5; i++) {
      const result = loginLimiter(ip);
      expect(result.allowed).toBe(true);
    }

    const blocked = loginLimiter(ip);
    expect(blocked.allowed).toBe(false);
  });
});

describe('apiLimiter', () => {
  it('allows 60 requests per window', () => {
    const ip = 'api-test-ip';

    for (let i = 0; i < 60; i++) {
      const result = apiLimiter(ip);
      expect(result.allowed).toBe(true);
    }

    const blocked = apiLimiter(ip);
    expect(blocked.allowed).toBe(false);
  });
});
