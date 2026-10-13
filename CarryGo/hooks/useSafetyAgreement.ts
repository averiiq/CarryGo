import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SAFETY_KEY_PREFIX = 'CARRYGO_SAFETY_AGREED_';
const LEGACY_SAFETY_KEY_PREFIX = 'HIZLI_SAFETY_AGREED_';

export function useSafetyAgreement(userId: string | undefined) {
  const [hasAgreed, setHasAgreed] = useState(false);
  const storageKey = userId ? `${SAFETY_KEY_PREFIX}${userId}` : null;
  const legacyStorageKey = userId ? `${LEGACY_SAFETY_KEY_PREFIX}${userId}` : null;

  useEffect(() => {
    if (!storageKey) return;
    AsyncStorage.getItem(storageKey).then(async (val) => {
      if (val === 'true') {
        setHasAgreed(true);
        return;
      }
      if (legacyStorageKey) {
        const legacyVal = await AsyncStorage.getItem(legacyStorageKey);
        if (legacyVal === 'true') {
          setHasAgreed(true);
          AsyncStorage.setItem(storageKey, 'true');
        }
      }
    });
  }, [storageKey, legacyStorageKey]);

  const markAgreed = useCallback(() => {
    if (!storageKey) return;
    setHasAgreed(true);
    AsyncStorage.setItem(storageKey, 'true');
  }, [storageKey]);

  return { hasAgreed, markAgreed };
}
