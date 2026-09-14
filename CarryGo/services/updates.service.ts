import * as Updates from 'expo-updates';
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
    isUpdatesEnabled: Updates.isEnabled,
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
  if (!Updates.isEnabled) {
    return { isAvailable: false, error: 'Updates disabled in current build' };
  }

  try {
    const checkResult = await Updates.checkForUpdateAsync();
    if (checkResult.isAvailable) {
      return { isAvailable: true, manifest: checkResult.manifest };
    }
    return { isAvailable: false };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to check for updates';
    captureException(err, { source: 'checkForAppUpdate' });
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
  if (!Updates.isEnabled) {
    return { success: false, error: 'Updates disabled in current build' };
  }

  try {
    const fetchResult = await Updates.fetchUpdateAsync();
    if (fetchResult.isNew) {
      return { success: true, manifest: fetchResult.manifest };
    }
    return { success: false, error: 'Fetched update was not marked as new' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to download update';
    captureException(err, { source: 'fetchAppUpdate' });
    return { success: false, error: message };
  }
}

/**
 * Reloads the app to apply the newly downloaded OTA bundle.
 */
export async function reloadAppToApplyUpdate(): Promise<void> {
  if (!Updates.isEnabled) return;

  try {
    await Updates.reloadAsync();
  } catch (err) {
    captureException(err, { source: 'reloadAppToApplyUpdate' });
  }
}
