'use client'

import { Check, X, Sparkles, ShieldCheck, Zap, TrendingDown, Clock, ShieldAlert } from 'lucide-react'

const COMPARISON_ROWS = [
  {
    feature: 'Average Transit Speed',
    carrygo: '3 to 6 Hours (Same-Day)',
    carrygoSub: 'Travels directly on scheduled passenger trains, flights, or intercity drives',
    traditional: '2 to 4 Business Days',
    traditionalSub: 'Packages wait at local hubs for regional batch dispatch',
    highlight: true,
  },
  {
    feature: 'Typical Cost (2 KG Intercity)',
    carrygo: '₹160 – ₹240',
    carrygoSub: 'Direct peer-to-peer rates with zero sorting hub surcharges',
    traditional: '₹450 – ₹850+',
    traditionalSub: 'Heavy air/express courier surcharges and fuel markups',
    highlight: true,
  },
  {
    feature: 'Package Handling & Care',
    carrygo: 'Personal 1-on-1 Handover',
    carrygoSub: 'Travelers carry your item carefully in their personal seat or luggage space',
    traditional: '5+ Sorting Hubs & Conveyors',
    traditionalSub: 'Thrown onto sorting conveyor belts and multi-truck transfers',
  },
  {
    feature: 'Handover Verification',
    carrygo: 'Dual Golden Passkey (OTP)',
    carrygoSub: 'Private 4-digit codes required at pickup AND delivery confirmation',
    traditional: 'Scribbled Signature / None',
    traditionalSub: 'Often left at security gates with unverified delivery signatures',
  },
  {
    feature: 'Payment Security',
    carrygo: 'SafeVault™ Escrow Custody',
    carrygoSub: 'Traveler gets paid only after recipient enters delivery OTP',
    traditional: '100% Upfront & Non-refundable',
    traditionalSub: 'Paid before dispatch with complicated claims processes for loss',
  },
  {
    feature: 'Environmental Footprint',
    carrygo: 'Zero Extra Carbon Emissions',
    carrygoSub: 'Monetizes luggage capacity in vehicles already making the trip',
    traditional: 'High Diesel Fleet Emissions',
    traditionalSub: 'Dedicated cargo vans, trucks, and hub transport vehicles',
  },
]

export function CourierComparison() {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs">
          <Zap className="w-3.5 h-3.5 text-emerald-600" />
          <span>Why India is Switching to CarryGo</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-heading font-extrabold text-slate-900 tracking-tight">
          Old Courier Networks vs.{' '}
          <span className="text-emerald-700">The CarryGo Way</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          See why over 10,000+ senders choose verified travelers over legacy courier companies for same-day speed and 60% lower costs.
        </p>
      </div>

      {/* Comparison Matrix Table */}
      <div className="rounded-3xl border border-slate-200/90 bg-white shadow-xl overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-1 md:grid-cols-12 border-b border-slate-200 bg-slate-50/80">
          <div className="md:col-span-4 p-5 font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center">
            Comparison Metric
          </div>
          <div className="md:col-span-4 p-5 bg-emerald-50/90 border-x border-emerald-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-heading font-bold text-sm sm:text-base text-emerald-950">
                CarryGo Peer-to-Peer
              </span>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900">
              60% Lower
            </span>
          </div>
          <div className="md:col-span-4 p-5 font-bold text-xs sm:text-sm text-slate-500 flex items-center">
            Traditional Legacy Couriers
          </div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-slate-100">
          {COMPARISON_ROWS.map((row, index) => (
            <div
              key={row.feature}
              className={`grid grid-cols-1 md:grid-cols-12 transition-colors ${
                row.highlight ? 'bg-emerald-50/20' : 'hover:bg-slate-50/50'
              }`}
            >
              {/* Feature Title */}
              <div className="md:col-span-4 p-4 sm:p-5 flex items-center">
                <span className="font-bold text-xs sm:text-sm text-slate-900">
                  {row.feature}
                </span>
              </div>

              {/* CarryGo Column */}
              <div className="md:col-span-4 p-4 sm:p-5 bg-emerald-50/40 border-x border-emerald-100 flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-emerald-950">
                    {row.carrygo}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    {row.carrygoSub}
                  </p>
                </div>
              </div>

              {/* Traditional Courier Column */}
              <div className="md:col-span-4 p-4 sm:p-5 flex items-start gap-3 bg-white">
                <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                  <X className="w-3 h-3 stroke-[2.5]" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-slate-700">
                    {row.traditional}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    {row.traditionalSub}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Trust Guarantee Strip */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>
              <strong className="text-emerald-400 font-bold">100% Guaranteed:</strong> All deliveries are backed by our ₹10,000 transit guarantee and automated SafeVault™ escrow protection.
            </span>
          </div>
          <a
            href="/create-parcel"
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition shrink-0 shadow-xs"
          >
            Send First Parcel →
          </a>
        </div>
      </div>
    </div>
  )
}
