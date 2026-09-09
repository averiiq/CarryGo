import { useSyncExternalStore } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

let currentOnlineState = true;
const listeners = new Set<() => void>();
let unsubscribeNetInfo: (() => void) | null = null;

function notifyListeners(online: boolean) {
  if (currentOnlineState === online) return;
  currentOnlineState = online;
  listeners.forEach(fn => fn());
}

function ensureSubscribed() {
  if (unsubscribeNetInfo) return;
  unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
    const isOnline = state.isConnected !== false && state.isInternetReachable !== false;
    notifyListeners(isOnline);
  });
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  ensureSubscribed();
  return () => {
    listeners.delete(callback);
    if (listeners.size === 0 && unsubscribeNetInfo) {
      unsubscribeNetInfo();
      unsubscribeNetInfo = null;
    }
  };
}

function getSnapshot() {
  return currentOnlineState;
}

function getServerSnapshot() {
  return true;
}

export function useNetworkStatus() {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { isOnline };
}
