export function retryDelay(attemptIndex: number, baseMs = 1000, maxMs = 30000): number {
  const delay = Math.min(baseMs * 2 ** attemptIndex, maxMs);
  const jitter = delay * 0.1 * Math.random();
  return delay + jitter;
}

export function shouldRetry(failureCount: number, error: unknown, maxRetries = 3): boolean {
  if (failureCount >= maxRetries) return false;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('unauthorized') || msg.includes('forbidden') || msg.includes('not found')) return false;
  }
  return true;
}
