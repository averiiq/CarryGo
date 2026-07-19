import { RateLimiter } from '@/lib/rate-limiter';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  afterEach(() => {
    if (limiter) {
      limiter.destroy();
    }
  });

  describe('canProceed', () => {
    it('allows first request for a new key', () => {
      limiter = new RateLimiter({ windowMs: 60000, maxAttempts: 3 });

      expect(limiter.canProceed('user-1')).toBe(true);
    });

    it('allows requests within the limit', () => {
      limiter = new RateLimiter({ windowMs: 60000, maxAttempts: 3 });

      limiter.record('user-1');
      limiter.record('user-1');

      expect(limiter.canProceed('user-1')).toBe(true);
    });

    it('blocks requests after max attempts reached', () => {
      limiter = new RateLimiter({ windowMs: 60000, maxAttempts: 3 });

      limiter.record('user-1');
      limiter.record('user-1');
      limiter.record('user-1');

      expect(limiter.canProceed('user-1')).toBe(false);
    });

    it('allows exactly maxAttempts - 1 records before blocking', () => {
      limiter = new RateLimiter({ windowMs: 60000, maxAttempts: 5 });

      for (let i = 0; i < 4; i++) {
        limiter.record('user-1');
      }
      expect(limiter.canProceed('user-1')).toBe(true);

      limiter.record('user-1');
      expect(limiter.canProceed('user-1')).toBe(false);
    });
  });

  describe('record', () => {
    it('creates a new entry for unknown key', () => {
      limiter = new RateLimiter({ windowMs: 60000, maxAttempts: 3 });

      limiter.record('new-key');
      expect(limiter.remaining('new-key')).toBe(2);
    });

    it('appends timestamp to existing entry', () => {
      limiter = new RateLimiter({ windowMs: 60000, maxAttempts: 5 });

      limiter.record('user-1');
      expect(limiter.remaining('user-1')).toBe(4);

      limiter.record('user-1');
      expect(limiter.remaining('user-1')).toBe(3);
    });
  });

  describe('remaining', () => {
    it('returns maxAttempts for unknown key', () => {
      limiter = new RateLimiter({ windowMs: 60000, maxAttempts: 10 });

      expect(limiter.remaining('unknown')).toBe(10);
    });

    it('decreases with each recorded attempt', () => {
      limiter = new RateLimiter({ windowMs: 60000, maxAttempts: 5 });

      limiter.record('user-1');
      expect(limiter.remaining('user-1')).toBe(4);

      limiter.record('user-1');
      expect(limiter.remaining('user-1')).toBe(3);

      limiter.record('user-1');
      expect(limiter.remaining('user-1')).toBe(2);
    });

    it('never returns negative values', () => {
      limiter = new RateLimiter({ windowMs: 60000, maxAttempts: 2 });

      limiter.record('user-1');
      limiter.record('user-1');
      limiter.record('user-1'); // over limit

      expect(limiter.remaining('user-1')).toBe(0);
    });
  });

  describe('resetIn', () => {
    it('returns 0 for unknown key', () => {
      limiter = new RateLimiter({ windowMs: 60000, maxAttempts: 3 });

      expect(limiter.resetIn('unknown')).toBe(0);
    });

    it('returns time remaining until oldest valid timestamp expires', () => {
      limiter = new RateLimiter({ windowMs: 60000, maxAttempts: 3 });

      limiter.record('user-1');

      const resetTime = limiter.resetIn('user-1');
      expect(resetTime).toBeGreaterThan(0);
      expect(resetTime).toBeLessThanOrEqual(60000);
    });

    it('returns 0 when all timestamps have expired', () => {
      limiter = new RateLimiter({ windowMs: 1, maxAttempts: 3 });

      limiter.record('user-1');

      // Wait for the window to expire
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now + 10);

      expect(limiter.resetIn('user-1')).toBe(0);

      (Date.now as jest.Mock).mockRestore();
    });
  });

  describe('window TTL expiry', () => {
    it('allows requests again after window expires', () => {
      limiter = new RateLimiter({ windowMs: 100, maxAttempts: 2 });

      const startTime = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(startTime);

      limiter.record('user-1');
      limiter.record('user-1');
      expect(limiter.canProceed('user-1')).toBe(false);

      // Advance time past the window
      (Date.now as jest.Mock).mockReturnValue(startTime + 150);

      expect(limiter.canProceed('user-1')).toBe(true);

      (Date.now as jest.Mock).mockRestore();
    });

    it('only expires timestamps outside the window', () => {
      limiter = new RateLimiter({ windowMs: 1000, maxAttempts: 3 });

      const startTime = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(startTime);

      limiter.record('user-1');

      // Advance 500ms and add another record
      (Date.now as jest.Mock).mockReturnValue(startTime + 500);
      limiter.record('user-1');

      // Advance 600ms more (first record expired at 1000ms, second still valid)
      (Date.now as jest.Mock).mockReturnValue(startTime + 1100);

      // Only one valid timestamp remains
      expect(limiter.remaining('user-1')).toBe(2);

      (Date.now as jest.Mock).mockRestore();
    });
  });

  describe('multiple actions tracked independently', () => {
    it('tracks different keys independently', () => {
      limiter = new RateLimiter({ windowMs: 60000, maxAttempts: 2 });

      limiter.record('action-a');
      limiter.record('action-a');

      expect(limiter.canProceed('action-a')).toBe(false);
      expect(limiter.canProceed('action-b')).toBe(true);
    });

    it('exhausting one key does not affect others', () => {
      limiter = new RateLimiter({ windowMs: 60000, maxAttempts: 1 });

      limiter.record('key-1');
      expect(limiter.canProceed('key-1')).toBe(false);

      limiter.record('key-2');
      expect(limiter.canProceed('key-2')).toBe(false);

      expect(limiter.remaining('key-3')).toBe(1);
      expect(limiter.canProceed('key-3')).toBe(true);
    });
  });

  describe('destroy', () => {
    it('clears all entries', () => {
      limiter = new RateLimiter({ windowMs: 60000, maxAttempts: 3 });

      limiter.record('user-1');
      limiter.record('user-2');
      limiter.destroy();

      // After destroy, getting remaining for known keys should return max
      // because entries are cleared
      expect(limiter.remaining('user-1')).toBe(3);
      expect(limiter.remaining('user-2')).toBe(3);
    });

    it('stops the cleanup timer', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      limiter = new RateLimiter({ windowMs: 60000, maxAttempts: 3 });

      limiter.destroy();
      expect(clearIntervalSpy).toHaveBeenCalled();

      clearIntervalSpy.mockRestore();
    });

    it('can be called multiple times without error', () => {
      limiter = new RateLimiter({ windowMs: 60000, maxAttempts: 3 });

      expect(() => {
        limiter.destroy();
        limiter.destroy();
      }).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('handles maxAttempts of 1', () => {
      limiter = new RateLimiter({ windowMs: 60000, maxAttempts: 1 });

      expect(limiter.canProceed('user-1')).toBe(true);
      limiter.record('user-1');
      expect(limiter.canProceed('user-1')).toBe(false);
    });

    it('handles very short window', () => {
      limiter = new RateLimiter({ windowMs: 1, maxAttempts: 100 });

      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);
      limiter.record('user-1');

      (Date.now as jest.Mock).mockReturnValue(now + 5);
      // After 5ms with a 1ms window, all previous timestamps should be expired
      expect(limiter.canProceed('user-1')).toBe(true);
      expect(limiter.remaining('user-1')).toBe(100);

      (Date.now as jest.Mock).mockRestore();
    });

    it('handles empty string as key', () => {
      limiter = new RateLimiter({ windowMs: 60000, maxAttempts: 3 });

      limiter.record('');
      expect(limiter.remaining('')).toBe(2);
    });
  });
});
