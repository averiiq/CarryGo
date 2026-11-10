/**
 * Push Notification Service
 * Manages device registration, device unicity, Expo Push API dispatch, and Android channels.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { getSupabaseClient } from '@/template';
import { captureException } from '@/lib/monitoring';
import { ChannelResult, NotificationCategory, NotificationPriority, PushDispatchOptions } from './types';

export const EAS_PROJECT_ID =
  Constants.expoConfig?.extra?.eas?.projectId ??
  Constants.easConfig?.projectId ??
  '85ee60ab-6a6a-4f2e-9688-9fbd4dabca3b';

export class PushNotificationService {
  private channelsConfigured = false;

  /**
   * Initializes high-priority Android notification channels.
   */
  async setupChannels(): Promise<void> {
    if (Platform.OS !== 'android' || this.channelsConfigured) return;
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'General Updates',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#004AAD',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      });
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Chat & Messages',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 200, 200, 200],
        lightColor: '#008B48',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      });
      await Notifications.setNotificationChannelAsync('deliveries', {
        name: 'Deliveries & Requests',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 150, 150, 300],
        lightColor: '#008B48',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      });
      await Notifications.setNotificationChannelAsync('payments', {
        name: 'Payments & Bookings',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 300, 200, 300],
        lightColor: '#F59E0B',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      });
      this.channelsConfigured = true;
      console.log('[PushService] Android notification channels initialized successfully.');
    } catch (err) {
      console.warn('[PushService] Failed to set up notification channels:', err);
    }
  }

  /**
   * Registers a push token for a user, guaranteeing single-user device ownership.
   * Strips this token from any previously logged-in users on this physical device.
   */
  async registerPushToken(userId: string, token: string): Promise<boolean> {
    if (!userId || !token) return false;

    const trimmedToken = token.trim();
    if (!trimmedToken) return false;

    try {
      const sb = getSupabaseClient();
      const deviceKey = `${Platform.OS}:fcm:${trimmedToken}`;

      // Use SECURITY DEFINER RPC which atomically:
      // 1. Invalidates this token from ALL other users (cross-user cleanup)
      // 2. Clears push_token from other user_profiles
      // 3. Upserts the device row for the authenticated user
      // 4. Updates user_profiles.push_token for the authenticated user
      //
      // CRITICAL: Do NOT use direct table operations for cross-user cleanup.
      // Direct client queries go through RLS which only allows updating own rows,
      // causing other users' stale tokens to persist and leak push notifications.
      const { error: rpcErr } = await sb.rpc('upsert_user_device', {
        p_device_key: deviceKey,
        p_expo_push_token: trimmedToken,
        p_platform: Platform.OS,
        p_app_version: Application.nativeApplicationVersion || undefined,
      });

      if (rpcErr) {
        console.warn('[PushService] upsert_user_device RPC failed:', rpcErr.message);
        captureException(new Error(rpcErr.message), { context: 'PushService.registerPushToken.rpc' });
        return false;
      }

      console.log('[PushService] Push token registered cleanly for user:', userId);
      return true;
    } catch (err) {
      console.warn('[PushService] Error registering push token:', err);
      captureException(err, { context: 'PushService.registerPushToken' });
      return false;
    }
  }

  /**
   * Unregisters the current device token when the user logs out.
   */
  async unregisterPushToken(userId: string): Promise<void> {
    if (!userId) return;
    try {
      const sb = getSupabaseClient();
      let currentToken: string | null = null;
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID }).catch(() => null);
        currentToken = tokenData?.data || null;
      } catch {
        // Fallback if token lookup fails
      }

      if (currentToken) {
        await sb
          .from('user_devices')
          .update({ invalidated_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('expo_push_token', currentToken);

        await sb
          .from('user_profiles')
          .update({ push_token: null })
          .eq('id', userId)
          .eq('push_token', currentToken);
      } else {
        await sb
          .from('user_devices')
          .update({ invalidated_at: new Date().toISOString() })
          .eq('user_id', userId);

        await sb.from('user_profiles').update({ push_token: null }).eq('id', userId);
      }

      console.log('[PushService] Device tokens deactivated on sign-out for user:', userId);
    } catch (err) {
      console.warn('[PushService] Error during token unregistration:', err);
    }
  }

  /**
   * Fetches active, valid push tokens for a specific recipient.
   */
  async getRecipientPushTokens(recipientId: string): Promise<string[]> {
    if (!recipientId) return [];

    try {
      const sb = getSupabaseClient();

      // 1. Try get_user_push_tokens RPC first
      const { data: rpcTokens, error: rpcErr } = await sb.rpc('get_user_push_tokens', {
        p_user_id: recipientId,
      });

      if (!rpcErr && rpcTokens) {
        let tokens: string[] = [];
        if (Array.isArray(rpcTokens)) {
          tokens = (rpcTokens as string[]).filter(Boolean);
        } else if (typeof rpcTokens === 'string' && (rpcTokens as string).startsWith('{')) {
          tokens = (rpcTokens as string).slice(1, -1).split(',').filter(Boolean);
        }
        if (tokens.length > 0) return Array.from(new Set(tokens));
      }

      // 2. Query user_devices directly
      const { data: devices } = await sb
        .from('user_devices')
        .select('expo_push_token')
        .eq('user_id', recipientId)
        .is('invalidated_at', null);

      const deviceTokens = (devices || [])
        .map((d) => d.expo_push_token)
        .filter((t): t is string => typeof t === 'string' && t.trim().length > 0);

      if (deviceTokens.length > 0) return Array.from(new Set(deviceTokens));

      // 3. Fallback: query user_profiles directly
      const { data: profile } = await sb
        .from('user_profiles')
        .select('push_token')
        .eq('id', recipientId)
        .maybeSingle();

      if (profile?.push_token) {
        return [profile.push_token];
      }

      return [];
    } catch (err) {
      console.warn('[PushService] getRecipientPushTokens error:', err);
      return [];
    }
  }

  /**
   * Sends a remote push notification strictly to the recipient's devices via Expo Push API.
   */
  async sendPush(params: {
    recipientId: string;
    title: string;
    body: string;
    type?: string;
    category?: NotificationCategory;
    priority?: NotificationPriority;
    relatedId?: string;
    deepLink?: string;
    data?: Record<string, unknown>;
    tokens?: string[];
    options?: PushDispatchOptions;
  }): Promise<ChannelResult> {
    const { recipientId, title, body, type, category, priority, relatedId, deepLink, data, options } = params;

    if (!recipientId) {
      return { success: false, error: 'Recipient ID required for push' };
    }

    // Resolve push tokens for this user
    let tokens = params.tokens && params.tokens.length > 0
      ? params.tokens
      : await this.getRecipientPushTokens(recipientId);

    // Filter valid Expo push tokens
    tokens = tokens.filter(
      (token) =>
        typeof token === 'string' &&
        (token.startsWith('ExponentPushToken[') ||
          token.startsWith('ExpoPushToken[') ||
          /^[a-zA-Z0-9_-]{22,64}$/.test(token))
    );

    if (tokens.length === 0) {
      return { success: true, skipped: true, reason: 'No active push tokens found for recipient' };
    }

    const channelId =
      options?.channelId ||
      (type === 'chat_message'
        ? 'messages'
        : category === 'payment' || type?.startsWith('payment')
          ? 'payments'
          : category === 'parcel_update' || category === 'trip_update' || type?.startsWith('delivery') || type?.startsWith('request')
            ? 'deliveries'
            : 'default');

    const isUrgent = priority === 'critical' || priority === 'high' || channelId === 'messages' || channelId === 'deliveries';

    const messages = tokens.map((token) => ({
      to: token,
      title: title.trim(),
      body: body.trim(),
      sound: options?.sound ?? 'default',
      priority: isUrgent ? ('high' as const) : ('default' as const),
      channelId,
      badge: options?.badge ?? 1,
      data: {
        recipientId,
        type: type || 'general',
        category: category || 'general',
        priority: priority || 'normal',
        relatedId: relatedId || null,
        deepLink: deepLink || null,
        ...(data || {}),
      },
    }));

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const responseJson = await response.json().catch(() => ({}));
      const tickets = responseJson?.data || [];
      const errorCount = tickets.filter((t: any) => t.status === 'error').length;

      console.log(`[PushService] Dispatched ${messages.length} push notification(s) to user ${recipientId}. Errors: ${errorCount}`);

      return {
        success: true,
        ticketCount: messages.length,
      };
    } catch (err) {
      console.warn('[PushService] Expo Push API dispatch error:', err);
      captureException(err, { context: 'PushService.sendPush' });
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Fires a rich local OS notification on the device with custom sound and channel.
   * Callers must only invoke this when verifying that target user is the currently logged-in user!
   */
  async sendLocalNotification(
    title: string,
    body: string,
    data?: Record<string, string>,
    channelId: 'default' | 'messages' | 'deliveries' | 'payments' = 'default'
  ): Promise<void> {
    await this.setupChannels();
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          data: data || {},
        },
        trigger: {
          channelId,
        },
      });
    } catch (err) {
      console.warn('[PushService] sendLocalNotification error:', err);
    }
  }
}

export const pushNotificationService = new PushNotificationService();

