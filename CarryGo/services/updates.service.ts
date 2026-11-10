import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  version: string;
  buildNumber: string | null;
  displayVersion: string;
}

const isExpoGo =
  Constants.appOwnership === 'expo' ||
  (Constants as any).executionEnvironment === 'storeClient';

export const PENDING_UPDATE_KEY = 'carrygo_pending_ota_version';

/**
 * Returns current OTA update metadata, app version, and runtime environment.
 */
export function getAppVersionInfo(): AppVersionInfo {
  const baseVersion =
    Application.nativeApplicationVersion ||
    Constants.expoConfig?.version ||
    '1.2.2';
  const buildNumber = Application.nativeBuildVersion || '1';

  // Extract OTA update version if manifest provides one
  const manifest = Updates.manifest as any;
  const manifestVersion =
    manifest?.extra?.expoClient?.version ||
    manifest?.metadata?.version ||
    (typeof manifest?.runtimeVersion === 'string' && manifest.runtimeVersion !== 'appVersion'
      ? manifest.runtimeVersion
      : null);

  const activeVersion = manifestVersion || baseVersion;

  let displayVersion = activeVersion;
  if (!Updates.isEmbeddedLaunch && Updates.updateId) {
    // OTA update is running live
    displayVersion = `${activeVersion} (OTA-${Updates.updateId.slice(0, 6)})`;
  }

  return {
    updateId: Updates.updateId,
    channel: Updates.channel,
    runtimeVersion: typeof Updates.runtimeVersion === 'string' ? Updates.runtimeVersion : null,
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
    createdAt: Updates.createdAt,
    isUpdatesEnabled: Updates.isEnabled && !isExpoGo && !__DEV__,
    version: activeVersion,
    buildNumber,
    displayVersion,
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
  if (isExpoGo) {
    return { isAvailable: false, error: 'OTA updates are not supported in Expo Go.' };
  }
  if (__DEV__) {
    return { isAvailable: false, error: 'OTA updates are disabled in development mode (__DEV__).' };
  }
  if (!Updates.isEnabled) {
    return { isAvailable: false, error: 'OTA updates are not enabled for this build.' };
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
 * Downloads the available update bundle in the background silently.
 */
export async function fetchAppUpdate(): Promise<{
  success: boolean;
  manifest?: Updates.Manifest;
  error?: string;
}> {
  if (isExpoGo) {
    return { success: false, error: 'OTA updates are not supported in Expo Go.' };
  }
  if (__DEV__) {
    return { success: false, error: 'OTA updates are disabled in development mode (__DEV__).' };
  }
  if (!Updates.isEnabled) {
    return { success: false, error: 'OTA updates are not enabled for this build.' };
  }

  try {
    const fetchResult = await Updates.fetchUpdateAsync();
    if (fetchResult.isNew) {
      try {
        const otaVer =
          (fetchResult.manifest as any)?.extra?.expoClient?.version ||
          (fetchResult.manifest as any)?.metadata?.version ||
          fetchResult.manifest?.id ||
          'latest';
        await AsyncStorage.setItem(PENDING_UPDATE_KEY, String(otaVer));
      } catch {
        // non-blocking
      }
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
