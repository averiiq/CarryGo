import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import { captureException } from '@/lib/monitoring';

export interface UpdateStatus {
  isAvailable: boolean;
  isDownloaded: boolean;
  isChecking: boolean;
  manifest?: Updates.Manifest;
  error?: string;
}

export interface AppVersionInfo {
  updateId: string | null;
  channel: string | null;
  runtimeVersion: string | null;
  isEmbeddedLaunch: boolean;
  createdAt: Date | null;
  isUpdatesEnabled: boolean;
}

const isExpoGo =
  Constants.appOwnership === 'expo' ||
  (Constants as any).executionEnvironment === 'storeClient';

/**
 * Returns current OTA update metadata and runtime environment.
 */
export function getAppVersionInfo(): AppVersionInfo {
  return {
    updateId: Updates.updateId,
    channel: Updates.channel,
    runtimeVersion: typeof Updates.runtimeVersion === 'string' ? Updates.runtimeVersion : null,
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
    createdAt: Updates.createdAt,
    isUpdatesEnabled: Updates.isEnabled && !isExpoGo && !__DEV__,
  };
}

/**
 * Checks EAS update servers for new OTA JavaScript bundles.
 * Gracefully resolves if updates are disabled (e.g. in dev mode or Expo Go).
 */
export async function checkForAppUpdate(): Promise<{
  isAvailable: boolean;
  manifest?: Updates.Manifest;
  error?: string;
}> {
  // In Expo Go or development mode, OTA updates are not supported by Expo
  if (isExpoGo || !Updates.isEnabled || __DEV__) {
    return { isAvailable: false };
  }

  try {
    const checkResult = await Updates.checkForUpdateAsync();
    if (checkResult.isAvailable) {
      return { isAvailable: true, manifest: checkResult.manifest };
    }
    return { isAvailable: false };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to check for updates';
    if (!message.includes('not supported in Expo Go')) {
      captureException(err, { source: 'checkForAppUpdate' });
    }
    return { isAvailable: false, error: message };
  }
}

/**
 * Downloads the available update bundle in the background.
 */
export async function fetchAppUpdate(): Promise<{
  success: boolean;
  manifest?: Updates.Manifest;
  error?: string;
}> {
  if (isExpoGo || !Updates.isEnabled || __DEV__) {
    return { success: false, error: 'Updates not supported in Expo Go or dev mode' };
  }

  try {
    const fetchResult = await Updates.fetchUpdateAsync();
    if (fetchResult.isNew) {
      return { success: true, manifest: fetchResult.manifest };
    }
    return { success: false, error: 'Fetched update was not marked as new' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to download update';
    if (!message.includes('not supported in Expo Go')) {
      captureException(err, { source: 'fetchAppUpdate' });
    }
    return { success: false, error: message };
  }
}

/**
 * Reloads the app to apply the newly downloaded OTA bundle.
 */
export async function reloadAppToApplyUpdate(): Promise<void> {
  if (isExpoGo || !Updates.isEnabled || __DEV__) return;

  try {
    await Updates.reloadAsync();
  } catch (err) {
    captureException(err, { source: 'reloadAppToApplyUpdate' });
  }
}
