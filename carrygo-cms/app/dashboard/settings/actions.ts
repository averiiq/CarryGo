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

export async function saveSettings(config: AppConfigUpdate) {
  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }

  const entries = Object.entries(config).filter(([key]) => ALLOWED_KEYS.has(key))
  if (entries.length === 0) return { success: false, error: 'No valid settings to save' }

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
