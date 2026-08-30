'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin, logAdminAction } from '@/utils/admin-guard'

type AppConfigUpdate = Record<string, string | number | boolean>

const ALLOWED_KEYS = new Set([
  'platform_commission_percent',
  'min_commission_amount',
  'max_commission_amount',
  'gst_percent',
  'payment_gateway',
  'auto_release_hours',
  'max_weight_kg',
  'max_price_per_kg',
  'min_price_per_kg',
  'support_email',
  'support_phone',
  'maintenance_mode',
  'new_user_signups',
  'kyc_required',
  'otp_expiry_minutes',
  'max_otp_attempts',
  'rating_threshold',
  'auto_suspend_disputes',
  'push_notifications',
  'email_notifications',
  'sms_notifications',
])

const NUMBER_RANGES: Record<string, [number, number]> = {
  platform_commission_percent: [0, 100],
  min_commission_amount: [0, 100000],
  max_commission_amount: [0, 1000000],
  gst_percent: [0, 100],
  auto_release_hours: [1, 720],
  max_weight_kg: [0.1, 10000],
  max_price_per_kg: [0, 100000],
  min_price_per_kg: [0, 100000],
  otp_expiry_minutes: [1, 60],
  max_otp_attempts: [1, 20],
  rating_threshold: [0, 5],
  auto_suspend_disputes: [0, 100],
}

const BOOLEAN_KEYS = new Set(['maintenance_mode', 'new_user_signups', 'kyc_required', 'push_notifications', 'email_notifications', 'sms_notifications'])

function isValidSetting(key: string, value: string | number | boolean): boolean {
  if (key in NUMBER_RANGES) {
    const number = Number(value)
    const [minimum, maximum] = NUMBER_RANGES[key]
    return Number.isFinite(number) && number >= minimum && number <= maximum
  }
  if (BOOLEAN_KEYS.has(key)) return typeof value === 'boolean'
  if (key === 'support_email') return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 100
}

export async function saveSettings(config: AppConfigUpdate) {
  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }

  const entries = Object.entries(config).filter(([key]) => ALLOWED_KEYS.has(key))
  if (entries.length === 0) return { success: false, error: 'No valid settings to save' }
  if (entries.some(([key, value]) => !isValidSetting(key, value))) {
    return { success: false, error: 'One or more settings contain invalid values' }
  }

  const rows = entries.map(([key, value]) => ({
    key,
    value: String(value),
    updated_at: new Date().toISOString(),
    updated_by: auth.userId,
  }))

  const { error } = await auth.supabase
    .from('app_config')
    .upsert(rows, { onConflict: 'key' })

  if (error) return { success: false, error: error.message }

  await logAdminAction(auth.supabase, auth.userId, 'update_settings', {
    keys: entries.map(([k]) => k),
  })

  revalidatePath('/dashboard/settings')
  return { success: true, error: null }
}
