import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { AppNotification } from '@/types';

export interface InAppBannerData {
  id: string;
  title: string;
  body: string;
  type?: string;
  category?: string;
  relatedId?: string;
  deepLink?: string | null;
  createdAt?: string;
}

interface NotificationContextValue {
  banner: InAppBannerData | null;
  showBanner: (banner: Omit<InAppBannerData, 'id'>) => void;
  dismissBanner: () => void;
  activeChatId: string | null;
  setActiveChatId: (conversationId: string | null) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [banner, setBanner] = useState<InAppBannerData | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissBanner = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    setBanner(null);
  }, []);

  const showBanner = useCallback((data: Omit<InAppBannerData, 'id'>) => {
    // If the banner is for a chat message and user is already active in that conversation, suppress it
    if (data.type === 'chat_message' && data.relatedId && activeChatId === data.relatedId) {
      return;
    }

    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
    }

    const newBanner: InAppBannerData = {
      ...data,
      id: `banner_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };

    setBanner(newBanner);

    // Auto dismiss after 4 seconds
    dismissTimerRef.current = setTimeout(() => {
      setBanner(null);
      dismissTimerRef.current = null;
    }, 4500);
  }, [activeChatId]);

  return (
    <NotificationContext.Provider
      value={{
        banner,
        showBanner,
        dismissBanner,
        activeChatId,
        setActiveChatId,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useOptionalNotificationContext(): NotificationContextValue | null {
  return useContext(NotificationContext);
}

export function useNotificationContext(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return ctx;
}
