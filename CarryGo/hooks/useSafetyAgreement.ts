import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SafetyRole = 'sender' | 'traveller';

const SAFETY_AGREED_PREFIX = 'CARRYGO_SAFETY_AGREED_';
const SAFETY_COUNT_PREFIX = 'CARRYGO_SAFETY_COUNT_';
const SAFETY_LAST_SHOWN_PREFIX = 'CARRYGO_SAFETY_LAST_SHOWN_';
const LEGACY_SAFETY_KEY_PREFIX = 'HIZLI_SAFETY_AGREED_';

// Number of actions (sends/posts) between safety refreshes
export const SAFETY_REFRESH_INTERVAL = 5;

export function useSafetyAgreement(userId: string | undefined, role: SafetyRole = 'sender') {
  const [isReady, setIsReady] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(false);
  const [shouldShowSafety, setShouldShowSafety] = useState(false);
  const [actionCount, setActionCount] = useState(0);

  const roleUpper = role.toUpperCase();
  const agreedKey = userId ? `${SAFETY_AGREED_PREFIX}${roleUpper}_${userId}` : null;
  const countKey = userId ? `${SAFETY_COUNT_PREFIX}${roleUpper}_${userId}` : null;
  const lastShownKey = userId ? `${SAFETY_LAST_SHOWN_PREFIX}${roleUpper}_${userId}` : null;
  const legacyDefaultKey = userId && role === 'sender' ? `${SAFETY_AGREED_PREFIX}${userId}` : null;
  const legacyOldKey = userId && role === 'sender' ? `${LEGACY_SAFETY_KEY_PREFIX}${userId}` : null;

  useEffect(() => {
    if (!userId || !agreedKey || !countKey || !lastShownKey) {
      setIsReady(true);
      return;
    }

    let isMounted = true;

    async function loadState() {
      try {
        const [agreedVal, countVal, lastShownVal] = await Promise.all([
          AsyncStorage.getItem(agreedKey!),
          AsyncStorage.getItem(countKey!),
          AsyncStorage.getItem(lastShownKey!),
        ]);

        let agreed = agreedVal === 'true';

        // Check legacy keys for existing senders
        if (!agreed && legacyDefaultKey) {
          const legacyAgreed = await AsyncStorage.getItem(legacyDefaultKey);
          if (legacyAgreed === 'true') {
            agreed = true;
            await AsyncStorage.setItem(agreedKey!, 'true');
          } else if (legacyOldKey) {
            const legacyOld = await AsyncStorage.getItem(legacyOldKey);
            if (legacyOld === 'true') {
              agreed = true;
              await AsyncStorage.setItem(agreedKey!, 'true');
            }
          }
        }

        const count = countVal ? parseInt(countVal, 10) || 0 : 0;
        const lastShown = lastShownVal ? parseInt(lastShownVal, 10) || 0 : 0;

        // Determination logic:
        // 1. If user has never agreed: MUST show safety onboarding on 1st send / post
        // 2. If user has agreed: show ONLY after every 5 sends/posts (refresher interval)
        let show = false;
        if (!agreed) {
          show = true;
        } else {
          const diff = count - lastShown;
          if (diff >= SAFETY_REFRESH_INTERVAL) {
            show = true;
          }
        }

        if (isMounted) {
          setHasAgreed(agreed);
          setActionCount(count);
          setShouldShowSafety(show);
          setIsReady(true);
        }
      } catch (err) {
        console.warn(`[useSafetyAgreement] Error loading state for ${role}:`, err);
        if (isMounted) {
          setIsReady(true);
        }
      }
    }

    loadState();

    return () => {
      isMounted = false;
    };
  }, [userId, agreedKey, countKey, lastShownKey, legacyDefaultKey, legacyOldKey, role]);

  const markAgreed = useCallback(async () => {
    if (!agreedKey || !lastShownKey) return;
    try {
      setHasAgreed(true);
      setShouldShowSafety(false);
      await Promise.all([
        AsyncStorage.setItem(agreedKey, 'true'),
        AsyncStorage.setItem(lastShownKey, String(actionCount)),
      ]);
    } catch (err) {
      console.warn(`[useSafetyAgreement] Error marking agreed for ${role}:`, err);
    }
  }, [agreedKey, lastShownKey, actionCount, role]);

  const recordActionCompleted = useCallback(async () => {
    if (!countKey) return;
    try {
      const currentVal = await AsyncStorage.getItem(countKey);
      const currentCount = currentVal ? parseInt(currentVal, 10) || 0 : 0;
      const nextCount = currentCount + 1;
      setActionCount(nextCount);
      await AsyncStorage.setItem(countKey, String(nextCount));
    } catch (err) {
      console.warn(`[useSafetyAgreement] Error recording action for ${role}:`, err);
    }
  }, [countKey, role]);

  return {
    isReady,
    hasAgreed,
    shouldShowSafety,
    actionCount,
    markAgreed,
    recordActionCompleted,
  };
}
