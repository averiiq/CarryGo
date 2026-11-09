import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Throttles a rapidly changing value so it only updates at most once per interval (e.g. scroll offset, GPS coords).
 */
export function useThrottle<T>(value: T, interval = 300): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef<number>(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= interval) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, interval - (Date.now() - lastRan.current));

    return () => clearTimeout(handler);
  }, [value, interval]);

  return throttledValue;
}

/**
 * Throttles a callback function so it can only be invoked at most once per interval.
 * Guarantees leading edge execution + trailing edge execution with the freshest arguments.
 * Crucial for preventing rapid double-tap button submissions, repeated API requests, and location reporting.
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  interval = 400
): (...args: Parameters<T>) => void {
  const callbackRef = useRef<T>(callback);
  callbackRef.current = callback;
  const lastCalledRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastArgsRef = useRef<Parameters<T> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const elapsed = now - lastCalledRef.current;
      lastArgsRef.current = args;

      if (elapsed >= interval) {
        lastCalledRef.current = now;
        callbackRef.current(...args);
      } else if (!timerRef.current) {
        timerRef.current = setTimeout(() => {
          lastCalledRef.current = Date.now();
          timerRef.current = null;
          if (lastArgsRef.current) {
            callbackRef.current(...lastArgsRef.current);
          }
        }, interval - elapsed);
      }
    },
    [interval]
  );
}
