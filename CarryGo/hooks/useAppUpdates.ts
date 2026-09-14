import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  checkForAppUpdate,
  fetchAppUpdate,
  reloadAppToApplyUpdate,
  getAppVersionInfo,
  AppVersionInfo,
} from '@/services/updates.service';

const CHECK_INTERVAL_MS = 1000 * 60 * 15; // 15 minutes minimum between checks

export function useAppUpdates() {
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUpdateReady, setIsUpdateReady] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [versionInfo] = useState<AppVersionInfo>(getAppVersionInfo);

  const lastCheckedRef = useRef<number>(0);

  const checkAndUpdate = useCallback(async (isManual = false) => {
    const now = Date.now();
    // Prevent excessive checks unless manually triggered
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
        if (isManual) {
          setStatusMessage(checkResult.error ? checkResult.error : 'You are on the latest version.');
        }
        setIsChecking(false);
        return;
      }

      // Update is available: Download in background
      setIsDownloading(true);
      if (isManual) {
        setStatusMessage('Downloading new update...');
      }

      const fetchResult = await fetchAppUpdate();
      setIsDownloading(false);

      if (fetchResult.success) {
        setIsUpdateReady(true);
        setStatusMessage('New update ready to apply!');
      } else if (isManual) {
        setStatusMessage(fetchResult.error || 'Failed to download update.');
      }
    } catch {
      if (isManual) {
        setStatusMessage('Unable to check for updates right now.');
      }
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Background check on mount & app foreground
  useEffect(() => {
    checkAndUpdate(false);

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        checkAndUpdate(false);
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
    lastCheckTime,
    versionInfo,
    checkForUpdate: () => checkAndUpdate(true),
    applyUpdate,
  };
}
