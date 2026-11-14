'use client'

import { useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import {
  User, Shield, Percent, CreditCard, Smartphone, Globe, Bell,
  Save, ToggleLeft, ToggleRight, Info, Coins
} from 'lucide-react'
import { saveSettings, saveGatewayCredentials } from '@/app/dashboard/settings/actions'
import type { GatewayCredentials } from '@/app/dashboard/settings/actions'

interface AdminProfile {
  full_name: string | null
  email: string | null
  system_role: string | null
}

interface AppConfig {
  platformCommissionPercent: number
  minCommissionAmount: number
  maxCommissionAmount: number
  gstPercent: number
  paymentGateway: string
  autoReleaseHours: number
  maxWeightKg: number
  maxPricePerKg: number
  minPricePerKg: number
  supportEmail: string
  supportPhone: string
  maintenanceMode: boolean
  newUserSignups: boolean
  kycRequired: boolean
  otpExpiryMinutes: number
  maxOtpAttempts: number
  ratingThreshold: number
  autoSuspendDisputes: number
  pushNotifications: boolean
  emailNotifications: boolean
  smsNotifications: boolean
  coinAwardPerDelivery: number
}

interface SettingsTabsProps {
  profile: AdminProfile
  config: AppConfig
  gatewayCreds: GatewayCredentials[]
}

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'commission', label: 'Commission & Pricing', icon: Percent },
  { id: 'payments', label: 'Payment Config', icon: CreditCard },
  { id: 'app', label: 'App Settings', icon: Smartphone },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security & Access', icon: Shield },
]

export default function SettingsTabs({ profile, config: initialConfig, gatewayCreds: initialGatewayCreds }: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState('commission')
  const [config, setConfig] = useState<AppConfig>(initialConfig)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const updateConfig = (key: keyof AppConfig, value: string | number | boolean) => {
    setConfig(prev => ({ ...prev, [key]: value }))
    setSaved(false)
    setSaveError(null)
  }

  const handleSave = () => {
    startTransition(async () => {
      const dbConfig: Record<string, string | number | boolean> = {
        platform_commission_percent: config.platformCommissionPercent,
        min_commission_amount: config.minCommissionAmount,
        max_commission_amount: config.maxCommissionAmount,
        gst_percent: config.gstPercent,
        payment_gateway: config.paymentGateway,
        auto_release_hours: config.autoReleaseHours,
        max_weight_kg: config.maxWeightKg,
        max_price_per_kg: config.maxPricePerKg,
        min_price_per_kg: config.minPricePerKg,
        support_email: config.supportEmail,
        support_phone: config.supportPhone,
        maintenance_mode: config.maintenanceMode,
        new_user_signups: config.newUserSignups,
        kyc_required: config.kycRequired,
        otp_expiry_minutes: config.otpExpiryMinutes,
        max_otp_attempts: config.maxOtpAttempts,
        rating_threshold: config.ratingThreshold,
        auto_suspend_disputes: config.autoSuspendDisputes,
        push_notifications: config.pushNotifications,
        email_notifications: config.emailNotifications,
        sms_notifications: config.smsNotifications,
        coin_award_per_delivery: config.coinAwardPerDelivery,
      }

      const result = await saveSettings(dbConfig)
      if (result.success) {
        setSaved(true)
        setSaveError(null)
        setTimeout(() => setSaved(false), 3000)
      } else {
        setSaveError(result.error ?? 'Failed to save settings')
      }
    })
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Tab Navigation */}
      <div className="lg:w-56 shrink-0">
        <nav className="glass-card p-2 space-y-0.5">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted hover:text-foreground hover:bg-surface-elevated'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-w-0">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'profile' && <ProfileTab profile={profile} />}
          {activeTab === 'commission' && <CommissionTab config={config} updateConfig={updateConfig} />}
          {activeTab === 'payments' && <PaymentsTab config={config} updateConfig={updateConfig} gatewayCreds={initialGatewayCreds} />}
          {activeTab === 'app' && <AppTab config={config} updateConfig={updateConfig} />}
          {activeTab === 'notifications' && <NotificationsTab config={config} updateConfig={updateConfig} />}
          {activeTab === 'security' && <SecurityTab config={config} updateConfig={updateConfig} />}
        </motion.div>

        {activeTab !== 'profile' && (
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              <Save className="h-4 w-4" />
              {isPending ? 'Saving...' : 'Save Changes'}
            </button>
            {saved && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-sm text-success font-medium"
              >
                Changes saved successfully
              </motion.span>
            )}
            {saveError && (
              <span className="text-sm text-danger font-medium">{saveError}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ProfileTab({ profile }: { profile: AdminProfile }) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="px-6 py-6 border-b border-border-subtle flex items-center gap-5">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-primary/20">
          {profile.full_name?.charAt(0) || 'A'}
        </div>
        <div>
          <h2 className="text-lg font-heading font-bold text-foreground">{profile.full_name || 'System Administrator'}</h2>
          <p className="text-sm text-muted flex items-center gap-1.5 mt-0.5">
            <Shield className="h-3.5 w-3.5 text-primary" />
            {profile.system_role === 'admin' ? 'Super Admin' : 'Admin'}
          </p>
        </div>
      </div>
      <div className="p-6 space-y-4">
        <SettingsField label="Full Name" value={profile.full_name || 'System Administrator'} disabled />
        <SettingsField label="Email Address" value={profile.email || ''} disabled />
        <SettingsField label="Role" value={profile.system_role === 'admin' ? 'Super Admin' : 'Admin'} disabled />
        <p className="text-xs text-muted-foreground mt-2">Profile changes are managed via the mobile app.</p>
      </div>
    </div>
  )
}

function CommissionTab({ config, updateConfig }: { config: AppConfig; updateConfig: (key: keyof AppConfig, value: string | number | boolean) => void }) {
  return (
    <div className="space-y-4">
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Percent className="h-5 w-5 text-primary" />
          <h3 className="text-base font-heading font-semibold text-foreground">Platform Commission</h3>
        </div>
        <InfoBanner text="Commission is charged on every successful delivery. The platform deducts this percentage before releasing payment to the traveller." />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <SettingsNumberField
            label="Commission Rate (%)"
            value={config.platformCommissionPercent}
            onChange={v => updateConfig('platformCommissionPercent', v)}
            min={0}
            max={50}
            step={0.5}
            suffix="%"
          />
          <SettingsNumberField
            label="GST on Commission (%)"
            value={config.gstPercent}
            onChange={v => updateConfig('gstPercent', v)}
            min={0}
            max={28}
            step={1}
            suffix="%"
          />
          <SettingsNumberField
            label="Min Commission (₹)"
            value={config.minCommissionAmount}
            onChange={v => updateConfig('minCommissionAmount', v)}
            min={0}
            max={1000}
            step={5}
            prefix="₹"
          />
          <SettingsNumberField
            label="Max Commission (₹)"
            value={config.maxCommissionAmount}
            onChange={v => updateConfig('maxCommissionAmount', v)}
            min={0}
            max={10000}
            step={50}
            prefix="₹"
          />
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-base font-heading font-semibold text-foreground mb-4">Pricing Limits</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SettingsNumberField
            label="Min Price per KG (₹)"
            value={config.minPricePerKg}
            onChange={v => updateConfig('minPricePerKg', v)}
            min={1}
            max={1000}
            step={5}
            prefix="₹"
          />
          <SettingsNumberField
            label="Max Price per KG (₹)"
            value={config.maxPricePerKg}
            onChange={v => updateConfig('maxPricePerKg', v)}
            min={10}
            max={50000}
            step={50}
            prefix="₹"
          />
          <SettingsNumberField
            label="Max Weight (kg)"
            value={config.maxWeightKg}
            onChange={v => updateConfig('maxWeightKg', v)}
            min={1}
            max={100}
            step={1}
            suffix="kg"
          />
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-base font-heading font-semibold text-foreground mb-2">Commission Preview</h3>
        <p className="text-xs text-muted mb-4">Example calculation for a ₹500 delivery</p>
        <div className="bg-background rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Delivery Amount</span>
            <span className="font-medium text-foreground">₹500.00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Platform Commission ({config.platformCommissionPercent}%)</span>
            <span className="font-medium text-danger">-₹{Math.max(config.minCommissionAmount, Math.min(config.maxCommissionAmount, 500 * config.platformCommissionPercent / 100)).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">GST on Commission ({config.gstPercent}%)</span>
            <span className="font-medium text-danger">-₹{(Math.max(config.minCommissionAmount, Math.min(config.maxCommissionAmount, 500 * config.platformCommissionPercent / 100)) * config.gstPercent / 100).toFixed(2)}</span>
          </div>
          <div className="border-t border-border-subtle pt-2 flex justify-between">
            <span className="font-semibold text-foreground">Traveller Receives</span>
            <span className="font-bold text-success">
              ₹{(500 - Math.max(config.minCommissionAmount, Math.min(config.maxCommissionAmount, 500 * config.platformCommissionPercent / 100)) * (1 + config.gstPercent / 100)).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Coins className="h-5 w-5 text-amber-500" />
          <h3 className="text-base font-heading font-semibold text-foreground">Coins & Rewards Configuration</h3>
        </div>
        <InfoBanner text="Coins awarded automatically to both Traveler and Sender upon confirmed successful parcel delivery (10 coins = ₹1 parcel credit)." />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <SettingsNumberField
            label="Coin Award per Successful Delivery"
            value={config.coinAwardPerDelivery}
            onChange={v => updateConfig('coinAwardPerDelivery', v)}
            min={0}
            max={10000}
            step={10}
            suffix="coins"
          />
        </div>
      </div>
    </div>
  )
}

function PaymentsTab({ config, updateConfig, gatewayCreds }: { config: AppConfig; updateConfig: (key: keyof AppConfig, value: string | number | boolean) => void; gatewayCreds: GatewayCredentials[] }) {
  const [creds, setCreds] = useState<Record<string, GatewayCredentials>>(() => {
    const map: Record<string, GatewayCredentials> = {}
    for (const c of gatewayCreds) map[c.gateway] = c
    return map
  })
  const [selectedGw, setSelectedGw] = useState(config.paymentGateway || 'razorpay')
  const [gwPending, startGwTransition] = useTransition()
  const [gwSaved, setGwSaved] = useState(false)
  const [gwError, setGwError] = useState<string | null>(null)

  const currentCred = creds[selectedGw] || {
    gateway: selectedGw, is_active: false, is_test_mode: true,
    live_key_id: '', live_key_secret: '', live_merchant_id: '', live_webhook_secret: '',
    test_key_id: '', test_key_secret: '', test_merchant_id: '', test_webhook_secret: '',
    salt_key: '', salt_index: '1',
  }

  const updateCred = (field: keyof GatewayCredentials, value: string | boolean) => {
    setCreds(prev => ({
      ...prev,
      [selectedGw]: { ...currentCred, gateway: selectedGw, [field]: value },
    }))
    setGwSaved(false)
    setGwError(null)
  }

  const handleSaveGateway = () => {
    startGwTransition(async () => {
      const result = await saveGatewayCredentials(currentCred)
      if (result.success) {
        setGwSaved(true)
        setGwError(null)
        if (currentCred.is_active) updateConfig('paymentGateway', selectedGw)
        setTimeout(() => setGwSaved(false), 3000)
      } else {
        setGwError(result.error ?? 'Failed to save')
      }
    })
  }

  const isPhonePe = selectedGw === 'phonepe'

  return (
    <div className="space-y-4">
      {/* Gateway Selector */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <CreditCard className="h-5 w-5 text-primary" />
          <h3 className="text-base font-heading font-semibold text-foreground">Payment Gateway Configuration</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {(['razorpay', 'phonepe', 'payu'] as const).map(gw => {
            const isActive = creds[gw]?.is_active
            return (
              <button
                key={gw}
                onClick={() => setSelectedGw(gw)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  selectedGw === gw
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground capitalize">{gw === 'payu' ? 'PayU' : gw === 'phonepe' ? 'PhonePe' : 'Razorpay'}</span>
                  {isActive && <span className="text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">ACTIVE</span>}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {gw === 'razorpay' && 'Orders API + Checkout.js + Payment Links'}
                  {gw === 'phonepe' && 'PG Standard Checkout + S2S callbacks'}
                  {gw === 'payu' && 'Hash-based form POST + Webhook'}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Credentials for selected gateway */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-heading font-semibold text-foreground capitalize">
            {selectedGw === 'payu' ? 'PayU' : selectedGw === 'phonepe' ? 'PhonePe' : 'Razorpay'} Credentials
          </h3>
          <div className="flex items-center gap-3">
            <SettingsToggle
              label="Active Gateway"
              description=""
              enabled={currentCred.is_active}
              onChange={v => updateCred('is_active', v)}
            />
          </div>
        </div>

        <SettingsToggle
          label="Test / Sandbox Mode"
          description="Use test credentials for development. Disable for production."
          enabled={currentCred.is_test_mode}
          onChange={v => updateCred('is_test_mode', v)}
          variant={currentCred.is_test_mode ? undefined : 'danger'}
        />

        <div className="mt-5 space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Test Credentials</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SettingsTextField label={isPhonePe ? 'Merchant ID (Test)' : 'Key ID (Test)'} value={isPhonePe ? currentCred.test_merchant_id : currentCred.test_key_id} onChange={v => updateCred(isPhonePe ? 'test_merchant_id' : 'test_key_id', v)} />
            <SettingsTextField label={isPhonePe ? 'Salt Key (Test)' : 'Key Secret (Test)'} value={isPhonePe ? currentCred.salt_key : currentCred.test_key_secret} onChange={v => updateCred(isPhonePe ? 'salt_key' : 'test_key_secret', v)} type="password" />
            {!isPhonePe && <SettingsTextField label="Merchant ID (Test)" value={currentCred.test_merchant_id} onChange={v => updateCred('test_merchant_id', v)} />}
            <SettingsTextField label="Webhook Secret (Test)" value={currentCred.test_webhook_secret} onChange={v => updateCred('test_webhook_secret', v)} type="password" />
          </div>

          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-4 border-t border-border-subtle">Live Credentials</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SettingsTextField label={isPhonePe ? 'Merchant ID (Live)' : 'Key ID (Live)'} value={isPhonePe ? currentCred.live_merchant_id : currentCred.live_key_id} onChange={v => updateCred(isPhonePe ? 'live_merchant_id' : 'live_key_id', v)} />
            <SettingsTextField label={isPhonePe ? 'Salt Key (Live)' : 'Key Secret (Live)'} value={isPhonePe ? currentCred.salt_key : currentCred.live_key_secret} onChange={v => updateCred(isPhonePe ? 'salt_key' : 'live_key_secret', v)} type="password" />
            {!isPhonePe && <SettingsTextField label="Merchant ID (Live)" value={currentCred.live_merchant_id} onChange={v => updateCred('live_merchant_id', v)} />}
            <SettingsTextField label="Webhook Secret (Live)" value={currentCred.live_webhook_secret} onChange={v => updateCred('live_webhook_secret', v)} type="password" />
          </div>
          {isPhonePe && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SettingsTextField label="Salt Index" value={currentCred.salt_index} onChange={v => updateCred('salt_index', v)} />
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={handleSaveGateway}
            disabled={gwPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-all"
          >
            <Save className="h-4 w-4" />
            {gwPending ? 'Saving...' : 'Save Gateway Credentials'}
          </button>
          {gwSaved && <span className="text-sm text-success font-medium">Gateway saved</span>}
          {gwError && <span className="text-sm text-danger font-medium">{gwError}</span>}
        </div>
        <InfoBanner text="Only one gateway can be active at a time. Activating a gateway will deactivate others. Credentials are encrypted and accessible only to the payment processing service." />
      </div>

      {/* Auto-release and flow */}
      <div className="glass-card p-6">
        <h3 className="text-base font-heading font-semibold text-foreground mb-4">Settlement Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SettingsNumberField
            label="Auto-Release (hours)"
            value={config.autoReleaseHours}
            onChange={v => updateConfig('autoReleaseHours', v)}
            min={1} max={168} step={1} suffix="hrs"
          />
        </div>
        <InfoBanner text="Payment is locked when a request is accepted and released to the traveller upon OTP-verified delivery. Auto-release triggers if confirmation isn't received within the specified hours." />
      </div>

      <div className="glass-card p-6">
        <h3 className="text-base font-heading font-semibold text-foreground mb-4">Payment Split Flow</h3>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {['Sender Pays', 'Payment Locked', 'Split Calculated', 'OTP Verified', 'Traveler Paid'].map((step, i) => (
            <div key={step} className="flex items-center gap-2 shrink-0">
              <div className="flex flex-col items-center">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  i < 4 ? 'bg-success/10 text-success border-2 border-success/30' : 'bg-primary/10 text-primary border-2 border-primary/30'
                }`}>{i + 1}</div>
                <span className="text-[10px] text-muted-foreground mt-1 max-w-[80px] text-center leading-tight">{step}</span>
              </div>
              {i < 4 && <div className="h-0.5 w-6 bg-border-subtle rounded-full mt-[-12px]" />}
            </div>
          ))}
        </div>
        <InfoBanner text="Commission rates and GST are configured in the Commission tab. The split is computed at payment finalization and stored on each payment record." />
      </div>
    </div>
  )
}

function AppTab({ config, updateConfig }: { config: AppConfig; updateConfig: (key: keyof AppConfig, value: string | number | boolean) => void }) {
  return (
    <div className="space-y-4">
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Globe className="h-5 w-5 text-primary" />
          <h3 className="text-base font-heading font-semibold text-foreground">Platform Controls</h3>
        </div>
        <div className="space-y-4">
          <SettingsToggle
            label="Maintenance Mode"
            description="Temporarily disable the app for all users during updates"
            enabled={config.maintenanceMode}
            onChange={v => updateConfig('maintenanceMode', v)}
            variant="danger"
          />
          <SettingsToggle
            label="New User Signups"
            description="Allow new users to register on the platform"
            enabled={config.newUserSignups}
            onChange={v => updateConfig('newUserSignups', v)}
          />
          <SettingsToggle
            label="KYC Required for Trips"
            description="Require identity verification before users can create trips"
            enabled={config.kycRequired}
            onChange={v => updateConfig('kycRequired', v)}
          />
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-base font-heading font-semibold text-foreground mb-4">Contact & Support</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SettingsTextField
            label="Support Email"
            value={config.supportEmail}
            onChange={v => updateConfig('supportEmail', v)}
            type="email"
          />
          <SettingsTextField
            label="Support Phone"
            value={config.supportPhone}
            onChange={v => updateConfig('supportPhone', v)}
            type="tel"
          />
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-base font-heading font-semibold text-foreground mb-4">Moderation</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SettingsNumberField
            label="Rating Threshold (auto-flag)"
            value={config.ratingThreshold}
            onChange={v => updateConfig('ratingThreshold', v)}
            min={1}
            max={5}
            step={0.1}
            suffix="★"
          />
          <SettingsNumberField
            label="Auto-Suspend after N Disputes"
            value={config.autoSuspendDisputes}
            onChange={v => updateConfig('autoSuspendDisputes', v)}
            min={1}
            max={20}
            step={1}
          />
        </div>
        <InfoBanner text="Users below the rating threshold or with too many disputes will be automatically flagged for review." />
      </div>
    </div>
  )
}

function NotificationsTab({ config, updateConfig }: { config: AppConfig; updateConfig: (key: keyof AppConfig, value: string | number | boolean) => void }) {
  return (
    <div className="space-y-4">
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Bell className="h-5 w-5 text-primary" />
          <h3 className="text-base font-heading font-semibold text-foreground">Notification Channels</h3>
        </div>
        <div className="space-y-4">
          <SettingsToggle
            label="Push Notifications"
            description="Send push notifications to users for delivery updates, new matches, and messages"
            enabled={config.pushNotifications}
            onChange={v => updateConfig('pushNotifications', v)}
          />
          <SettingsToggle
            label="Email Notifications"
            description="Send email for account events, payment confirmations, and weekly summaries"
            enabled={config.emailNotifications}
            onChange={v => updateConfig('emailNotifications', v)}
          />
          <SettingsToggle
            label="SMS Notifications"
            description="Send SMS for OTP verification, payment alerts, and critical updates"
            enabled={config.smsNotifications}
            onChange={v => updateConfig('smsNotifications', v)}
          />
        </div>
      </div>
    </div>
  )
}

function SecurityTab({ config, updateConfig }: { config: AppConfig; updateConfig: (key: keyof AppConfig, value: string | number | boolean) => void }) {
  return (
    <div className="space-y-4">
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="text-base font-heading font-semibold text-foreground">OTP & Authentication</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SettingsNumberField
            label="OTP Expiry (minutes)"
            value={config.otpExpiryMinutes}
            onChange={v => updateConfig('otpExpiryMinutes', v)}
            min={1}
            max={30}
            step={1}
            suffix="min"
          />
          <SettingsNumberField
            label="Max OTP Attempts"
            value={config.maxOtpAttempts}
            onChange={v => updateConfig('maxOtpAttempts', v)}
            min={3}
            max={10}
            step={1}
          />
        </div>
        <InfoBanner text="Rate limiting is enforced at the database level: max 5 OTP sends per hour, max 10 verify attempts per hour per email." />
      </div>
    </div>
  )
}

// Reusable form components

function SettingsField({ label, value, disabled }: { label: string; value: string; disabled?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
      <input
        type="text"
        disabled={disabled}
        value={value}
        readOnly
        className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm bg-background text-muted"
      />
    </div>
  )
}

function SettingsTextField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm bg-surface-solid text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
      />
    </div>
  )
}

function SettingsNumberField({ label, value, onChange, min, max, step, prefix, suffix }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; prefix?: string; suffix?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        {prefix && <span className="text-sm text-muted-foreground font-medium">{prefix}</span>}
        <input
          type="number"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step}
          className="flex-1 px-3.5 py-2.5 rounded-xl border border-border text-sm bg-surface-solid text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all tabular-nums"
        />
        {suffix && <span className="text-sm text-muted-foreground font-medium">{suffix}</span>}
      </div>
    </div>
  )
}

function SettingsToggle({ label, description, enabled, onChange, variant }: {
  label: string; description: string; enabled: boolean; onChange: (v: boolean) => void; variant?: 'danger'
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border-subtle last:border-0">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`shrink-0 transition-colors ${enabled ? (variant === 'danger' ? 'text-danger' : 'text-primary') : 'text-muted-foreground'}`}
      >
        {enabled ? <ToggleRight className="h-7 w-7" /> : <ToggleLeft className="h-7 w-7" />}
      </button>
    </div>
  )
}

function InfoBanner({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10 mt-3">
      <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
      <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
    </div>
  )
}
