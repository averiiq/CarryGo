import { getSupabaseClient } from '@/template';
import { AppNotification } from '@/types';
import type { Database } from '@/types/database';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { FeatureFlags } from '@/constants/featureFlags';

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

// ── Permission & Token ───────────────────────────────────────────────────────

export async function registerForPushNotifications(): Promise<string | null> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4F8EF7',
        sound: 'default',
      });
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Chat & Messages',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 200, 200, 200],
        lightColor: '#00D09E',
        sound: 'default',
      });
      await Notifications.setNotificationChannelAsync('deliveries', {
        name: 'Deliveries',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 100, 200, 300],
        lightColor: '#22C55E',
      });
      await Notifications.setNotificationChannelAsync('payments', {
        name: 'Payments',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 300, 200, 300],
        lightColor: '#F59E0B',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return null;
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;
  } catch {
    return null;
  }
}

export async function savePushToken(userId: string, token: string) {
  const sb = getSupabaseClient();
  await sb.rpc('upsert_user_device', {
    p_device_key: `${Platform.OS}:${token}`,
    p_expo_push_token: token,
    p_platform: Platform.OS,
    p_app_version: Application.nativeApplicationVersion || undefined,
  });
  await sb.from('user_profiles').update({ push_token: token }).eq('id', userId);
}

// ── Local notifications (rich) ───────────────────────────────────────────────

export async function sendLocalNotification(title: string, body: string, data?: Record<string, string>) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true, data: data || {} },
    trigger: null,
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
      body: 'A delivery confirmation code is ready. Open Hizli to continue.',
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
        : payload.type.startsWith('delivery')
          ? 'deliveries'
          : payload.type.startsWith('payment')
            ? 'payments'
            : 'default';

      const pushMessages = tokens.map((token) => ({
        to: token,
        title: trimmedTitle,
        body: trimmedBody,
        sound: 'default' as const,
        priority: (payload.priority === 'high' || payload.type === 'chat_message') ? 'high' as const : 'default' as const,
        channelId,
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
            'Accept': 'application/json',
          },
          body: JSON.stringify(pushMessages),
        });
        const pushResult = await pushResponse.json().catch(() => null);
        console.log('[dispatchNotification] Expo push response:', pushResponse.status, JSON.stringify(pushResult));
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
    title: '✅ Request Accepted!',
    body: `${params.travellerName} accepted your delivery request. Open chat to coordinate pickup.`,
    type: 'request_accepted',
    priority: 'high',
    relatedId: params.requestId,
    deepLink: '/(tabs)/requests',
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
  // If the notification record has an explicit deep_link stored (from outbox processor), use it directly
  if (deepLink) return deepLink;

  const normalizedType = type.toLowerCase();

  switch (normalizedType) {
    case 'new_request':
    case 'request_received':
    case 'request_accepted':
    case 'request_rejected':
    case 'request_cancelled':
      return '/(tabs)/requests';
    case 'chat_message':
    case 'message':
      if (relatedId) return `/chat/${relatedId}`;
      return '/(tabs)/messages';
    case 'route_match':
    case 'matching':
      return '/subscriptions';
    case 'general':
    case 'delivery_otp':
    case 'delivery_pickup':
    case 'delivery_completed':
    case 'parcel_update':
      if (relatedId) return `/delivery/${relatedId}`;
      return '/(tabs)/requests';
    case 'trip_update':
      return '/(tabs)/requests';
    case 'payment':
    case 'payment_locked':
    case 'payment_released':
    case 'payment_refunded':
      return '/transactions';
    case 'rating':
      return '/(tabs)/profile';
    case 'broadcast':
    case 'promotion':
    case 'system_alert':
      return null;
    default:
      return null;
  }
}

// ── Notification Preferences ─────────────────────────────────────────────────

import type { UserNotificationPreferences } from '@/types';

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

