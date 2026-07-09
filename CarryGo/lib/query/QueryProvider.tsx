import React, { ReactNode, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { AppState, Platform } from 'react-native';
import { focusManager, onlineManager, QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './queryClient';

function useReactQueryPlatformManagers() {
  useEffect(() => {
    const unsubscribe = onlineManager.setEventListener(setOnline => {
      return NetInfo.addEventListener(state => {
        setOnline(state.isConnected !== false && state.isInternetReachable !== false);
      });
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = AppState.addEventListener('change', status => {
      focusManager.setFocused(status === 'active');
    });

    return () => subscription.remove();
  }, []);
}

export function AppQueryProvider({ children }: { children: ReactNode }) {
  useReactQueryPlatformManagers();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
