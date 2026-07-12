import { useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { getSupabaseClient } from '@/template';
import { AppNotification, NotificationType } from '@/types';
import { captureException } from '@/lib/monitoring';
import {
  fetchNotifications,
  getDeepLinkRoute,
  markAllNotificationsRead,
  registerForPushNotifications,
  savePushToken,
} from '@/services/notifications.service';
import { useAuth } from './useAuth';
import type { Href } from 'expo-router';

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

  const handleNotificationRoute = useCallback((data: Record<string, unknown> | undefined) => {
    if (!data?.type) return;
    const route = getDeepLinkRoute(data.type as NotificationType, data.relatedId as string | undefined);
    if (!route) return;
    setTimeout(() => router.push(route as Href), 400);
  }, [router]);

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
      .channel(`realtime:notifications:${user.id}`)
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

    return () => {
      channelMounted = false;
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

  return { notifications, unreadCount, loading, refresh, markAllRead };
}
