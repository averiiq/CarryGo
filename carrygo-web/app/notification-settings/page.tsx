'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Bell,
  Building2,
  CheckCircle2,
  CreditCard,
  Loader2,
  MapPin,
  MessageCircle,
  Package,
  Sparkles,
  Truck,
} from 'lucide-react'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
  type UserNotificationPreferences,
} from '@/services/notifications.service'

interface ToggleRow {
  key: keyof Omit<UserNotificationPreferences, 'userId' | 'updatedAt'>
  label: string
  description: string
  Icon: typeof Bell
  tone: string
}

const ROWS: ToggleRow[] = [
  {
    key: 'enableMatches',
    label: 'Route matches',
    description: 'Alerts when a travel corridor matches one of your saved routes.',
    Icon: MapPin,
    tone: 'text-indigo-700 bg-indigo-100',
  },
  {
    key: 'enableTripUpdates',
    label: 'Trip updates',
    description: 'Status changes on trips you offer.',
    Icon: Truck,
    tone: 'text-blue-700 bg-blue-100',
  },
  {
    key: 'enableParcelUpdates',
    label: 'Parcel updates',
    description: 'Status changes on parcels you send.',
    Icon: Package,
    tone: 'text-emerald-700 bg-emerald-100',
  },
  {
    key: 'enableChat',
    label: 'Chat messages',
    description: 'New messages from your senders or travellers.',
    Icon: MessageCircle,
    tone: 'text-amber-700 bg-amber-100',
  },
  {
    key: 'enablePayments',
    label: 'Payment events',
    description: 'Safe Pay reserves, releases, refunds, and invoices.',
    Icon: CreditCard,
    tone: 'text-violet-700 bg-violet-100',
  },
  {
    key: 'enablePromotions',
    label: 'Promotions',
    description: 'Occasional product news and promotional offers.',
    Icon: Sparkles,
    tone: 'text-rose-700 bg-rose-100',
  },
  {
    key: 'enableCityAlerts',
    label: 'City demand alerts',
    description: 'Surge notifications when your home city has high courier demand.',
    Icon: Building2,
    tone: 'text-teal-700 bg-teal-100',
  },
]

export default function NotificationSettingsPage() {
  const [prefs, setPrefs] = useState<UserNotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const result = await fetchNotificationPreferences()
      if (cancelled) return
      setLoading(false)
      if (result.data) setPrefs(result.data)
      else setError(result.error ?? 'Could not load preferences.')
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const toggle = async (row: ToggleRow) => {
    if (!prefs) return
    const next: UserNotificationPreferences = { ...prefs, [row.key]: !prefs[row.key] }
    setPrefs(next)
    setSaving(row.key)
    setError(null)
    const { error: upErr } = await updateNotificationPreferences(next)
    setSaving(null)
    if (upErr) {
      setError(upErr)
      // revert
      setPrefs(prefs)
      return
    }
    setSavedAt(Date.now())
  }

  return (
    <MarketingShell>
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 md:py-10">
        <div className="mb-4">
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Profile
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
            <span className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-heading font-semibold text-slate-900">
                Notification preferences
              </h1>
              <p className="text-xs text-slate-500">
                Choose which notifications we send you. Critical safety alerts (OTP, delivery, payment release) are always on.
              </p>
            </div>
          </div>

          {loading && (
            <div className="py-10 flex items-center justify-center text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800">
              {error}
            </div>
          )}

          {prefs && !loading && (
            <div className="space-y-2">
              {ROWS.map((row) => {
                const value = prefs[row.key]
                return (
                  <button
                    key={row.key}
                    type="button"
                    onClick={() => void toggle(row)}
                    disabled={saving !== null}
                    className="w-full text-left flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200 hover:bg-slate-50 transition disabled:opacity-60"
                  >
                    <span
                      className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${row.tone}`}
                    >
                      <row.Icon className="w-4 h-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900">{row.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{row.description}</p>
                    </div>
                    <span
                      className={`shrink-0 relative inline-block w-10 h-6 rounded-full transition ${
                        value ? 'bg-emerald-600' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                          value ? 'left-[22px]' : 'left-0.5'
                        }`}
                      />
                      {saving === row.key && (
                        <Loader2 className="absolute -right-5 top-1 w-3.5 h-3.5 animate-spin text-slate-400" />
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {savedAt && (
            <div className="pt-2 flex items-center gap-1.5 text-[11px] text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Preferences saved.
            </div>
          )}
        </div>
      </div>
    </MarketingShell>
  )
}
