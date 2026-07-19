import { getSupabaseClient } from '@/template';
import { AppNotification } from '@/types';
import type { Database } from '@/types/database';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as Application from 'expo-application';
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

type NotificationRow = Database['public']['Tables']['notifications']['Row'];

function mapRow(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    body: row.body,
    type: row.type as AppNotification['type'],
    relatedId: row.related_id ?? undefined,
    read: row.read,
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

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: 'carrygo' });
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
    p_app_version: Application.nativeApplicationVersion || null,
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
      body: `${name} wants you to carry their parcel${price ? ` for ₹${price}` : ''}. Tap to review.`,
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
      body: `The payment provider reports ₹${amount} as reserved for this delivery.`,
    },
    released: {
      title: '💰 Payment Released!',
      body: `₹${amount} has been released to your account. Great job on the delivery!`,
    },
    refunded: {
      title: '↩️ Payment Refunded',
      body: `₹${amount} has been refunded to the sender's account.`,
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
  const { error } = await sb.from('notifications').insert({
    user_id: notif.userId,
    title: trimmedTitle,
    body: trimmedBody,
    type: notif.type,
    related_id: notif.relatedId,
  });
  return { error: error?.message || null };
}

export async function markAllNotificationsRead(userId: string) {
  const sb = getSupabaseClient();
  await sb.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
}

export async function getUnreadCount(userId: string): Promise<number> {
  const sb = getSupabaseClient();
  const { count } = await sb.from('notifications').select('*', { count: 'exact', head: true })
    .eq('user_id', userId).eq('read', false);
  return count || 0;
}

export function getDeepLinkRoute(type: AppNotification['type'], relatedId?: string): string | null {
  switch (type) {
    case 'new_request':
    case 'request_accepted':
    case 'request_rejected':
      return '/(tabs)/requests';
    case 'chat_message':
      if (relatedId) return `/chat/${relatedId}`;
      return '/(tabs)/messages';
    case 'route_match':
      return '/subscriptions';
    case 'general':
      if (relatedId) return `/delivery/${relatedId}`;
      return null;
    case 'delivery_otp':
      if (relatedId) return `/delivery/${relatedId}`;
      return null;
    case 'rating':
      return '/(tabs)/profile';
    default:
      return null;
  }
}
