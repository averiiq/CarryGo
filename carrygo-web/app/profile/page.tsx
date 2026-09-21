'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  HelpCircle,
  IdCard,
  LifeBuoy,
  LogOut,
  Mail,
  MapPin,
  Package,
  Phone,
  Plane,
  Save,
  ShieldAlert,
  ShieldCheck,
  Star,
  User,
  Copy,
  Check,
} from 'lucide-react'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { createClient } from '@/utils/supabase/client'
import { logout } from '@/app/login/actions'

interface ProfileData {
  id: string
  full_name: string
  email: string
  phone?: string
  city?: string
  bio?: string
  is_verified?: boolean
  kyc_status?: string
  rating?: number
  reviews_count?: number
}

export default function CustomerProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)

  const handleCopyEmail = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText('support@carrygo.in')
      setCopiedEmail(true)
      setTimeout(() => setCopiedEmail(false), 2000)
    }
  }

  // Edit fields
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [bio, setBio] = useState('')

  useEffect(() => {
    const supabase = createClient()
    const loadProfile = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data: pData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      const userProfile: ProfileData = {
        id: user.id,
        email: user.email || '',
        full_name: pData?.full_name || (user.user_metadata?.full_name as string) || 'CarryGo Member',
        phone: pData?.phone || '',
        city: pData?.city || 'India',
        bio: pData?.bio || 'Verified CarryGo community member.',
        is_verified: pData?.is_verified || pData?.kyc_status === 'approved',
        kyc_status: pData?.kyc_status || 'unverified',
        rating: pData?.rating || 5.0,
        reviews_count: pData?.reviews_count || 12,
      }

      setProfile(userProfile)
      setFullName(userProfile.full_name)
      setPhone(userProfile.phone || '')
      setCity(userProfile.city || '')
      setBio(userProfile.bio || '')
      setLoading(false)
    }

    void loadProfile()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    setSavedSuccess(false)

    try {
      const supabase = createClient()
      await supabase.from('user_profiles').upsert({
        id: profile.id,
        full_name: fullName,
        phone,
        city,
        bio,
      })
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  return (
    <MarketingShell>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 md:py-12">
        <div className="mb-6">
          <Link
            href="/activity"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to My Deliveries
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column: Avatar & Trust Badges */}
          <div className="space-y-6">
            <div className="glass-card rounded-3xl p-6 border border-slate-200 bg-white text-center space-y-4 shadow-sm">
              <div className="relative mx-auto w-24 h-24 rounded-3xl bg-emerald-600 text-white flex items-center justify-center font-heading font-extrabold text-3xl shadow-lg shadow-emerald-600/25">
                {fullName?.[0]?.toUpperCase() || 'U'}
                {profile?.is_verified && (
                  <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-white text-emerald-600 shadow-md">
                    <ShieldCheck className="w-5 h-5 fill-emerald-100" />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <h2 className="text-lg font-heading font-extrabold text-slate-900">{fullName}</h2>
                <p className="text-xs text-slate-500">{profile?.email}</p>
              </div>

              <div className="flex items-center justify-center gap-1 text-amber-500 font-bold text-xs bg-amber-50 py-1.5 px-3 rounded-full border border-amber-200/80 w-fit mx-auto">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>5.0 / 5.0 Rating</span>
                <span className="text-slate-400 font-normal">(12 reviews)</span>
              </div>

              {/* KYC Status Callout */}
              <div className="pt-2 border-t border-slate-100">
                {profile?.is_verified ? (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center justify-center gap-2 font-bold">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Government ID Verified
                  </div>
                ) : (
                  <Link
                    href="/kyc"
                    className="block rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 hover:bg-amber-100 transition font-bold"
                  >
                    <ShieldAlert className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                    Complete KYC Verification ➔
                  </Link>
                )}
              </div>

              {/* Help & Support Callout */}
              <div className="pt-3 border-t border-slate-100 text-left space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs">
                    <LifeBuoy className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Help &amp; Support Desk</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> 24/7 Live
                  </span>
                </div>

                {/* 1-Click Official Email Copy Strip */}
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-100/80 transition text-left group cursor-pointer"
                  title="Click to copy official email"
                >
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                      Official Email
                    </span>
                    <span className="text-xs font-bold text-slate-800 truncate block">
                      support@carrygo.in
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 transition ${
                      copiedEmail
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 group-hover:border-emerald-500 group-hover:text-emerald-700'
                    }`}
                  >
                    {copiedEmail ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedEmail ? 'Copied' : 'Copy'}</span>
                  </span>
                </button>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Have questions about OTP handovers, luggage limits, or escrow refunds?
                </p>

                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <Link
                    href="/faq"
                    className="p-2 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition text-center text-[11px] font-semibold text-slate-700 block"
                  >
                    Browse FAQ
                  </Link>
                  <Link
                    href="/contact"
                    className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 transition text-center text-[11px] font-bold text-white block shadow-xs"
                  >
                    Contact Ops
                  </Link>
                </div>
              </div>

              <button
                type="button"
                onClick={() => logout()}
                className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-slate-200 hover:bg-rose-50 text-rose-600 text-xs font-semibold transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          </div>

          {/* Right Column: Edit Profile Details */}
          <div className="md:col-span-2 space-y-6">
            <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-200/90 bg-white shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-heading font-extrabold text-slate-900">Profile &amp; Settings</h3>
                  <p className="text-xs text-slate-500">Update your public contact details for fellow travelers and senders.</p>
                </div>
              </div>

              {savedSuccess && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs font-semibold text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Profile details saved successfully!
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 block">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:border-emerald-500 transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700 block">Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:border-emerald-500 transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700 block">Primary City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Gurugram, Haryana"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:border-emerald-500 transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 block">About Me / Bio</label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Frequent commuter between Gurugram and Panipat, happy to help carry lightweight parcels."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:border-emerald-500 transition"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition active:scale-98 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saving ? 'Saving...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </MarketingShell>
  )
}
