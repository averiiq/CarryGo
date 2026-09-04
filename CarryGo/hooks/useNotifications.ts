import { useEffect, useCallback, useRef, useMemo } from 'react';
import { AppState } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { getSupabaseClient } from '@/template';
import { AppNotification } from '@/types';
import { captureException } from '@/lib/monitoring';
import {
  fetchNotifications,
  getDeepLinkRoute,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationsRead,
  registerForPushNotifications,
  savePushToken,
} from '@/services/notifications.service';
import { useAuth } from './useAuth';
import type { Href } from 'expo-router';

type NotificationPayload = Record<string, unknown> | undefined;

function normalizeNotificationPayload(data: NotificationPayload): { type: string | null; relatedId?: string } {
  if (!data) return { type: null };

  const rawType = data.type ?? data.notification_type;
  const rawRelatedId =
    data.relatedId
    ?? data.related_id
    ?? data.requestId
    ?? data.request_id
    ?? data.deliveryId
    ?? data.delivery_id
    ?? data.conversationId
    ?? data.conversation_id;

  return {
    type: typeof rawType === 'string' ? rawType : null,
    relatedId: typeof rawRelatedId === 'string' ? rawRelatedId : undefined,
  };
}

export function useNotifications() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const notifListenerRef = useRef<Notifications.Subscription | null>(null);
  const responseListenerRef = useRef<Notifications.Subscription | null>(null);
  const lastHandledResponseRef = useRef<string | null>(null);

  const { data: notifications = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await fetchNotifications(user.id);
      return data ?? [];
    },
    enabled: !!user,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.read).length,
    [notifications]
  );

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleNotificationRoute = useCallback((data: NotificationPayload) => {
    const { type, relatedId } = normalizeNotificationPayload(data);
    if (!type) return;

    const route = getDeepLinkRoute(type, relatedId);
    if (!route) return;
    setTimeout(() => router.push(route as Href), 400);
  }, [router]);

  const markOneRead = useCallback(async (notification: AppNotification) => {
    if (!user || notification.read) return;

    const { error } = await markNotificationRead(notification.id, user.id);
    if (!error) {
      queryClient.setQueryData<AppNotification[]>(
        ['notifications', user.id],
        (prev) => prev?.map(n => (n.id === notification.id ? { ...n, read: true } : n)) ?? []
      );
    }
  }, [queryClient, user]);

  const markManyRead = useCallback(async (groupItems: AppNotification[]) => {
    if (!user) return;

    const unreadIds = groupItems.filter((notification) => !notification.read).map((notification) => notification.id);
    if (unreadIds.length === 0) return;

    const { error } = await markNotificationsRead(unreadIds, user.id);
    if (!error) {
      const unreadIdSet = new Set(unreadIds);
      queryClient.setQueryData<AppNotification[]>(
        ['notifications', user.id],
        (prev) => prev?.map(n => (unreadIdSet.has(n.id) ? { ...n, read: true } : n)) ?? []
      );
    }
  }, [queryClient, user]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    (async () => {
      try {
        const token = await registerForPushNotifications();
        if (mounted && token) await savePushToken(user.id, token);
      } catch (err) {
        captureException(err, { context: 'useNotifications.registerPush' });
      }
    })();
    return () => { mounted = false; };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const sb = getSupabaseClient();
    const realtimeChannel = sb
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => { void queryClient.invalidateQueries({ queryKey: ['notifications', user.id] }); }
      )
      .subscribe();

    notifListenerRef.current = Notifications.addNotificationReceivedListener(() => {
      void queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
    });

    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener(response => {
      const responseId = response.notification.request.identifier;
      if (lastHandledResponseRef.current === responseId) return;
      lastHandledResponseRef.current = responseId;
      handleNotificationRoute(response.notification.request.content.data as Record<string, unknown>);
    });

    let channelMounted = true;
    void Notifications.getLastNotificationResponseAsync().then(response => {
      if (!channelMounted || !response) return;
      const responseId = response.notification.request.identifier;
      if (lastHandledResponseRef.current === responseId) return;
      lastHandledResponseRef.current = responseId;
      handleNotificationRoute(response.notification.request.content.data as Record<string, unknown>);
    });

    const appStateSubscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        void queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
      }
    });

    return () => {
      channelMounted = false;
      appStateSubscription.remove();
      notifListenerRef.current?.remove();
      responseListenerRef.current?.remove();
      void sb.removeChannel(realtimeChannel);
    };
  }, [handleNotificationRoute, queryClient, user]);

  const markAllRead = async () => {
    if (!user) return;
    await markAllNotificationsRead(user.id);
    queryClient.setQueryData<AppNotification[]>(
      ['notifications', user.id],
      (prev) => prev?.map(n => ({ ...n, read: true })) ?? []
    );
  };

  const markNotificationAsRead = async (notification: AppNotification) => {
    await markOneRead(notification);
  };

  const markNotificationsAsRead = async (groupItems: AppNotification[]) => {
    await markManyRead(groupItems);
  };

  const openNotification = async (notification: AppNotification) => {
    await markOneRead(notification);
    handleNotificationRoute({ type: notification.type, relatedId: notification.relatedId });
  };

  return {
    notifications,
    unreadCount,
    loading,
    refresh,
    markAllRead,
    markNotificationAsRead,
    markNotificationsAsRead,
    openNotification,
  };
}
