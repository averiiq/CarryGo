import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SAFETY_KEY_PREFIX = 'CARRYGO_SAFETY_AGREED_';

export function useSafetyAgreement(userId: string | undefined) {
  const [hasAgreed, setHasAgreed] = useState(false);
  const storageKey = userId ? `${SAFETY_KEY_PREFIX}${userId}` : null;

  useEffect(() => {
    if (!storageKey) return;
    AsyncStorage.getItem(storageKey).then((val) => {
      if (val === 'true') setHasAgreed(true);
    });
  }, [storageKey]);

  const markAgreed = useCallback(() => {
    if (!storageKey) return;
    setHasAgreed(true);
    AsyncStorage.setItem(storageKey, 'true');
  }, [storageKey]);

  return { hasAgreed, markAgreed };
}
