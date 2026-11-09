'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowDownCircle,
  ArrowLeft,
  ArrowUpCircle,
  Coins,
  Loader2,
  Package,
  Sparkles,
  Ticket,
} from 'lucide-react'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { createClient } from '@/utils/supabase/client'

interface Balance {
  balance: number
  totalEarned: number
  totalRedeemed: number
}

interface Transaction {
  id: string
  type: string
  amount: number
  balanceAfter: number
  description: string
  referenceType: string | null
  createdAt: string
}

function iconForType(type: string) {
  if (type === 'delivery_reward') return { Icon: Package, tone: 'text-emerald-700 bg-emerald-100' }
  if (type === 'parcel_credit_redemption')
    return { Icon: Ticket, tone: 'text-indigo-700 bg-indigo-100' }
  if (type === 'coupon_redemption') return { Icon: Sparkles, tone: 'text-rose-700 bg-rose-100' }
  return { Icon: Coins, tone: 'text-amber-700 bg-amber-100' }
}

export default function RewardsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState<Balance | null>(null)
  const [txns, setTxns] = useState<Transaction[]>([])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const sb = createClient()
      const {
        data: { user },
      } = await sb.auth.getUser()
      if (!user) {
        if (!cancelled) setLoading(false)
        return
      }
      if (cancelled) return
      setUserId(user.id)

      const [balRes, txRes] = await Promise.all([
        sb
          .from('user_coin_balances')
          .select('balance, total_earned, total_redeemed')
          .eq('user_id', user.id)
          .maybeSingle(),
        sb
          .from('coin_transactions')
          .select(
            'id, transaction_type, amount, balance_after, description, reference_type, created_at',
          )
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50),
      ])

      if (cancelled) return
      if (balRes.data) {
        setBalance({
          balance: balRes.data.balance ?? 0,
          totalEarned: balRes.data.total_earned ?? 0,
          totalRedeemed: balRes.data.total_redeemed ?? 0,
        })
      } else {
        setBalance({ balance: 0, totalEarned: 0, totalRedeemed: 0 })
      }
      if (txRes.data) {
        setTxns(
          txRes.data.map((r) => ({
            id: r.id,
            type: r.transaction_type,
            amount: r.amount,
            balanceAfter: r.balance_after,
            description: r.description,
            referenceType: r.reference_type,
            createdAt: r.created_at,
          })),
        )
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!userId && !loading) {
    return (
      <MarketingShell>
        <div className="mx-auto max-w-xl px-4 py-16 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Coins className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-heading font-extrabold text-slate-900">
            Earn coins on every delivery
          </h1>
          <p className="text-xs text-slate-500">Sign in to view your rewards.</p>
          <Link
            href="/login?next=%2Frewards"
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
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 md:py-10">
        <div className="mb-4">
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Profile
          </Link>
        </div>

        {loading ? (
          <div className="py-16 flex items-center justify-center text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <>
            <div className="rounded-3xl bg-gradient-to-br from-amber-500 via-amber-400 to-yellow-300 p-6 sm:p-8 shadow-xl text-slate-900">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider opacity-80">
                    CaryGoo coins
                  </p>
                  <p className="font-heading font-extrabold text-4xl sm:text-5xl mt-1">
                    {balance?.balance.toLocaleString('en-IN') ?? 0}
                  </p>
                  <p className="text-[11px] opacity-80 mt-1">
                    Earn coins when you complete deliveries. Redeem on parcel bookings.
                  </p>
                </div>
                <span className="shrink-0 w-14 h-14 rounded-2xl bg-white/80 text-amber-700 flex items-center justify-center">
                  <Coins className="w-7 h-7" />
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-2xl bg-white/70 px-3 py-2.5">
                  <p className="font-bold uppercase tracking-wider opacity-70 text-[10px]">
                    Total earned
                  </p>
                  <p className="font-heading font-extrabold text-lg">
                    {balance?.totalEarned.toLocaleString('en-IN') ?? 0}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/70 px-3 py-2.5">
                  <p className="font-bold uppercase tracking-wider opacity-70 text-[10px]">
                    Total redeemed
                  </p>
                  <p className="font-heading font-extrabold text-lg">
                    {balance?.totalRedeemed.toLocaleString('en-IN') ?? 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl space-y-4">
              <h2 className="text-base font-heading font-extrabold text-slate-900">
                Transaction history
              </h2>

              {txns.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  No coin activity yet. Complete your first delivery to start earning.
                </div>
              ) : (
                <ul className="space-y-2">
                  {txns.map((t) => {
                    const { Icon, tone } = iconForType(t.type)
                    const credit = t.amount > 0
                    return (
                      <li
                        key={t.id}
                        className="flex items-start gap-3 p-3 rounded-2xl border border-slate-200"
                      >
                        <span
                          className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${tone}`}
                        >
                          <Icon className="w-4 h-4" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-bold text-slate-900 truncate">
                              {t.description}
                            </p>
                            <span
                              className={`shrink-0 inline-flex items-center gap-1 text-xs font-extrabold ${
                                credit ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {credit ? (
                                <ArrowUpCircle className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowDownCircle className="w-3.5 h-3.5" />
                              )}
                              {credit ? '+' : ''}
                              {t.amount}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Balance after: {t.balanceAfter} ·{' '}
                            {new Date(t.createdAt).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </MarketingShell>
  )
}
