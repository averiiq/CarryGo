'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Check,
  Copy,
  Gift,
  Share2,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { createClient } from '@/utils/supabase/client'

const TIERS = [
  {
    name: 'Bronze',
    reward: '₹100 / referral',
    requirement: '1 – 4 successful referrals',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  {
    name: 'Silver',
    reward: '₹150 / referral',
    requirement: '5 – 19 successful referrals',
    color: 'bg-slate-100 text-slate-800 border-slate-200',
  },
  {
    name: 'Gold',
    reward: '₹200 / referral + 5% commission',
    requirement: '20+ successful referrals',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
]

export default function ReferralPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  useEffect(() => {
    const sb = createClient()
    void sb.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null)
    })
  }, [])

  const code = useMemo(() => {
    if (!userId) return 'CARYGOO'
    const base = userId.replace(/-/g, '').toUpperCase().slice(0, 6)
    return `CG${base}`
  }, [userId])

  const link = useMemo(() => {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://app.carygoo.in'
    return `${origin}/login?ref=${code}`
  }, [code])

  const copyCode = async () => {
    await navigator.clipboard.writeText(code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const copyLink = async () => {
    await navigator.clipboard.writeText(link)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const share = async () => {
    const message = `Send parcels across India faster and cheaper with CaryGoo. Use my referral code ${code} for ₹50 off your first delivery: ${link}`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'CaryGoo invite', text: message, url: link })
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(message)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  if (!userId) {
    return (
      <MarketingShell>
        <div className="mx-auto max-w-xl px-4 py-16 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center">
            <Gift className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-heading font-extrabold text-slate-900">
            Invite friends, earn ₹100 – ₹200 per referral
          </h1>
          <p className="text-xs text-slate-500">Sign in to see your referral code.</p>
          <Link
            href="/login?next=%2Freferral"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-xs"
          >
            Sign in
          </Link>
        </div>
      </MarketingShell>
    )
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

        <div className="rounded-3xl bg-gradient-to-br from-rose-500 via-rose-400 to-amber-300 p-6 sm:p-8 shadow-xl text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider opacity-80">
                Your referral code
              </p>
              <p className="font-heading font-extrabold text-4xl sm:text-5xl mt-1 tracking-wider">
                {code}
              </p>
              <p className="text-xs opacity-80 mt-1">
                Share with a friend — you both get rewards on their first delivery.
              </p>
            </div>
            <span className="shrink-0 w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
              <Gift className="w-7 h-7" />
            </span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyCode}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/90 text-slate-900 text-xs font-bold hover:bg-white transition"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedCode ? 'Copied' : 'Copy code'}
            </button>
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/90 text-slate-900 text-xs font-bold hover:bg-white transition"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedLink ? 'Copied link' : 'Copy invite link'}
            </button>
            <button
              type="button"
              onClick={() => void share()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900/80 text-white text-xs font-bold hover:bg-slate-900 transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl space-y-4">
          <h2 className="text-base font-heading font-extrabold text-slate-900 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-600" /> Reward tiers
          </h2>
          <div className="space-y-2">
            {TIERS.map((t) => (
              <div
                key={t.name}
                className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200"
              >
                <span
                  className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${t.color}`}
                >
                  {t.name}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900">{t.reward}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{t.requirement}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-6 text-xs text-slate-600 space-y-2">
          <p className="font-bold text-slate-900 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> How it works
          </p>
          <ol className="list-decimal ml-5 space-y-1">
            <li>Share your code or invite link with a friend.</li>
            <li>They sign up and complete their first delivery or trip.</li>
            <li>Your reward is added as CaryGoo coins, usable on your next booking.</li>
          </ol>
          <p className="pt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
            <Users className="w-3.5 h-3.5" />
            Referral rewards are credited within 48 hours of your friend's first completed delivery.
          </p>
        </div>
      </div>
    </MarketingShell>
  )
}
