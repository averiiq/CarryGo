export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  factor?: number;
  jitter?: boolean;
}

/**
 * Enterprise Retry Utility with Full Jitter:
 * Prevents thundering herd problems when downstream dependencies experience transient failures.
 */
export async function withRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const initialDelayMs = options.initialDelayMs ?? 100;
  const maxDelayMs = options.maxDelayMs ?? 3000;
  const factor = options.factor ?? 2;
  const useJitter = options.jitter ?? true;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation(attempt);
    } catch (err) {
      lastError = err;
      if (attempt === maxRetries) {
        break;
      }

      // Calculate exponential backoff
      let delay = Math.min(initialDelayMs * Math.pow(factor, attempt - 1), maxDelayMs);
      if (useJitter) {
        // Full jitter: uniformly distributed between 0 and delay
        delay = Math.floor(Math.random() * delay);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
