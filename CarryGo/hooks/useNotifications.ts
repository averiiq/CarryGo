import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { getSupabaseClient } from '@/template';
import { AppNotification, NotificationType } from '@/types';
import {
  fetchNotifications,
  getDeepLinkRoute,
  markAllNotificationsRead,
  registerForPushNotifications,
  savePushToken,
} from '@/services/notifications.service';
import { useAuth } from './useAuth';

export function useNotifications() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const notifListenerRef = useRef<Notifications.Subscription | null>(null);
  const responseListenerRef = useRef<Notifications.Subscription | null>(null);
  const lastHandledResponseRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await fetchNotifications(user.id);
    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(notification => !notification.read).length);
    }
    setLoading(false);
  }, [user]);

  const handleNotificationRoute = useCallback((data: Record<string, unknown> | undefined) => {
    if (!data?.type) return;
    const route = getDeepLinkRoute(data.type as NotificationType, data.relatedId as string | undefined);
    if (!route) return;
    setTimeout(() => router.push(route as any), 400);
  }, [router]);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const token = await registerForPushNotifications();
      if (token) await savePushToken(user.id, token);
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    void refresh();
    const sb = getSupabaseClient();
    const realtimeChannel = sb
      .channel(`realtime:notifications:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => { void refresh(); }
      )
      .subscribe();

    notifListenerRef.current = Notifications.addNotificationReceivedListener(() => {
      void refresh();
    });

    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener(response => {
      const responseId = response.notification.request.identifier;
      if (lastHandledResponseRef.current === responseId) return;
      lastHandledResponseRef.current = responseId;
      handleNotificationRoute(response.notification.request.content.data as Record<string, unknown>);
    });

    void Notifications.getLastNotificationResponseAsync().then(response => {
      if (!response) return;
      const responseId = response.notification.request.identifier;
      if (lastHandledResponseRef.current === responseId) return;
      lastHandledResponseRef.current = responseId;
      handleNotificationRoute(response.notification.request.content.data as Record<string, unknown>);
    });

    return () => {
      notifListenerRef.current?.remove();
      responseListenerRef.current?.remove();
      void sb.removeChannel(realtimeChannel);
    };
  }, [handleNotificationRoute, refresh, user]);

  const markAllRead = async () => {
    if (!user) return;
    await markAllNotificationsRead(user.id);
    setNotifications(prev => prev.map(notification => ({ ...notification, read: true })));
    setUnreadCount(0);
  };

  return { notifications, unreadCount, loading, refresh, markAllRead };
}
