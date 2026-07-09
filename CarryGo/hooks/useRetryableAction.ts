import { useCallback, useRef, useState } from 'react';
import { handleServiceError, isNetworkError, AppError } from '@/lib/error-handler';

interface RetryConfig {
  maxRetries?: number;
  baseDelayMs?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: AppError) => void;
}

interface UseRetryableActionResult<T> {
  execute: (...args: unknown[]) => Promise<T | undefined>;
  isRetrying: boolean;
  attempt: number;
  error: AppError | null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientError(error: unknown): boolean {
  return isNetworkError(error);
}

export function useRetryableAction<T>(
  action: (...args: unknown[]) => Promise<T>,
  config: RetryConfig = {}
): UseRetryableActionResult<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    backoffMultiplier = 2,
    onRetry,
  } = config;

  const [isRetrying, setIsRetrying] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<AppError | null>(null);
  const abortRef = useRef(false);

  const execute = useCallback(
    async (...args: unknown[]): Promise<T | undefined> => {
      abortRef.current = false;
      setError(null);
      setAttempt(0);
      setIsRetrying(false);

      for (let i = 0; i <= maxRetries; i++) {
        if (abortRef.current) {
          return undefined;
        }

        setAttempt(i);

        try {
          const result = await action(...args);
          setIsRetrying(false);
          setAttempt(0);
          return result;
        } catch (err: unknown) {
          const appError = handleServiceError(err);

          if (i === maxRetries || !isTransientError(err)) {
            setError(appError);
            setIsRetrying(false);
            return undefined;
          }

          setIsRetrying(true);
          onRetry?.(i + 1, appError);

          const delayMs = baseDelayMs * Math.pow(backoffMultiplier, i);
          await delay(delayMs);
        }
      }

      return undefined;
    },
    [action, maxRetries, baseDelayMs, backoffMultiplier, onRetry]
  );

  return { execute, isRetrying, attempt, error };
}
