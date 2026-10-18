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
import { useOptionalNotificationContext } from '@/contexts/NotificationContext';
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

const seenNotificationKeys = new Set<string>();

function shouldProcessNotification(key: string): boolean {
  if (!key) return true;
  if (seenNotificationKeys.has(key)) return false;
  seenNotificationKeys.add(key);
  setTimeout(() => seenNotificationKeys.delete(key), 8_000); // 8-second deduplication window
  return true;
}

let globalLastHandledResponseId: string | null = null;
let realtimeChannelInstance = 0;

export function useNotifications() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const notifCtx = useOptionalNotificationContext();
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

    let channelMounted = true;
    const sb = getSupabaseClient();
    const instance = ++realtimeChannelInstance;
    let realtimeChannel: ReturnType<typeof sb.channel> | null = null;

    try {
      realtimeChannel = sb
        .channel(`notifications:${user.id}:${instance}_${Date.now()}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (payload) => {
            void queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
            if (payload.eventType === 'INSERT' && payload.new) {
              const newNotif = payload.new as {
                id?: string;
                title?: string;
                body?: string;
                type?: string;
                related_id?: string;
                deep_link?: string;
              };
              if (newNotif.title && newNotif.body) {
                const dedupeKey = newNotif.id || `notif_${newNotif.type}_${newNotif.title}_${newNotif.related_id}`;
                if (shouldProcessNotification(dedupeKey)) {
                  // Show instant in-app banner toast
                  notifCtx?.showBanner({
                    title: newNotif.title,
                    body: newNotif.body,
                    type: newNotif.type,
                    relatedId: newNotif.related_id,
                    deepLink: newNotif.deep_link,
                  });
                }
              }
            }
          }
        )
        .subscribe((status) => {
          if (!channelMounted && realtimeChannel) {
            try {
              void sb.removeChannel(realtimeChannel);
            } catch {}
          }
        });
    } catch (err) {
      captureException(err, { context: 'useNotifications.realtimeSubscribe' });
    }

    notifListenerRef.current = Notifications.addNotificationReceivedListener((notification) => {
      void queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
      const content = notification.request.content;
      if (content.title && content.body) {
        const notifId = (content.data?.notificationId as string) || (content.data?.id as string) || notification.request.identifier;
        const dedupeKey = notifId || `push_${content.data?.type}_${content.title}_${content.data?.relatedId}`;
        if (shouldProcessNotification(dedupeKey)) {
          notifCtx?.showBanner({
            title: content.title,
            body: content.body,
            type: (content.data?.type as string) || 'general',
            relatedId: (content.data?.relatedId as string) || undefined,
            deepLink: (content.data?.deepLink as string) || undefined,
          });
        }
      }
    });

    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener(response => {
      const responseId = response.notification.request.identifier;
      if (lastHandledResponseRef.current === responseId || globalLastHandledResponseId === responseId) return;
      lastHandledResponseRef.current = responseId;
      globalLastHandledResponseId = responseId;
      handleNotificationRoute(response.notification.request.content.data as Record<string, unknown>);
    });

    void Notifications.getLastNotificationResponseAsync().then(response => {
      if (!channelMounted || !response) return;
      const responseId = response.notification.request.identifier;
      if (lastHandledResponseRef.current === responseId || globalLastHandledResponseId === responseId) return;
      lastHandledResponseRef.current = responseId;
      globalLastHandledResponseId = responseId;
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
      if (realtimeChannel) {
        try {
          void sb.removeChannel(realtimeChannel);
        } catch {
          // safe cleanup
        }
      }
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
