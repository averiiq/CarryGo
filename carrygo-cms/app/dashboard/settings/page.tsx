import { requireAdmin } from '@/utils/admin-guard'
import { redirect } from 'next/navigation'
import SettingsTabs from '@/components/SettingsTabs'

export default async function SettingsPage() {
  const auth = await requireAdmin()
  if ('error' in auth) redirect('/login')
  const supabase = auth.supabase

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, email, system_role')
    .eq('id', auth.userId)
    .single()

  // Load app config from DB if table exists, otherwise use defaults
  const { data: configRows } = await supabase
    .from('app_config')
    .select('key, value')
    .limit(50)

  const configMap: Record<string, string> = {}
  configRows?.forEach((row: any) => {
    configMap[row.key] = row.value
  })

  const config = {
    platformCommissionPercent: Number(configMap['platform_commission_percent'] || '15'),
    minCommissionAmount: Number(configMap['min_commission_amount'] || '10'),
    maxCommissionAmount: Number(configMap['max_commission_amount'] || '500'),
    gstPercent: Number(configMap['gst_percent'] || '18'),
    paymentGateway: configMap['payment_gateway'] || 'razorpay',
    autoReleaseHours: Number(configMap['auto_release_hours'] || '48'),
    maxWeightKg: Number(configMap['max_weight_kg'] || '30'),
    maxPricePerKg: Number(configMap['max_price_per_kg'] || '5000'),
    minPricePerKg: Number(configMap['min_price_per_kg'] || '10'),
    supportEmail: configMap['support_email'] || 'support@carrygo.in',
    supportPhone: configMap['support_phone'] || '+91-9876543210',
    maintenanceMode: configMap['maintenance_mode'] === 'true',
    newUserSignups: configMap['new_user_signups'] !== 'false',
    kycRequired: configMap['kyc_required'] !== 'false',
    otpExpiryMinutes: Number(configMap['otp_expiry_minutes'] || '5'),
    maxOtpAttempts: Number(configMap['max_otp_attempts'] || '5'),
    ratingThreshold: Number(configMap['rating_threshold'] || '2.5'),
    autoSuspendDisputes: Number(configMap['auto_suspend_disputes'] || '3'),
    pushNotifications: configMap['push_notifications'] !== 'false',
    emailNotifications: configMap['email_notifications'] !== 'false',
    smsNotifications: configMap['sms_notifications'] !== 'false',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground tracking-tight">Settings</h1>
        <p className="text-sm text-muted mt-1">Platform configuration, commission rates, payment settings, and app controls.</p>
      </div>

      <SettingsTabs
        profile={{
          full_name: profile?.full_name || null,
          email: profile?.email || null,
          system_role: profile?.system_role || null,
        }}
        config={config}
      />
    </div>
  )
}
