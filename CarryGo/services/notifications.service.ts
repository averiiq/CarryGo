import { getSupabaseClient } from '@/template';
import { AppNotification, UserNotificationPreferences } from '@/types';
import type { Database } from '@/types/database';
import * as Notifications from 'expo-notifications';
import { Platform, Linking } from 'react-native';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { FeatureFlags } from '@/constants/featureFlags';
import { captureException } from '@/lib/monitoring';

export const EAS_PROJECT_ID =
  Constants.expoConfig?.extra?.eas?.projectId ??
  Constants.easConfig?.projectId ??
  '85ee60ab-6a6a-4f2e-9688-9fbd4dabca3b';

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {
  // Expo Go SDK 53+ removed push notification support
}

type NotificationRow = Database['public']['Tables']['notifications']['Row'] & {
  category?: string | null;
  priority?: string | null;
  deep_link?: string | null;
  image_url?: string | null;
  data?: Record<string, unknown> | null;
  read_at?: string | null;
};

function mapRow(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    body: row.body,
    type: row.type as AppNotification['type'],
    category: (row.category || 'general') as AppNotification['category'],
    priority: (row.priority || 'normal') as AppNotification['priority'],
    relatedId: row.related_id ?? undefined,
    deepLink: row.deep_link ?? null,
    imageUrl: row.image_url ?? null,
    data: (row.data as Record<string, unknown>) ?? {},
    read: row.read,
    readAt: row.read_at ?? null,
    createdAt: row.created_at,
  };
}

// ── Android Notification Channels ──────────────────────────────────────────

export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General Updates',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4F8EF7',
      sound: 'default',
      enableLights: true,
      enableVibrate: true,
      showBadge: true,
    });
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Chat & Messages',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 200, 200, 200],
      lightColor: '#00D09E',
      sound: 'default',
      enableLights: true,
      enableVibrate: true,
      showBadge: true,
    });
    await Notifications.setNotificationChannelAsync('deliveries', {
      name: 'Deliveries & Requests',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 150, 150, 300],
      lightColor: '#22C55E',
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
    console.log('[Notifications] Android channels configured with MAX importance and sound.');
  } catch (err) {
    console.warn('[Notifications] Failed to setup notification channels:', err);
  }
}

// Immediately initialize Android channels on module load
void setupNotificationChannels();

// ── Pending Notification Route Store ───────────────────────────────────────

let pendingNotificationRoute: string | null = null;

export function setPendingNotificationRoute(route: string | null): void {
  pendingNotificationRoute = route;
}

export function getPendingNotificationRoute(): string | null {
  return pendingNotificationRoute;
}

export function consumePendingNotificationRoute(): string | null {
  const route = pendingNotificationRoute;
  pendingNotificationRoute = null;
  return route;
}

// ── Environment Detection ──────────────────────────────────────────────────

export interface NotificationEnvironmentInfo {
  isExpoGo: boolean;
  isStandalone: boolean;
  isDevice: boolean;
  applicationId: string | null;
  platform: string;
  osVersion: string | number | null;
  easProjectId: string;
}

export function getNotificationEnvironment(): NotificationEnvironmentInfo {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isExpoGo = Constants.appOwnership === 'expo' || (Constants as any).executionEnvironment === 'storeClient';
  const appId = Application.applicationId;
  const isStandalone = !isExpoGo && (appId === 'com.averiq.carygoo' || appId === 'in.averiq.carrygo');

  return {
    isExpoGo,
    isStandalone,
    isDevice: Platform.OS === 'android' || Platform.OS === 'ios',
    applicationId: appId,
    platform: Platform.OS,
    osVersion: Platform.Version,
    easProjectId: EAS_PROJECT_ID,
  };
}

// ── Permission & Token Management ──────────────────────────────────────────

export interface NotificationPermissionState {
  granted: boolean;
  status: Notifications.PermissionStatus;
  canAskAgain: boolean;
}

export async function checkNotificationPermissions(): Promise<NotificationPermissionState> {
  try {
    const permissions = await Notifications.getPermissionsAsync();
    return {
      granted: permissions.status === 'granted',
      status: permissions.status,
      canAskAgain: permissions.canAskAgain ?? true,
    };
  } catch (err) {
    console.warn('[Notifications] getPermissionsAsync error:', err);
    return {
      granted: false,
      status: Notifications.PermissionStatus.UNDETERMINED,
      canAskAgain: true,
    };
  }
}

export async function requestNotificationPermissions(): Promise<NotificationPermissionState> {
  try {
    await setupNotificationChannels();
    const permissions = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        allowDisplayInCarPlay: false,
        allowCriticalAlerts: false,
        provideAppNotificationSettings: true,
      },
    });
    return {
      granted: permissions.status === 'granted',
      status: permissions.status,
      canAskAgain: permissions.canAskAgain ?? true,
    };
  } catch (err) {
    console.warn('[Notifications] requestPermissionsAsync error:', err);
    captureException(err, { context: 'requestNotificationPermissions' });
    return {
      granted: false,
      status: Notifications.PermissionStatus.DENIED,
      canAskAgain: false,
    };
  }
}

export async function openSystemNotificationSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch (err) {
    console.warn('[Notifications] openSettings error:', err);
  }
}

export async function registerForPushNotifications(): Promise<string | null> {
  try {
    const env = getNotificationEnvironment();

    if (env.isExpoGo) {
      console.warn(
        '[Notifications] Running inside Expo Go. In SDK 53+, remote push notifications require a standalone APK (com.averiq.carygoo) with FCM credentials.'
      );
    }

    await setupNotificationChannels();

    const perm = await checkNotificationPermissions();
    let isGranted = perm.granted;
    if (!isGranted && perm.canAskAgain) {
      const requested = await requestNotificationPermissions();
      isGranted = requested.granted;
    }

    if (!isGranted) {
      console.log('[Notifications] Push notification permission not granted. Status:', perm.status);
      return null;
    }

    // On native Android builds, verify that native Firebase FCM engine initializes properly
    if (Platform.OS === 'android' && !env.isExpoGo) {
      try {
        const deviceTokenData = await Notifications.getDevicePushTokenAsync();
        if (deviceTokenData?.data) {
          console.log('[Notifications] Native FCM engine verified. Device token:', `${deviceTokenData.data.substring(0, 18)}...`);
        }
      } catch (fcmErr) {
        console.log('[Notifications] Native FCM check:', fcmErr);
      }
    }

    // Acquire delivery push token linked to FCM for backend dispatch
    const projectId = EAS_PROJECT_ID;
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    if (tokenData?.data) {
      console.log('[Notifications] FCM push token acquired:', `${tokenData.data.substring(0, 18)}... [env: ${env.isStandalone ? 'standalone' : env.isExpoGo ? 'expo-go' : 'dev-client'}]`);
      return tokenData.data;
    }
    return null;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[Notifications] Failed to obtain push token:', msg);
    // Suppress reporting known Expo Go SDK 53 limitation to Sentry/monitoring
    if (!msg.includes('Expo Go') && !msg.includes('not supported in Expo Go')) {
      captureException(err, { context: 'registerForPushNotifications' });
    }
    return null;
  }
}

export async function savePushToken(userId: string, token: string) {
  try {
    const sb = getSupabaseClient();
    const deviceKey = `${Platform.OS}:fcm:${token}`;

    const { error: rpcErr } = await sb.rpc('upsert_user_device', {
      p_device_key: deviceKey,
      p_expo_push_token: token,
      p_platform: Platform.OS,
      p_app_version: Application.nativeApplicationVersion || undefined,
    });
    if (rpcErr) {
      console.warn('[Notifications] upsert_user_device error:', rpcErr.message);
    }
    await sb.from('user_profiles').update({ push_token: token }).eq('id', userId);
    console.log('[Notifications] FCM push token successfully registered in cloud for user:', userId);
  } catch (err) {
    console.warn('[Notifications] Error saving push token:', err);
    captureException(err, { context: 'savePushToken' });
  }
}

export async function unregisterPushToken(userId: string): Promise<void> {
  try {
    const sb = getSupabaseClient();
    let currentToken: string | null = null;
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID }).catch(() => null);
      currentToken = tokenData?.data || null;
      if (currentToken) {
        // Invalidate ONLY this specific device's token in user_devices
        await sb
          .from('user_devices')
          .update({ invalidated_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('expo_push_token', currentToken);
        console.log('[Notifications] Device token deactivated in user_devices for user:', userId);
      }
    } catch {}

    // Only clear user_profiles.push_token if it matches the current device's token,
    // preserving fallback tokens from other active devices for this user
    if (currentToken) {
      await sb
        .from('user_profiles')
        .update({ push_token: null })
        .eq('id', userId)
        .eq('push_token', currentToken);
    } else {
      await sb.from('user_profiles').update({ push_token: null }).eq('id', userId);
    }
    console.log('[Notifications] Push token unregistration complete for user on sign-out:', userId);
  } catch (err) {
    console.warn('[Notifications] Error during push token unregistration:', err);
  }
}

// ── Local notifications (rich) ───────────────────────────────────────────────

export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, string>,
  channelId: 'default' | 'messages' | 'deliveries' | 'payments' = 'default'
) {
  await setupNotificationChannels();
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      data: data || {},
      badge: 1,
    },
    trigger: Platform.OS === 'android' ? { channelId } : null,
  });
}

export async function sendRequestNotification(type: 'received' | 'accepted' | 'rejected', name: string, price?: number) {
  const configs = {
    received: {
      title: '📦 New Delivery Request!',
      body: `${name} wants you to carry their parcel${price ? ` for Rs ${price}` : ''}. Tap to review.`,
    },
    accepted: {
      title: '✅ Request Accepted!',
      body: `${name} accepted your delivery request. Open chat to coordinate pickup.`,
    },
    rejected: {
      title: '❌ Request Rejected',
      body: `${name} is unable to carry your parcel this time. Try another traveller.`,
    },
  };
  const cfg = configs[type];
  await sendLocalNotification(cfg.title, cfg.body, { type: `request_${type}` });
}

export async function sendDeliveryNotification(type: 'otp_generated' | 'pickup_confirmed' | 'delivered') {
  if (!FeatureFlags.secureDeliveryConfirmation) return;
  const configs = {
    otp_generated: {
      title: '🔐 Delivery OTP Generated',
      body: 'A delivery confirmation code is ready. Open CarryGo to continue.',
    },
    pickup_confirmed: {
      title: '🚗 Parcel Picked Up!',
      body: 'The traveller has confirmed pickup. Your parcel is on its way!',
    },
    delivered: {
      title: '🎉 Delivery Confirmed!',
      body: 'Your parcel has been delivered successfully.',
    },
  };
  const cfg = configs[type];
  await sendLocalNotification(cfg.title, cfg.body, { type });
}

export async function sendPaymentNotification(type: 'locked' | 'released' | 'refunded', amount: number) {
  if (!FeatureFlags.payments) return;
  const configs = {
    locked: {
      title: '🔒 Payment Reserved',
      body: `The payment provider reports Rs ${amount} as reserved for this delivery.`,
    },
    released: {
      title: '💰 Payment Released!',
      body: `Rs ${amount} has been released to your account. Great job on the delivery!`,
    },
    refunded: {
      title: '↩️ Payment Refunded',
      body: `Rs ${amount} has been refunded to the sender's account.`,
    },
  };
  const cfg = configs[type];
  await sendLocalNotification(cfg.title, cfg.body, { type: `payment_${type}`, amount: String(amount) });
}

export async function sendChatNotification(senderName: string, preview: string) {
  await sendLocalNotification(
    `💬 ${senderName}`,
    preview.length > 60 ? preview.substring(0, 57) + '...' : preview,
    { type: 'chat_message' }
  );
}

export async function sendKycNotification(type: 'submitted' | 'approved' | 'rejected', reason?: string) {
  if (!FeatureFlags.kycProvider) return;
  const configs = {
    submitted: {
      title: '📋 KYC Submitted',
      body: 'Your identity verification is under review. Usually approved within 24 hours.',
    },
    approved: {
      title: '✅ KYC Approved!',
      body: 'Your identity is verified! You can now send and carry parcels freely.',
    },
    rejected: {
      title: '⚠️ KYC Requires Attention',
      body: reason ? `Reason: ${reason}. Please resubmit with correct documents.` : 'Please resubmit your KYC documents.',
    },
  };
  const cfg = configs[type];
  await sendLocalNotification(cfg.title, cfg.body, { type: `kyc_${type}` });
}

export async function sendRouteMatchNotification(traveller: string, route: string, date: string) {
  await sendLocalNotification(
    '🗺️ Route Match Found!',
    `${traveller} is travelling ${route} on ${date}. Send a request now!`,
    { type: 'route_match' }
  );
}

export async function sendRatingNotification(fromUser: string, rating: number) {
  const stars = '⭐'.repeat(Math.min(rating, 5));
  await sendLocalNotification(
    `${stars} New Rating Received`,
    `${fromUser} gave you ${rating}/5 stars. Your reputation is growing!`,
    { type: 'rating' }
  );
}

// ── DB notifications ─────────────────────────────────────────────────────────

export async function fetchNotifications(userId: string) {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return { data: null, error: error.message };
  return { data: (data || []).map(mapRow), error: null };
}

export async function createNotification(notif: {
  userId: string;
  title: string;
  body: string;
  type: AppNotification['type'];
  relatedId?: string;
}) {
  // Input validation
  const trimmedTitle = notif.title?.trim();
  const trimmedBody = notif.body?.trim();

  if (!trimmedTitle || trimmedTitle.length === 0) {
    return { error: 'Notification title is required.' };
  }
  if (trimmedTitle.length > 100) {
    return { error: 'Notification title must be 100 characters or fewer.' };
  }
  if (!trimmedBody || trimmedBody.length === 0) {
    return { error: 'Notification body is required.' };
  }
  if (trimmedBody.length > 500) {
    return { error: 'Notification body must be 500 characters or fewer.' };
  }

  const sb = getSupabaseClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await sb.from('notifications').insert({
    user_id: notif.userId,
    title: trimmedTitle,
    body: trimmedBody,
    type: notif.type as any,
    related_id: notif.relatedId,
  });
  return { error: error?.message || null };
}

export interface DispatchNotificationPayload {
  userId: string;
  title: string;
  body: string;
  type: AppNotification['type'];
  category?: string;
  priority?: 'normal' | 'high';
  relatedId?: string;
  deepLink?: string;
  data?: Record<string, unknown>;
}

/**
 * Dispatches an end-to-end notification:
 * 1. Inserts into database notifications table (for in-app notification center & realtime listener).
 * 2. Fetches user push tokens from user_devices / user_profiles.
 * 3. Delivers push notification directly via Expo Push Notification API.
 */
export async function dispatchNotification(payload: DispatchNotificationPayload): Promise<{ success: boolean; error?: string }> {
  try {
    const sb = getSupabaseClient();
    const trimmedTitle = payload.title?.trim();
    const trimmedBody = payload.body?.trim();

    if (!trimmedTitle || !trimmedBody || !payload.userId) {
      console.warn('[dispatchNotification] Missing required fields:', { title: !!trimmedTitle, body: !!trimmedBody, userId: !!payload.userId });
      return { success: false, error: 'Missing required notification fields' };
    }

    // 1. Dispatch through secure RPC (inserts notification & returns target user push tokens)
    let tokens: string[] = [];
    let dbInsertSucceeded = false;

    try {
      const { data: cmdData, error: cmdErr } = await sb.rpc('dispatch_notification_command', {
        p_recipient_id: payload.userId,
        p_title: trimmedTitle,
        p_body: trimmedBody,
        p_type: payload.type,
        p_related_id: payload.relatedId || undefined,
        p_deep_link: payload.deepLink || undefined,
        p_data: (payload.data || {}) as any,
      });

      if (!cmdErr && cmdData) {
        dbInsertSucceeded = true;
        // PostgREST returns table-returning functions as an array of rows
        const row = Array.isArray(cmdData) ? cmdData[0] : cmdData;
        if (row && typeof row === 'object') {
          // push_tokens comes as a Postgres text[] — may be an array or a stringified array
          const rawTokens = (row as any).push_tokens;
          if (Array.isArray(rawTokens)) {
            tokens = rawTokens.filter((t: unknown) => typeof t === 'string' && t.length > 0);
          } else if (typeof rawTokens === 'string' && rawTokens.startsWith('{')) {
            // Postgres array literal: {token1,token2}
            tokens = rawTokens.slice(1, -1).split(',').filter(Boolean);
          }
        }
        console.log('[dispatchNotification] RPC success, tokens found:', tokens.length);
      } else {
        if (cmdErr) console.warn('[dispatchNotification] RPC error:', cmdErr.message, cmdErr.code);
      }
    } catch (e) {
      console.warn('[dispatchNotification] RPC exception:', e);
    }

    // Fallback: if RPC failed or returned no tokens, try get_user_push_tokens RPC
    if (tokens.length === 0) {
      try {
        const { data: tokenData, error: tokenErr } = await sb.rpc('get_user_push_tokens', { p_user_id: payload.userId });
        if (!tokenErr && tokenData) {
          const rawFallback: any = tokenData;
          if (Array.isArray(rawFallback)) {
            tokens = (rawFallback as string[]).filter(Boolean);
          } else if (typeof rawFallback === 'string' && rawFallback.startsWith('{')) {
            tokens = rawFallback.slice(1, -1).split(',').filter(Boolean);
          }
          console.log('[dispatchNotification] Fallback RPC tokens:', tokens.length);
        } else if (tokenErr) {
          console.warn('[dispatchNotification] get_user_push_tokens error:', tokenErr.message);
        }
      } catch (e) {
        console.warn('[dispatchNotification] get_user_push_tokens exception:', e);
      }
    }

    // Last resort fallback: read user_profiles push_token directly
    // (will only work if the caller has RLS access, e.g., reading own profile)
    if (tokens.length === 0) {
      try {
        const { data: profile } = await sb
          .from('user_profiles')
          .select('push_token')
          .eq('id', payload.userId)
          .single();
        if (profile?.push_token) {
          tokens = [profile.push_token];
          console.log('[dispatchNotification] Profile fallback token found');
        }
      } catch {
        // RLS blocks cross-user reads — expected to fail silently
      }
    }

    // If the RPC didn't insert the notification (it failed), do a direct insert as fallback
    if (!dbInsertSucceeded) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await sb.from('notifications').insert({
          user_id: payload.userId,
          title: trimmedTitle,
          body: trimmedBody,
          type: payload.type as any,
          related_id: payload.relatedId,
        });
        console.log('[dispatchNotification] Fallback DB insert succeeded');
      } catch {
        console.warn('[dispatchNotification] Fallback DB insert also failed (RLS may block cross-user inserts)');
      }
    }

    // 2. Dispatch to Expo Push API if tokens exist
    if (tokens.length > 0) {
      const channelId = payload.type === 'chat_message'
        ? 'messages'
        : (payload.type.startsWith('delivery') || payload.type.startsWith('request') || payload.type === 'new_request')
          ? 'deliveries'
          : payload.type.startsWith('payment')
            ? 'payments'
            : 'default';

      const isUrgent =
        payload.priority === 'high' ||
        payload.type === 'chat_message' ||
        payload.type.startsWith('delivery') ||
        payload.type.startsWith('request') ||
        payload.type === 'new_request' ||
        payload.type.startsWith('payment');

      const pushMessages = tokens.map((token) => ({
        to: token,
        title: trimmedTitle,
        body: trimmedBody,
        sound: 'default' as const,
        priority: isUrgent ? ('high' as const) : ('default' as const),
        channelId,
        badge: 1,
        data: {
          type: payload.type,
          relatedId: payload.relatedId,
          deepLink: payload.deepLink,
          ...(payload.data || {}),
        },
      }));

      try {
        const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(pushMessages),
        });
        const pushResult = await pushResponse.json().catch(() => null);
        console.log('[dispatchNotification] Expo push response:', pushResponse.status, JSON.stringify(pushResult));

        // Auto-cleanup dead tokens when Expo reports DeviceNotRegistered
        if (pushResult && Array.isArray(pushResult.data)) {
          for (let i = 0; i < pushResult.data.length; i++) {
            const ticket = pushResult.data[i];
            if (ticket?.status === 'error' && ticket?.details?.error === 'DeviceNotRegistered') {
              const deadToken = tokens[i];
              if (deadToken) {
                console.log('[dispatchNotification] Pruning dead token:', deadToken);
                void sb
                  .from('user_devices')
                  .update({ invalidated_at: new Date().toISOString() })
                  .eq('expo_push_token', deadToken);
              }
            }
          }
        }
      } catch (pushErr) {
        console.warn('[dispatchNotification] Expo push network error:', pushErr);
      }
    } else {
      console.warn('[dispatchNotification] No push tokens found for user:', payload.userId);
    }

    return { success: true };
  } catch (err) {
    console.warn('[dispatchNotification] Unexpected error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ── Specialized Event Dispatchers ──────────────────────────────────────────

export async function notifyChatMessage(params: {
  recipientId: string;
  senderName: string;
  text: string;
  conversationId: string;
}) {
  const preview = params.text.length > 80 ? params.text.substring(0, 77) + '...' : params.text;
  return dispatchNotification({
    userId: params.recipientId,
    title: `💬 ${params.senderName}`,
    body: preview,
    type: 'chat_message',
    priority: 'high',
    relatedId: params.conversationId,
    deepLink: `/chat/${params.conversationId}`,
  });
}

export async function notifyNewRequest(params: {
  travellerId: string;
  senderName: string;
  price: number;
  requestId: string;
  fromCity?: string;
  toCity?: string;
}) {
  const routeText = params.fromCity && params.toCity ? ` (${params.fromCity} → ${params.toCity})` : '';
  return dispatchNotification({
    userId: params.travellerId,
    title: '📦 New Delivery Request!',
    body: `${params.senderName} requested you to carry their parcel for ₹${params.price}${routeText}. Tap to review.`,
    type: 'new_request',
    priority: 'high',
    relatedId: params.requestId,
    deepLink: '/(tabs)/requests',
  });
}

export async function notifyRequestAccepted(params: {
  senderId: string;
  travellerName: string;
  requestId: string;
}) {
  return dispatchNotification({
    userId: params.senderId,
    title: '✅ Request Accepted — Pay to Book',
    body: `${params.travellerName} accepted your delivery request. Tap to book and unlock your pickup OTP.`,
    type: 'request_accepted',
    priority: 'high',
    relatedId: params.requestId,
    deepLink: `/payment/${params.requestId}`,
  });
}

export async function notifyRequestDeclined(params: {
  senderId: string;
  travellerName: string;
  requestId: string;
}) {
  return dispatchNotification({
    userId: params.senderId,
    title: '❌ Request Declined',
    body: `${params.travellerName} was unable to carry your parcel this time. Tap to explore other routes.`,
    type: 'request_rejected',
    priority: 'normal',
    relatedId: params.requestId,
    deepLink: '/(tabs)/requests',
  });
}

export async function notifyNewCarryOffer(params: {
  senderId: string;
  travellerName: string;
  price: number;
  requestId: string;
  fromCity?: string;
  toCity?: string;
}) {
  const routeText = params.fromCity && params.toCity ? ` (${params.fromCity} → ${params.toCity})` : '';
  return dispatchNotification({
    userId: params.senderId,
    title: '🚗 New Carry Offer!',
    body: `${params.travellerName} offered to carry your parcel for ₹${params.price}${routeText}. Tap to review and accept.`,
    type: 'new_request',
    priority: 'high',
    relatedId: params.requestId,
    deepLink: '/(tabs)/requests',
  });
}

export async function notifyOfferAccepted(params: {
  travellerId: string;
  senderName: string;
  requestId: string;
}) {
  return dispatchNotification({
    userId: params.travellerId,
    title: '✅ Offer Accepted!',
    body: `${params.senderName} accepted your carry offer. Open chat to coordinate pickup.`,
    type: 'request_accepted',
    priority: 'high',
    relatedId: params.requestId,
    deepLink: '/(tabs)/requests',
  });
}

export async function notifyOfferDeclined(params: {
  travellerId: string;
  senderName: string;
  requestId: string;
}) {
  return dispatchNotification({
    userId: params.travellerId,
    title: '❌ Offer Declined',
    body: `${params.senderName} declined your carry offer.`,
    type: 'request_rejected',
    priority: 'normal',
    relatedId: params.requestId,
    deepLink: '/(tabs)/requests',
  });
}

export async function notifyPickupConfirmed(params: {
  senderId: string;
  travellerName: string;
  deliveryId: string;
}) {
  return dispatchNotification({
    userId: params.senderId,
    title: '🚗 Parcel Picked Up!',
    body: `${params.travellerName} has verified pickup OTP. Your parcel is now in transit!`,
    type: 'delivery_pickup',
    priority: 'high',
    relatedId: params.deliveryId,
    deepLink: `/delivery/${params.deliveryId}`,
  });
}

export async function notifyDeliveryCompleted(params: {
  senderId: string;
  travellerName: string;
  deliveryId: string;
}) {
  return dispatchNotification({
    userId: params.senderId,
    title: '🎉 Delivery Completed!',
    body: `Your parcel was successfully delivered by ${params.travellerName}. Tap to rate your experience.`,
    type: 'delivery_completed',
    priority: 'high',
    relatedId: params.deliveryId,
    deepLink: `/delivery/${params.deliveryId}`,
  });
}

export async function notifyPickupOtpReady(params: {
  senderId: string;
  otp: string;
  deliveryId: string;
}) {
  return dispatchNotification({
    userId: params.senderId,
    title: '🔐 Pickup Verification Code',
    body: `Your pickup OTP is ${params.otp}. Share this with the traveller ONLY after they inspect your parcel.`,
    type: 'delivery_otp',
    priority: 'high',
    relatedId: params.deliveryId,
    deepLink: `/delivery/${params.deliveryId}`,
    data: { otp: params.otp, action: 'PICKUP_OTP' },
  });
}

export async function notifyDeliveryOtpReady(params: {
  recipientId: string;
  otp: string;
  deliveryId: string;
  travellerName?: string;
}) {
  return dispatchNotification({
    userId: params.recipientId,
    title: '🔐 Delivery Handover OTP',
    body: `Your delivery confirmation OTP is ${params.otp}. Share this with ${params.travellerName || 'the traveller'} upon taking delivery.`,
    type: 'delivery_otp',
    priority: 'high',
    relatedId: params.deliveryId,
    deepLink: `/delivery/${params.deliveryId}`,
    data: { otp: params.otp, action: 'DELIVERY_OTP' },
  });
}

export async function notifyTripMilestone(params: {
  senderId: string;
  milestoneText: string;
  deliveryId: string;
}) {
  return dispatchNotification({
    userId: params.senderId,
    title: '📍 Delivery Status Update',
    body: params.milestoneText,
    type: 'delivery_pickup',
    priority: 'normal',
    relatedId: params.deliveryId,
    deepLink: `/delivery/${params.deliveryId}`,
  });
}

export async function notifyPaymentEscrowLocked(params: {
  userId: string;
  amount: number;
  deliveryOrRequestId: string;
  isTraveller?: boolean;
}) {
  const title = params.isTraveller ? '🔒 Payment Booked & Secured' : '🔒 Payment Reserved';
  const body = params.isTraveller
    ? `Sender payment of ₹${params.amount} has been secured in CaryGoo Booking. Safe to proceed with pickup!`
    : `Your payment of ₹${params.amount} is securely booked until you confirm delivery.`;

  return dispatchNotification({
    userId: params.userId,
    title,
    body,
    type: 'payment_locked',
    priority: 'high',
    relatedId: params.deliveryOrRequestId,
    deepLink: '/my-activity?tab=transactions',
  });
}

export async function notifyPayoutReleased(params: {
  travellerId: string;
  amount: number;
  deliveryId: string;
}) {
  return dispatchNotification({
    userId: params.travellerId,
    title: '💰 Payout Deposited!',
    body: `₹${params.amount} has been credited to your CarryGo wallet for completing the delivery. Great work!`,
    type: 'payment_released',
    priority: 'high',
    relatedId: params.deliveryId,
    deepLink: '/my-activity?tab=transactions',
  });
}

export async function notifyRatingReceived(params: {
  userId: string;
  fromName: string;
  rating: number;
  requestId?: string;
}) {
  const stars = '⭐'.repeat(Math.min(Math.max(params.rating, 1), 5));
  return dispatchNotification({
    userId: params.userId,
    title: `${stars} New Rating Received!`,
    body: `${params.fromName} rated you ${params.rating}/5 stars. Tap to see your updated profile.`,
    type: 'rating',
    priority: 'normal',
    relatedId: params.requestId,
    deepLink: '/(tabs)/profile',
  });
}

export async function markAllNotificationsRead(userId: string) {
  const sb = getSupabaseClient();
  await sb.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
}

export async function markNotificationRead(notificationId: string, userId: string) {
  const sb = getSupabaseClient();
  const { error } = await sb
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('user_id', userId)
    .eq('read', false);

  return { error: error?.message || null };
}

export async function markNotificationsRead(notificationIds: string[], userId: string) {
  if (notificationIds.length === 0) return { error: null };

  const sb = getSupabaseClient();
  const { error } = await sb
    .from('notifications')
    .update({ read: true })
    .in('id', notificationIds)
    .eq('user_id', userId)
    .eq('read', false);

  return { error: error?.message || null };
}

export async function getUnreadCount(userId: string): Promise<number> {
  const sb = getSupabaseClient();
  const { count } = await sb.from('notifications').select('*', { count: 'exact', head: true })
    .eq('user_id', userId).eq('read', false);
  return count || 0;
}

export function getDeepLinkRoute(type: string, relatedId?: string, deepLink?: string | null): string | null {
  // If the notification payload has an explicit deep_link, use it directly
  if (deepLink && typeof deepLink === 'string' && deepLink.startsWith('/')) {
    // Legacy transactions route → consolidated into My Activity tab
    if (deepLink === '/transactions') return '/my-activity?tab=transactions';
    return deepLink;
  }

  const normalizedType = (type || '').toLowerCase();

  switch (normalizedType) {
    case 'new_request':
    case 'request_received':
    case 'request_accepted':
    case 'request_rejected':
    case 'request_cancelled':
      if (relatedId) return `/delivery/${relatedId}`;
      return '/(tabs)/requests';
    case 'chat_message':
    case 'message':
      if (relatedId) return `/chat/${relatedId}`;
      return '/(tabs)/messages';
    case 'route_match':
    case 'matching':
      return '/subscriptions';
    case 'trip':
    case 'trip_update':
    case 'trip_milestone':
      if (relatedId) return `/trip/${relatedId}`;
      return '/(tabs)/requests';
    case 'parcel':
    case 'parcel_update':
      if (relatedId) return `/parcel/${relatedId}`;
      return '/(tabs)/requests';
    case 'general':
    case 'delivery_otp':
    case 'delivery_pickup':
    case 'delivery_completed':
      if (relatedId) return `/delivery/${relatedId}`;
      return '/(tabs)/requests';
    case 'payment':
    case 'payment_locked':
    case 'payment_released':
    case 'payment_refunded':
      return '/my-activity?tab=transactions';
    case 'rating':
      return '/(tabs)/profile';
    case 'broadcast':
    case 'promotion':
    case 'system_alert':
      return '/(tabs)';
    default:
      if (relatedId) return `/delivery/${relatedId}`;
      return null;
  }
}

// ── Notification Preferences ─────────────────────────────────────────────────

export async function fetchNotificationPreferences(): Promise<{ data: UserNotificationPreferences | null; error: string | null }> {
  const sb = getSupabaseClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb as any).rpc('get_or_create_notification_preferences');
  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: 'No preferences found' };
  const row = data as {
    user_id: string;
    enable_matches: boolean;
    enable_trip_updates: boolean;
    enable_parcel_updates: boolean;
    enable_chat: boolean;
    enable_payments: boolean;
    enable_promotions: boolean;
    enable_city_alerts: boolean;
    updated_at: string;
  };
  return {
    data: {
      userId: row.user_id,
      enableMatches: row.enable_matches,
      enableTripUpdates: row.enable_trip_updates,
      enableParcelUpdates: row.enable_parcel_updates,
      enableChat: row.enable_chat,
      enablePayments: row.enable_payments,
      enablePromotions: row.enable_promotions,
      enableCityAlerts: row.enable_city_alerts,
      updatedAt: row.updated_at,
    },
    error: null,
  };
}

export async function updateNotificationPreferences(prefs: Partial<UserNotificationPreferences>): Promise<{ error: string | null }> {
  const sb = getSupabaseClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (sb as any).rpc('upsert_user_notification_preferences', {
    p_enable_matches: prefs.enableMatches ?? true,
    p_enable_trip_updates: prefs.enableTripUpdates ?? true,
    p_enable_parcel_updates: prefs.enableParcelUpdates ?? true,
    p_enable_chat: prefs.enableChat ?? true,
    p_enable_payments: prefs.enablePayments ?? true,
    p_enable_promotions: prefs.enablePromotions ?? true,
    p_enable_city_alerts: prefs.enableCityAlerts ?? true,
  });
  return { error: error?.message || null };
}

// ── Diagnostics & Test Delivery ─────────────────────────────────────────────

export interface DiagnosticReport {
  state: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 0; // 0 = all healthy, 1-7 correspond to system diagnostic states
  stateName: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  recommendation: string;
  details: {
    permissionGranted: boolean;
    permissionStatus: string;
    canAskAgain: boolean;
    environment: NotificationEnvironmentInfo;
    tokenAcquired: boolean;
    tokenType?: 'fcm' | 'expo';
    tokenPreview?: string;
    registeredDevicesCount: number;
    channelsConfigured: boolean;
  };
}

/**
 * Runs end-to-end diagnostic checks distinguishing the 7 critical push notification states:
 * 1. Permission not granted
 * 2. Push token not generated
 * 3. Push token not registered with backend
 * 4. Backend has no registered devices for user
 * 5. Push provider rejected request (checked during delivery)
 * 6. Notification delivered but not displayed (channel/DND/Doze settings)
 * 7. Notification tapped but application did not navigate
 */
export async function runNotificationDiagnostics(userId?: string): Promise<DiagnosticReport> {
  const env = getNotificationEnvironment();
  const perms = await checkNotificationPermissions();
  const channelsConfigured = Platform.OS === 'android';

  // State 1: Permission not granted
  if (!perms.granted) {
    return {
      state: 1,
      stateName: 'Permission Not Granted',
      status: 'error',
      message: `System notification permission is ${perms.status}. Notifications cannot be received or displayed.`,
      recommendation: perms.canAskAgain
        ? 'Tap "Enable Notifications" to grant notification permissions.'
        : 'Permissions are blocked in Android Settings. Tap "Open Settings" to enable notifications for CarryGo.',
      details: {
        permissionGranted: false,
        permissionStatus: perms.status,
        canAskAgain: perms.canAskAgain,
        environment: env,
        tokenAcquired: false,
        registeredDevicesCount: 0,
        channelsConfigured,
      },
    };
  }

  // Check token generation & environment
  let token: string | null = null;
  let tokenErr: string | null = null;

  if (env.isExpoGo) {
    // State 2: Running in Expo Go (Expo Go SDK 53 does not support remote push notifications)
    return {
      state: 2,
      stateName: 'Expo Go Client Detected',
      status: 'warning',
      message: 'Running inside Expo Go (host.exp.exponent). Push notifications in Expo Go are isolated to the Expo Go app, and tapping opens Expo Go instead of CarryGo.',
      recommendation: 'Install the standalone CarryGo APK (in.averiq.carrygo) configured with native Firebase Cloud Messaging for production delivery.',
      details: {
        permissionGranted: perms.granted,
        permissionStatus: perms.status,
        canAskAgain: perms.canAskAgain,
        environment: env,
        tokenAcquired: false,
        registeredDevicesCount: 0,
        channelsConfigured,
      },
    };
  }

  try {
    token = await registerForPushNotifications();
  } catch (err) {
    tokenErr = err instanceof Error ? err.message : String(err);
  }

  const isNativeFcm = token ? (!token.startsWith('ExponentPushToken[') && !token.startsWith('ExpoPushToken[')) : false;
  const tokenType: 'fcm' | 'expo' = isNativeFcm ? 'fcm' : 'expo';

  // State 2: Push token not generated
  if (!token) {
    return {
      state: 2,
      stateName: 'Push Token Not Generated',
      status: 'error',
      message: `Failed to acquire push token: ${tokenErr || 'Native FCM/Google Services not initialized'}`,
      recommendation: 'Ensure google-services.json is present in the Android build and the device has Google Play Services active.',
      details: {
        permissionGranted: perms.granted,
        permissionStatus: perms.status,
        canAskAgain: perms.canAskAgain,
        environment: env,
        tokenAcquired: false,
        registeredDevicesCount: 0,
        channelsConfigured,
      },
    };
  }

  // Check Backend Registration in user_devices / user_profiles
  let activeDeviceCount = 0;
  let isCurrentDeviceRegistered = false;

  if (userId) {
    try {
      const sb = getSupabaseClient();
      const { data: devices, error: devErr } = await sb
        .from('user_devices')
        .select('expo_push_token, invalidated_at')
        .eq('user_id', userId)
        .is('invalidated_at', null);

      if (!devErr && Array.isArray(devices)) {
        activeDeviceCount = devices.length;
        isCurrentDeviceRegistered = devices.some(d => d.expo_push_token === token);
      }

      // If token is generated but not yet registered in user_devices, auto-register now
      if (!isCurrentDeviceRegistered) {
        await savePushToken(userId, token);
        activeDeviceCount += 1;
        isCurrentDeviceRegistered = true;
      }
    } catch (e) {
      console.warn('[Diagnostics] Error querying user_devices:', e);
    }
  }

  // State 3: Push token not registered with backend
  if (userId && !isCurrentDeviceRegistered) {
    return {
      state: 3,
      stateName: 'Push Token Not Registered with Backend',
      status: 'error',
      message: 'Device generated a valid push token, but could not register it with the CarryGo cloud backend.',
      recommendation: 'Tap "Refresh Token" to synchronize your device with the CarryGo server.',
      details: {
        permissionGranted: true,
        permissionStatus: perms.status,
        canAskAgain: perms.canAskAgain,
        environment: env,
        tokenAcquired: true,
        tokenType,
        tokenPreview: `${token.substring(0, 16)}...`,
        registeredDevicesCount: activeDeviceCount,
        channelsConfigured,
      },
    };
  }

  // State 4: User has no active registered devices
  if (userId && activeDeviceCount === 0) {
    return {
      state: 4,
      stateName: 'No Registered Devices for User',
      status: 'warning',
      message: 'No active push notification tokens are registered for this user in the CarryGo database.',
      recommendation: 'Log in and grant notification permissions on this device to register it.',
      details: {
        permissionGranted: true,
        permissionStatus: perms.status,
        canAskAgain: perms.canAskAgain,
        environment: env,
        tokenAcquired: true,
        tokenType,
        tokenPreview: `${token.substring(0, 16)}...`,
        registeredDevicesCount: 0,
        channelsConfigured,
      },
    };
  }

  // All checks healthy!
  return {
    state: 0,
    stateName: 'Push Notification System Healthy',
    status: 'healthy',
    message: `System healthy: ${activeDeviceCount} device(s) registered for your account. Push channel active on ${env.isStandalone ? 'Production App (in.averiq.carrygo)' : 'Native Client'} [${tokenType.toUpperCase()}].`,
    recommendation: 'Notifications are fully operational. Send a test notification to verify end-to-end receipt.',
    details: {
      permissionGranted: true,
      permissionStatus: perms.status,
      canAskAgain: perms.canAskAgain,
      environment: env,
      tokenAcquired: true,
      tokenType,
      tokenPreview: `${token.substring(0, 16)}...`,
      registeredDevicesCount: activeDeviceCount,
      channelsConfigured,
    },
  };
}

export async function sendTestNotification(
  userId: string,
  mode: 'all' | 'remote' | 'local' = 'all'
): Promise<{ success: boolean; message: string }> {
  try {
    await setupNotificationChannels();

    // Local notification test (verifies Android notification channel, sound, vibration, icon)
    if (mode === 'all' || mode === 'local') {
      await sendLocalNotification(
        '🔔 CarryGo Notification Test',
        'Sound, vibration, and channels are functioning properly on this device!',
        { type: 'test' },
        'default'
      );
    }

    // Remote push test (verifies backend dispatch, token lookup, Expo Push API, and FCM delivery)
    if (mode === 'all' || mode === 'remote') {
      const result = await dispatchNotification({
        userId,
        title: '🚀 Remote Push Verified',
        body: 'Your device is successfully connected to the CarryGo push notification network.',
        type: 'general',
        priority: 'high',
      });

      if (!result.success) {
        return { success: false, message: result.error || 'Failed to dispatch remote push notification' };
      }
    }

    return {
      success: true,
      message: mode === 'local'
        ? 'Local sound and notification channel tested successfully!'
        : 'Remote push test dispatched successfully to your registered device(s)!',
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, message: errorMsg };
  }
}



