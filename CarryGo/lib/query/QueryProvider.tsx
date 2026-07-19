import React, { ReactNode, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { AppState, Platform } from 'react-native';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient } from './queryClient';
import { asyncStoragePersister } from './persister';

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
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: asyncStoragePersister,
        maxAge: 24 * 60 * 60 * 1000,
        buster: '',
      }}
      onSuccess={() => {
        queryClient.resumePausedMutations();
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
