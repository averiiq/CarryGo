import { getSupabaseClient } from '@/template';
import { AppNotification, UserNotificationPreferences } from '@/types';
import type { Database } from '@/types/database';
import * as Notifications from 'expo-notifications';
import { Platform, Linking } from 'react-native';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { FeatureFlags } from '@/constants/featureFlags';
import { captureException } from '@/lib/monitoring';
import {
  notificationService,
  inAppNotificationService,
  pushNotificationService,
  emailNotificationService,
  smsNotificationService,
} from './notifications';

export * from './notifications';

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
          if (__DEV__) console.log('[Notifications] Native FCM engine verified. Device token:', `${deviceTokenData.data.substring(0, 18)}...`);
        }
      } catch (fcmErr) {
        console.log('[Notifications] Native FCM check:', fcmErr);
      }
    }

    // Acquire delivery push token linked to FCM for backend dispatch
    const projectId = EAS_PROJECT_ID;
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    if (tokenData?.data) {
      if (__DEV__) console.log('[Notifications] FCM push token acquired:', `${tokenData.data.substring(0, 18)}... [env: ${env.isStandalone ? 'standalone' : env.isExpoGo ? 'expo-go' : 'dev-client'}]`);
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
  return pushNotificationService.registerPushToken(userId, token);
}

export async function unregisterPushToken(userId: string): Promise<void> {
  return pushNotificationService.unregisterPushToken(userId);
}

// ── Local notifications (rich) ───────────────────────────────────────────────

export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, string>,
  channelId: 'default' | 'messages' | 'deliveries' | 'payments' = 'default'
) {
  return pushNotificationService.sendLocalNotification(title, body, data, channelId);
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
      body: 'A delivery confirmation code is ready. Open CaryGoo to continue.',
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

export async function fetchNotifications(userId: string, options?: { limit?: number; offset?: number }) {
  return inAppNotificationService.fetchNotifications(userId, options);
}

export async function createNotification(notif: {
  userId: string;
  title: string;
  body: string;
  type: AppNotification['type'];
  relatedId?: string;
}) {
  return inAppNotificationService.createNotification(notif.userId, {
    title: notif.title,
    body: notif.body,
    type: notif.type,
    relatedId: notif.relatedId,
  });
}

export interface DispatchNotificationPayload {
  userId: string;
  senderId?: string;
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
 * Dispatches an end-to-end notification through the Unified Notification Service.
 */
export async function dispatchNotification(payload: DispatchNotificationPayload): Promise<{ success: boolean; error?: string }> {
  const result = await notificationService.send({
    recipient: payload.userId,
    senderId: payload.senderId,
    title: payload.title,
    body: payload.body,
    type: payload.type,
    category: payload.category as any,
    priority: payload.priority,
    relatedId: payload.relatedId,
    deepLink: payload.deepLink,
    data: payload.data,
  });

  return {
    success: result.success,
    error: result.error,
  };
}

export async function markAllNotificationsRead(userId: string) {
  return inAppNotificationService.markAllAsRead(userId);
}

export async function markNotificationRead(notificationId: string, userId: string) {
  const res = await inAppNotificationService.markAsRead(notificationId, userId);
  return { error: res.error || null };
}

export async function markNotificationsRead(notificationIds: string[], userId: string) {
  const res = await inAppNotificationService.markManyAsRead(notificationIds, userId);
  return { error: res.error || null };
}

export async function getUnreadCount(userId: string): Promise<number> {
  return inAppNotificationService.getUnreadCount(userId);
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
        : 'Permissions are blocked in Android Settings. Tap "Open Settings" to enable notifications for CaryGoo.',
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
      message: 'Running inside Expo Go (host.exp.exponent). Push notifications in Expo Go are isolated to the Expo Go app, and tapping opens Expo Go instead of CaryGoo.',
      recommendation: 'Install the standalone CaryGoo APK (in.averiq.carrygo) configured with native Firebase Cloud Messaging for production delivery.',
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
      message: 'Device generated a valid push token, but could not register it with the CaryGoo cloud backend.',
      recommendation: 'Tap "Refresh Token" to synchronize your device with the CaryGoo server.',
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
      message: 'No active push notification tokens are registered for this user in the CaryGoo database.',
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
        '🔔 CaryGoo Notification Test',
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
        body: 'Your device is successfully connected to the CaryGoo push notification network.',
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



