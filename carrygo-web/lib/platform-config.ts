import { createClient as createBrowserClient } from '@/utils/supabase/client'

export interface PlatformConfig {
  maintenanceMode: boolean
  newUserSignups: boolean
  kycRequired: boolean
  platformCommissionPercent: number
  gstPercent: number
  maxWeightKg: number
  minPricePerKg: number
  maxPricePerKg: number
  supportEmail: string
  supportPhone: string
  autoReleaseHours: number
}

export const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  maintenanceMode: false,
  newUserSignups: true,
  kycRequired: true,
  platformCommissionPercent: 12,
  gstPercent: 18,
  maxWeightKg: 20,
  minPricePerKg: 40,
  maxPricePerKg: 1000,
  supportEmail: 'support@carrygo.in',
  supportPhone: '+91 98765 43210',
  autoReleaseHours: 24,
}

export function parsePlatformConfig(rows: Array<{ key: string; value: string }> | null | undefined): PlatformConfig {
  if (!rows || rows.length === 0) {
    return { ...DEFAULT_PLATFORM_CONFIG }
  }

  const map = new Map<string, string>()
  for (const row of rows) {
    map.set(row.key, row.value)
  }

  return {
    maintenanceMode: map.get('maintenance_mode') === 'true',
    newUserSignups: map.get('new_user_signups') !== 'false',
    kycRequired: map.get('kyc_required') !== 'false',
    platformCommissionPercent: Number(map.get('platform_commission_percent')) || DEFAULT_PLATFORM_CONFIG.platformCommissionPercent,
    gstPercent: Number(map.get('gst_percent')) || DEFAULT_PLATFORM_CONFIG.gstPercent,
    maxWeightKg: Number(map.get('max_weight_kg')) || DEFAULT_PLATFORM_CONFIG.maxWeightKg,
    minPricePerKg: Number(map.get('min_price_per_kg')) || DEFAULT_PLATFORM_CONFIG.minPricePerKg,
    maxPricePerKg: Number(map.get('max_price_per_kg')) || DEFAULT_PLATFORM_CONFIG.maxPricePerKg,
    supportEmail: map.get('support_email') || DEFAULT_PLATFORM_CONFIG.supportEmail,
    supportPhone: map.get('support_phone') || DEFAULT_PLATFORM_CONFIG.supportPhone,
    autoReleaseHours: Number(map.get('auto_release_hours')) || DEFAULT_PLATFORM_CONFIG.autoReleaseHours,
  }
}

/**
 * Fetch platform config from browser client
 */
export async function getClientPlatformConfig(): Promise<PlatformConfig> {
  try {
    const supabase = createBrowserClient()
    const { data, error } = await supabase
      .from('app_config')
      .select('key, value')

    if (error || !data) {
      return { ...DEFAULT_PLATFORM_CONFIG }
    }

    return parsePlatformConfig(data)
  } catch {
    return { ...DEFAULT_PLATFORM_CONFIG }
  }
}
