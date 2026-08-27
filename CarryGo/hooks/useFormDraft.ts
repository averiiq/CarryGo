import { useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DRAFT_PREFIX = 'CARRYGO_DRAFT_';

export function useFormDraft<T extends Record<string, unknown>>(
  key: string,
  currentValues: T,
  setValues: (values: T) => void,
) {
  const storageKey = `${DRAFT_PREFIX}${key}`;
  const hasRestoredRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    AsyncStorage.getItem(storageKey).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as T;
        setValues(parsed);
      } catch {
        AsyncStorage.removeItem(storageKey);
      }
    });
  }, [storageKey, setValues]);

  useEffect(() => {
    if (!hasRestoredRef.current) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      const hasContent = Object.values(currentValues).some(
        (v) => {
          if (v === '' || v === null || v === undefined) return false;
          if (Array.isArray(v)) return v.length > 0;
          if (typeof v === 'object') return Object.keys(v).length > 0;
          return true;
        },
      );
      if (hasContent) {
        AsyncStorage.setItem(storageKey, JSON.stringify(currentValues));
      }
    }, 800);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [currentValues, storageKey]);

  const clearDraft = useCallback(() => {
    AsyncStorage.removeItem(storageKey);
  }, [storageKey]);

  const hasDraft = useCallback(async () => {
    const raw = await AsyncStorage.getItem(storageKey);
    return raw !== null;
  }, [storageKey]);

  return { clearDraft, hasDraft };
}
