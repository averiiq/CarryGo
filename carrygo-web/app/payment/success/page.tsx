'use client'

import React from 'react'
import Link from 'next/link'
import { CheckCircle2, ShieldCheck, ArrowRight, Package } from 'lucide-react'
import { MarketingShell } from '@/components/marketing/marketing-shell'

export default function PaymentSuccessPage() {
  return (
    <MarketingShell>
      <div className="mx-auto max-w-xl px-4 py-16 sm:px-6 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 mb-6 shadow-sm border border-emerald-100">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>

        <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight mb-3">
          Payment Secured in Escrow
        </h1>

        <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-8 max-w-md mx-auto">
          Thank you. Your funds have been successfully verified and locked in CarryGo RBI-compliant escrow. Payout will be released to the traveler only after destination OTP verification.
        </p>

        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 text-left mb-8 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <h3 className="text-sm font-bold text-slate-800">Dual-Protection Protocol</h3>
          </div>
          <ul className="space-y-2 text-xs text-slate-600">
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">•</span>
              <span><strong>Pickup Code:</strong> Share your 4-digit handover passkey when the traveler collects the parcel.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">•</span>
              <span><strong>Delivery Code:</strong> The recipient shares the secret 6-digit destination OTP upon parcel arrival to release payout.</span>
            </li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/activity"
            className="inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition active:scale-98"
          >
            <Package className="w-4 h-4" />
            View Deliveries & Activity
          </Link>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm border border-slate-200 transition"
          >
            Home
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </MarketingShell>
  )
}
