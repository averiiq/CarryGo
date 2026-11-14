'use client'

import { Check, X, ShieldCheck } from 'lucide-react'

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
    carrygo: 'Two-Step Handover Passkey',
    carrygoSub: 'Private 4-digit codes required at pickup and delivery confirmation',
    traditional: 'Scribbled Signature / None',
    traditionalSub: 'Often left at security gates with unverified delivery signatures',
  },
  {
    feature: 'Payment Security',
    carrygo: 'Safe Pay Reserve',
    carrygoSub: 'Traveler gets paid only after recipient enters delivery code',
    traditional: '100% Upfront & Non-refundable',
    traditionalSub: 'Paid before dispatch with complicated claims processes for loss',
  },
  {
    feature: 'Environmental Footprint',
    carrygo: 'Zero Extra Road Trips',
    carrygoSub: 'Utilizes luggage capacity in vehicles already making the scheduled trip',
    traditional: 'High Dedicated Van Mileage',
    traditionalSub: 'Dedicated cargo vans, trucks, and hub transport vehicles',
  },
]

export function CourierComparison() {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <span>Corridor comparison</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-heading font-semibold text-slate-900 tracking-tight">
          Hub-and-spoke couriers vs.{' '}
          <span className="text-emerald-800">Direct commuter transit</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Compare direct traveler luggage delivery against multi-hub express couriers for Haryana routes.
        </p>
      </div>

      {/* Comparison Matrix Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        {/* Table Header */}
        <div className="grid grid-cols-1 md:grid-cols-12 border-b border-slate-200 bg-slate-50">
          <div className="md:col-span-4 p-4 sm:p-5 font-semibold text-xs text-slate-600 flex items-center">
            Comparison metric
          </div>
          <div className="md:col-span-4 p-4 sm:p-5 bg-emerald-50/70 border-x border-emerald-200/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span className="font-heading font-semibold text-sm sm:text-base text-emerald-950">
                CarryGo Commuter Transit
              </span>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
              ~60% less
            </span>
          </div>
          <div className="md:col-span-4 p-4 sm:p-5 font-semibold text-xs sm:text-sm text-slate-600 flex items-center">
            Traditional hub couriers
          </div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-slate-100">
          {COMPARISON_ROWS.map((row) => (
            <div
              key={row.feature}
              className={`grid grid-cols-1 md:grid-cols-12 transition-colors ${
                row.highlight ? 'bg-emerald-50/20' : 'hover:bg-slate-50/50'
              }`}
            >
              {/* Feature Title */}
              <div className="md:col-span-4 p-4 sm:p-5 flex items-center">
                <span className="font-medium text-xs sm:text-sm text-slate-900">
                  {row.feature}
                </span>
              </div>

              {/* CarryGo Column */}
              <div className="md:col-span-4 p-4 sm:p-5 bg-emerald-50/30 border-x border-emerald-100 flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-emerald-950 tabular-nums">
                    {row.carrygo}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    {row.carrygoSub}
                  </p>
                </div>
              </div>

              {/* Traditional Courier Column */}
              <div className="md:col-span-4 p-4 sm:p-5 flex items-start gap-3 bg-white">
                <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                  <X className="w-3 h-3 stroke-[2.5]" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-slate-700 tabular-nums">
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
        <div className="p-4 sm:p-5 bg-emerald-50/60 border-t border-emerald-200 text-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
            <span>
              <strong className="text-emerald-900 font-semibold">Protected bookings:</strong> Backed by Safe Pay reserve and verified commuter identity.
            </span>
          </div>
          <a
            href="/create-parcel"
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold transition shrink-0"
          >
            Send First Parcel →
          </a>
        </div>
      </div>
    </div>
  )
}
