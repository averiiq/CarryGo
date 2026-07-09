import { useCallback, useEffect, useRef, useState } from 'react';
import { RateLimiter } from '@/lib/rate-limiter';

interface UseRateLimiterResult {
  canProceed: boolean;
  record: () => void;
  remaining: number;
  resetIn: number;
}

export function useRateLimiter(
  limiter: RateLimiter,
  key: string
): UseRateLimiterResult {
  const [remaining, setRemaining] = useState(() => limiter.remaining(key));
  const [resetIn, setResetIn] = useState(() => limiter.resetIn(key));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateState = useCallback(() => {
    setRemaining(limiter.remaining(key));
    setResetIn(limiter.resetIn(key));
  }, [limiter, key]);

  useEffect(() => {
    updateState();

    intervalRef.current = setInterval(updateState, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [updateState]);

  const record = useCallback(() => {
    limiter.record(key);
    updateState();
  }, [limiter, key, updateState]);

  const canProceed = remaining > 0;

  return { canProceed, record, remaining, resetIn };
}
