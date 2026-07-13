import { retryDelay, shouldRetry } from '@/lib/retry';

describe('retryDelay', () => {
  it('uses exponential backoff', () => {
    const delay0 = retryDelay(0, 1000, 30000);
    const delay1 = retryDelay(1, 1000, 30000);
    const delay2 = retryDelay(2, 1000, 30000);

    expect(delay0).toBeGreaterThanOrEqual(1000);
    expect(delay0).toBeLessThan(1200);
    expect(delay1).toBeGreaterThanOrEqual(2000);
    expect(delay1).toBeLessThan(2400);
    expect(delay2).toBeGreaterThanOrEqual(4000);
    expect(delay2).toBeLessThan(4800);
  });

  it('caps at maxMs', () => {
    const delay = retryDelay(10, 1000, 30000);
    expect(delay).toBeLessThanOrEqual(33000);
  });

  it('respects custom baseMs', () => {
    const delay = retryDelay(0, 500, 30000);
    expect(delay).toBeGreaterThanOrEqual(500);
    expect(delay).toBeLessThan(600);
  });
});

describe('shouldRetry', () => {
  it('retries when under max attempts', () => {
    expect(shouldRetry(0, new Error('timeout'))).toBe(true);
    expect(shouldRetry(2, new Error('timeout'))).toBe(true);
  });

  it('stops at max retries', () => {
    expect(shouldRetry(3, new Error('timeout'))).toBe(false);
    expect(shouldRetry(5, new Error('timeout'))).toBe(false);
  });

  it('does not retry 401 unauthorized', () => {
    expect(shouldRetry(0, new Error('Unauthorized'))).toBe(false);
  });

  it('does not retry 403 forbidden', () => {
    expect(shouldRetry(0, new Error('Forbidden'))).toBe(false);
  });

  it('does not retry 404 not found', () => {
    expect(shouldRetry(0, new Error('Not found'))).toBe(false);
  });

  it('retries generic errors', () => {
    expect(shouldRetry(0, new Error('Server error'))).toBe(true);
  });

  it('retries non-Error objects', () => {
    expect(shouldRetry(0, { code: 500 })).toBe(true);
  });

  it('respects custom maxRetries', () => {
    expect(shouldRetry(4, new Error('timeout'), 5)).toBe(true);
    expect(shouldRetry(5, new Error('timeout'), 5)).toBe(false);
  });
});
