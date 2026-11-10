import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import {
  checkForAppUpdate,
  fetchAppUpdate,
  reloadAppToApplyUpdate,
  getAppVersionInfo,
  AppVersionInfo,
  PENDING_UPDATE_KEY,
} from '@/services/updates.service';

const CHECK_INTERVAL_MS = 1000 * 60 * 15; // 15 minutes minimum between background checks

export function useAppUpdates() {
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUpdateReady, setIsUpdateReady] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [versionInfo, setVersionInfo] = useState<AppVersionInfo>(getAppVersionInfo);

  const lastCheckedRef = useRef<number>(0);
  const isUpdateReadyRef = useRef<boolean>(false);

  useEffect(() => {
    isUpdateReadyRef.current = isUpdateReady;
  }, [isUpdateReady]);

  useEffect(() => {
    AsyncStorage.getItem(PENDING_UPDATE_KEY)
      .then((saved) => {
        if (saved && !Updates.isEmbeddedLaunch) {
          setVersionInfo((prev) => ({
            ...prev,
            version: saved,
            displayVersion: saved.startsWith('v') ? saved : `v${saved}`,
          }));
        }
      })
      .catch(() => {});
  }, []);

  const checkAndUpdate = useCallback(async (isManual = false) => {
    const now = Date.now();
    // Prevent excessive automated checks unless manually triggered
    if (!isManual && now - lastCheckedRef.current < CHECK_INTERVAL_MS) {
      return;
    }

    lastCheckedRef.current = now;
    setIsChecking(true);
    setStatusMessage(null);

    try {
      const checkResult = await checkForAppUpdate();
      setLastCheckTime(new Date());

      if (!checkResult.isAvailable) {
        const err = checkResult.error;
        if (isManual) {
          setStatusMessage(err ? err : 'You are on the latest version.');
        }
        setIsChecking(false);
        return { isAvailable: false, isReady: false, error: err };
      }

      const msg =
        (checkResult.manifest as any)?.message ||
        (checkResult.manifest as any)?.metadata?.message ||
        (checkResult.manifest as any)?.extra?.expoClient?.extra?.eas?.updateMessage ||
        null;
      if (msg) {
        setUpdateMessage(msg);
      }

      // Update is available: Download completely silently in the background
      setIsDownloading(true);
      if (isManual) {
        setStatusMessage('Downloading new update in background...');
      }

      const fetchResult = await fetchAppUpdate();
      setIsDownloading(false);

      if (fetchResult.success) {
        setIsUpdateReady(true);
        isUpdateReadyRef.current = true;
        setStatusMessage('Latest version downloaded • Applies seamlessly');

        const fetchMsg =
          (fetchResult.manifest as any)?.message ||
          (fetchResult.manifest as any)?.metadata?.message ||
          (fetchResult.manifest as any)?.extra?.expoClient?.extra?.eas?.updateMessage ||
          null;
        if (fetchMsg) {
          setUpdateMessage(fetchMsg);
        }

        // Dynamically reflect the newly downloaded version
        const newManifestVersion =
          (fetchResult.manifest as any)?.extra?.expoClient?.version ||
          (fetchResult.manifest as any)?.metadata?.version ||
          (fetchResult.manifest?.id ? `1.2.2 (OTA-${fetchResult.manifest.id.slice(0, 6)})` : null);
        if (newManifestVersion) {
          setVersionInfo((prev) => ({
            ...prev,
            version: newManifestVersion,
            displayVersion: newManifestVersion.startsWith('v') ? newManifestVersion : `v${newManifestVersion}`,
          }));
        }
        return { isAvailable: true, isReady: true };
      } else {
        const err = fetchResult.error || 'Failed to download update.';
        if (isManual) {
          setStatusMessage(err);
        }
        return { isAvailable: true, isReady: false, error: err };
      }
    } catch (err: any) {
      const message = err?.message || 'Unable to check for updates right now.';
      if (isManual) {
        setStatusMessage(message);
      }
      return { isAvailable: false, isReady: false, error: message };
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Background check on mount & app foreground, plus silent reload when backgrounded
  useEffect(() => {
    void checkAndUpdate(false);

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        void checkAndUpdate(false);
      } else if (nextState === 'background' || nextState === 'inactive') {
        // When user moves away from the app, silently reload if an update is ready
        // so the new bundle is active when they reopen
        if (isUpdateReadyRef.current) {
          void reloadAppToApplyUpdate();
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [checkAndUpdate]);

  const applyUpdate = useCallback(async () => {
    await reloadAppToApplyUpdate();
  }, []);

  return {
    isChecking,
    isDownloading,
    isUpdateReady,
    statusMessage,
    updateMessage,
    lastCheckTime,
    versionInfo,
    checkForUpdate: () => checkAndUpdate(true),
    applyUpdate,
  };
}
