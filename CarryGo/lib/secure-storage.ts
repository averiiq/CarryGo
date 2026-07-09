/**
 * Secure storage wrapper using expo-secure-store for sensitive data
 * and AsyncStorage for non-sensitive data.
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SECURE_PREFIX = 'carrygo_secure_';
const STORAGE_PREFIX = 'carrygo_';

/**
 * Store a value securely using device keychain/keystore.
 * Use for: tokens, passwords, payment data, personal identifiers.
 */
export async function secureSet(key: string, value: unknown): Promise<void> {
  const prefixedKey = `${SECURE_PREFIX}${key}`;
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  await SecureStore.setItemAsync(prefixedKey, serialized);
}

/**
 * Retrieve a securely stored value.
 * Returns null if the key does not exist.
 */
export async function secureGet<T = string>(key: string): Promise<T | null> {
  const prefixedKey = `${SECURE_PREFIX}${key}`;
  const raw = await SecureStore.getItemAsync(prefixedKey);

  if (raw === null) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as unknown as T;
  }
}

/**
 * Delete a securely stored value.
 */
export async function secureDelete(key: string): Promise<void> {
  const prefixedKey = `${SECURE_PREFIX}${key}`;
  await SecureStore.deleteItemAsync(prefixedKey);
}

/**
 * Store non-sensitive data using AsyncStorage.
 * Use for: preferences, cached UI state, feature flags.
 */
export async function storageSet(key: string, value: unknown): Promise<void> {
  const prefixedKey = `${STORAGE_PREFIX}${key}`;
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  await AsyncStorage.setItem(prefixedKey, serialized);
}

/**
 * Retrieve non-sensitive data from AsyncStorage.
 * Returns null if the key does not exist.
 */
export async function storageGet<T = string>(key: string): Promise<T | null> {
  const prefixedKey = `${STORAGE_PREFIX}${key}`;
  const raw = await AsyncStorage.getItem(prefixedKey);

  if (raw === null) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as unknown as T;
  }
}

/**
 * Delete non-sensitive data from AsyncStorage.
 */
export async function storageDelete(key: string): Promise<void> {
  const prefixedKey = `${STORAGE_PREFIX}${key}`;
  await AsyncStorage.removeItem(prefixedKey);
}

/**
 * Clear all CarryGo secure storage entries.
 * Use during logout or account deletion.
 */
export async function secureClearAll(): Promise<void> {
  const allKeys = await AsyncStorage.getAllKeys();
  const secureKeys = allKeys.filter((k) => k.startsWith(SECURE_PREFIX));

  for (const key of secureKeys) {
    const unprefixedKey = key.replace(SECURE_PREFIX, '');
    await secureDelete(unprefixedKey);
  }
}

/**
 * Clear all CarryGo non-sensitive storage entries.
 */
export async function storageClearAll(): Promise<void> {
  const allKeys = await AsyncStorage.getAllKeys();
  const appKeys = allKeys.filter(
    (k) => k.startsWith(STORAGE_PREFIX) && !k.startsWith(SECURE_PREFIX)
  );
  await AsyncStorage.multiRemove(appKeys);
}
