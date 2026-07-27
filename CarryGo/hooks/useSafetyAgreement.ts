import { useState, useEffect, useCallback } from 'react';
import { storageGet, storageSet } from '@/lib/secure-storage';

const SAFETY_KEY_PREFIX = 'safety_agreed_';

export function useSafetyAgreement(userId?: string): {
  hasAgreed: boolean;
  isLoading: boolean;
  markAgreed: () => Promise<void>;
} {
  const [hasAgreed, setHasAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function check() {
      try {
        const value = await storageGet<string>(`${SAFETY_KEY_PREFIX}${userId}`);
        if (!cancelled) {
          setHasAgreed(value === 'true');
        }
      } catch {
        if (!cancelled) {
          setHasAgreed(false);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    check();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const markAgreed = useCallback(async () => {
    if (!userId) return;
    await storageSet(`${SAFETY_KEY_PREFIX}${userId}`, 'true');
    setHasAgreed(true);
  }, [userId]);

  return { hasAgreed, isLoading, markAgreed };
}
