import { useEffect, useRef, useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DRAFT_PREFIX = 'CARRYGO_DRAFT_';
const LEGACY_DRAFT_PREFIX = 'HIZLI_DRAFT_';

type DraftOptions<T> = {
  onRestore?: (values: T) => void;
};

/**
 * Validates whether a draft object contains meaningful user-provided data,
 * preventing default boilerplate fields (like vehicle: 'car' or category: 'documents')
 * from falsely triggering "Draft restored from last session".
 */
export function isMeaningfulDraft(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const record = data as Record<string, unknown>;

  // Check origin or destination
  const fromCity = String(record.fromCity || '').trim();
  const toCity = String(record.toCity || '').trim();
  if (fromCity.length > 0 || toCity.length > 0) return true;

  // Check text content, weights, pricing, capacities
  const desc = String(record.description || record.tripNote || '').trim();
  const weight = String(record.weight || '').trim();
  const price = String(record.priceOffer || record.price || '').trim();
  const capacity = String(record.capacity || '').trim();
  if (desc.length > 0 || weight.length > 0 || price.length > 0 || capacity.length > 0) return true;

  // Check dates or schedules
  const date = String(record.deliveryDate || record.date || '').trim();
  if (date.length > 0) return true;

  // Check attached images
  if (Array.isArray(record.images) && record.images.length > 0) return true;

  return false;
}

export function useFormDraft<T extends Record<string, unknown>>(
  key: string,
  currentValues: T,
  setValues: (values: T) => void,
  options?: DraftOptions<T>,
) {
  const storageKey = `${DRAFT_PREFIX}${key}`;
  const legacyStorageKey = `${LEGACY_DRAFT_PREFIX}${key}`;
  const hasRestoredRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isDraftRestored, setIsDraftRestored] = useState(false);

  // Restore on mount
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    AsyncStorage.getItem(storageKey).then(async (raw) => {
      let content = raw;
      if (!content) {
        content = await AsyncStorage.getItem(legacyStorageKey);
      }
      if (!content) return;

      try {
        const parsed = JSON.parse(content) as T;
        // Only restore and notify if there is actual meaningful user input
        if (isMeaningfulDraft(parsed)) {
          setValues(parsed);
          setIsDraftRestored(true);
          options?.onRestore?.(parsed);
        } else {
          // Clean up empty/boilerplate draft
          await AsyncStorage.removeItem(storageKey);
          await AsyncStorage.removeItem(legacyStorageKey);
        }
      } catch {
        await AsyncStorage.removeItem(storageKey);
        await AsyncStorage.removeItem(legacyStorageKey);
      }
    });
  }, [storageKey, legacyStorageKey, setValues, options]);

  // Debounced auto-save
  useEffect(() => {
    if (!hasRestoredRef.current) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      if (isMeaningfulDraft(currentValues)) {
        AsyncStorage.setItem(storageKey, JSON.stringify(currentValues)).catch(() => {});
      } else {
        // If user cleared out all meaningful fields, remove the saved draft
        AsyncStorage.removeItem(storageKey).catch(() => {});
      }
    }, 800);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [currentValues, storageKey]);

  const clearDraft = useCallback(() => {
    AsyncStorage.removeItem(storageKey).catch(() => {});
    AsyncStorage.removeItem(legacyStorageKey).catch(() => {});
    setIsDraftRestored(false);
  }, [storageKey, legacyStorageKey]);

  const hasDraft = useCallback(async () => {
    const raw = await AsyncStorage.getItem(storageKey);
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw);
      return isMeaningfulDraft(parsed);
    } catch {
      return false;
    }
  }, [storageKey]);

  return { clearDraft, hasDraft, isDraftRestored, setIsDraftRestored };
}
