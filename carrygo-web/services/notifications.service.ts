/**
 * Notifications service (web) — ports the fetch/mark surface + `getDeepLinkRoute`
 * from `CarryGo/services/notifications.service.ts`, adapted for the web routes.
 *
 * Push-notification registration (`registerForPushNotifications`, `savePushToken`)
 * is intentionally omitted — those are Expo-only. Web uses the in-tab realtime
 * channel instead, which is wired in `contexts/NotificationProvider.tsx`.
 */

import { createClient } from '@/utils/supabase/client'

export type ServiceResult<T> = { data: T; error: null } | { data: null; error: string }

export interface AppNotification {
  id: string
  userId: string
  title: string
  body: string
  type: string
  category?: string | null
  relatedId?: string | null
  read: boolean
  readAt?: string | null
  deepLink?: string | null
  imageUrl?: string | null
  data?: Record<string, unknown> | null
  createdAt: string
}

interface NotificationRow {
  id: string
  user_id: string
  title: string
  body: string
  type: string
  category?: string | null
  related_id?: string | null
  read: boolean
  read_at?: string | null
  deep_link?: string | null
  image_url?: string | null
  data?: Record<string, unknown> | null
  created_at: string
}

function mapRow(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    body: row.body,
    type: row.type,
    category: row.category,
    relatedId: row.related_id,
    read: row.read,
    readAt: row.read_at,
    deepLink: row.deep_link,
    imageUrl: row.image_url,
    data: row.data,
    createdAt: row.created_at,
  }
}

export async function fetchNotifications(
  userId: string,
): Promise<ServiceResult<AppNotification[]>> {
  const sb = createClient()
  const { data, error } = await sb
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) return { data: null, error: error.message }
  return { data: (data ?? []).map((r) => mapRow(r as NotificationRow)), error: null }
}

export async function markNotificationRead(
  notificationId: string,
  userId: string,
): Promise<ServiceResult<null>> {
  const sb = createClient()
  const { error } = await sb
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('user_id', userId)
    .eq('read', false)
  if (error) return { data: null, error: error.message }
  return { data: null, error: null }
}

export async function markNotificationsRead(
  notificationIds: string[],
  userId: string,
): Promise<ServiceResult<null>> {
  if (notificationIds.length === 0) return { data: null, error: null }
  const sb = createClient()
  const { error } = await sb
    .from('notifications')
    .update({ read: true })
    .in('id', notificationIds)
    .eq('user_id', userId)
    .eq('read', false)
  if (error) return { data: null, error: error.message }
  return { data: null, error: null }
}

export async function markAllNotificationsRead(
  userId: string,
): Promise<ServiceResult<null>> {
  const sb = createClient()
  const { error } = await sb
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)
  if (error) return { data: null, error: error.message }
  return { data: null, error: null }
}

/**
 * Maps a notification `type` + `relatedId` to a web route. Mirrors
 * mobile's `getDeepLinkRoute` but rewrites `/(tabs)/*` mobile paths to
 * their web equivalents.
 */
export function getDeepLinkRoute(
  type: string,
  relatedId?: string | null,
  deepLink?: string | null,
): string | null {
  if (deepLink && typeof deepLink === 'string' && deepLink.startsWith('/')) {
    // Mobile legacy paths — remap to web
    if (deepLink === '/transactions' || deepLink === '/my-activity?tab=transactions') {
      return '/activity?tab=payments'
    }
    if (deepLink.startsWith('/(tabs)/requests')) return '/activity'
    if (deepLink.startsWith('/(tabs)/messages')) return '/chat'
    if (deepLink.startsWith('/(tabs)/profile')) return '/profile'
    if (deepLink.startsWith('/(tabs)')) return '/activity'
    return deepLink
  }

  const t = (type || '').toLowerCase()

  switch (t) {
    case 'new_request':
    case 'request_received':
    case 'request_accepted':
    case 'request_rejected':
    case 'request_cancelled':
      if (relatedId) return `/delivery/${relatedId}`
      return '/activity'
    case 'chat_message':
    case 'message':
      if (relatedId) return `/chat/${relatedId}`
      return '/chat'
    case 'route_match':
    case 'matching':
      return '/matching'
    case 'trip':
    case 'trip_update':
    case 'trip_milestone':
    case 'parcel':
    case 'parcel_update':
      return '/activity'
    case 'general':
    case 'delivery_otp':
    case 'delivery_pickup':
    case 'delivery_completed':
      if (relatedId) return `/delivery/${relatedId}`
      return '/activity'
    case 'payment':
    case 'payment_locked':
    case 'payment_released':
    case 'payment_refunded':
      return '/activity?tab=payments'
    case 'rating':
      return '/profile'
    case 'broadcast':
    case 'promotion':
    case 'system_alert':
      return '/'
    default:
      if (relatedId) return `/delivery/${relatedId}`
      return null
  }
}

export interface UserNotificationPreferences {
  userId: string
  enableMatches: boolean
  enableTripUpdates: boolean
  enableParcelUpdates: boolean
  enableChat: boolean
  enablePayments: boolean
  enablePromotions: boolean
  enableCityAlerts: boolean
  updatedAt?: string
}

export async function fetchNotificationPreferences(): Promise<
  ServiceResult<UserNotificationPreferences>
> {
  const sb = createClient()
  const { data, error } = await sb.rpc('get_or_create_notification_preferences')
  if (error) return { data: null, error: error.message }
  if (!data) return { data: null, error: 'No preferences found' }
  const row = data as {
    user_id: string
    enable_matches: boolean
    enable_trip_updates: boolean
    enable_parcel_updates: boolean
    enable_chat: boolean
    enable_payments: boolean
    enable_promotions: boolean
    enable_city_alerts: boolean
    updated_at: string
  }
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
  }
}

export async function updateNotificationPreferences(
  prefs: Partial<UserNotificationPreferences>,
): Promise<{ error: string | null }> {
  const sb = createClient()
  const { error } = await sb.rpc('upsert_user_notification_preferences', {
    p_enable_matches: prefs.enableMatches ?? true,
    p_enable_trip_updates: prefs.enableTripUpdates ?? true,
    p_enable_parcel_updates: prefs.enableParcelUpdates ?? true,
    p_enable_chat: prefs.enableChat ?? true,
    p_enable_payments: prefs.enablePayments ?? true,
    p_enable_promotions: prefs.enablePromotions ?? true,
    p_enable_city_alerts: prefs.enableCityAlerts ?? true,
  })
  return { error: error?.message || null }
}

export function formatRelativeTime(isoString?: string | null): string {
  if (!isoString) return ''
  const diffMs = Date.now() - new Date(isoString).getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDays = Math.floor(diffHr / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(isoString).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}
