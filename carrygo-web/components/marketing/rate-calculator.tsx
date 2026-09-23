'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Coins,
  FileText,
  Laptop,
  Package,
  Pill,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TrendingDown,
  Wallet,
  Zap,
} from 'lucide-react'

const CATEGORIES = [
  { id: 'documents', label: 'Documents', icon: FileText, baseFee: 120, ratePerKg: 40 },
  { id: 'electronics', label: 'Electronics', icon: Laptop, baseFee: 200, ratePerKg: 80 },
  { id: 'clothing', label: 'Clothing & Gifts', icon: ShoppingBag, baseFee: 150, ratePerKg: 50 },
  { id: 'medicine', label: 'Medicine', icon: Pill, baseFee: 180, ratePerKg: 60 },
  { id: 'other', label: 'General Goods', icon: Package, baseFee: 140, ratePerKg: 50 },
]

export function RateCalculator() {
  const [weight, setWeight] = useState(2) // kg
  const [category, setCategory] = useState('documents')
  const [urgency, setUrgency] = useState<'standard' | 'express'>('express')

  const currentCat = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0]

  const calculation = useMemo(() => {
    // CarryGo Peer-to-Peer Cost
    const multiplier = urgency === 'express' ? 1.2 : 1.0
    const carrygoEst = Math.round((currentCat.baseFee + weight * currentCat.ratePerKg) * multiplier)
    const travelerPayout = Math.round(carrygoEst * 0.82)
    const platformFee = carrygoEst - travelerPayout

    // Traditional Courier Benchmark Cost
    const courierBase = 320
    const courierRatePerKg = 110
    const courierMultiplier = urgency === 'express' ? 1.8 : 1.2
    const courierEst = Math.round((courierBase + weight * courierRatePerKg) * courierMultiplier)

    const savings = courierEst - carrygoEst
    const savingsPercent = Math.round((savings / courierEst) * 100)

    return {
      carrygoEst,
      courierEst,
      savings,
      savingsPercent,
      travelerPayout,
      platformFee,
    }
  }, [weight, currentCat, urgency])

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="relative rounded-3xl border border-slate-200/90 bg-gradient-to-b from-white via-slate-50/20 to-white overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Top Gradient Hairline Accent */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-500" />

        {/* Left Side: Interactive Controls */}
        <div className="lg:col-span-7 p-6 sm:p-8 space-y-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-3">
              <Coins className="w-3.5 h-3.5 text-emerald-600" />
              <span>Transparent Route Pricing Calculator</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
              See How Much You Save &amp; Travelers Earn
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
              Real peer-to-peer rates based on actual carrier routes. No hidden hub or sorting surcharges.
            </p>
          </div>

          {/* Weight Slider with Subtle Pattern */}
          <div className="space-y-3 rounded-2xl bg-gradient-to-b from-slate-50 to-white border border-slate-200/80 p-4 sm:p-5 relative overflow-hidden">
            <div className="absolute inset-0 pattern-dots opacity-20 pointer-events-none -z-10" />
            <div className="flex items-center justify-between">
              <label htmlFor="package-weight-slider" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Parcel Weight
              </label>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-extrabold font-mono text-emerald-700">{weight}</span>
                <span className="text-xs font-bold text-slate-500">KG</span>
              </div>
            </div>

            <input
              id="package-weight-slider"
              type="range"
              min="0.5"
              max="15"
              step="0.5"
              value={weight}
              onChange={(e) => setWeight(parseFloat(e.target.value))}
              className="w-full h-2 rounded-lg bg-slate-200 accent-emerald-600 cursor-pointer transition-all"
            />

            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span>0.5 kg (Document)</span>
              <span>5 kg (Shoebox)</span>
              <span>15 kg (Luggage)</span>
            </div>
          </div>

          {/* Parcel Category Selector */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Parcel Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon
                const isSelected = category === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`relative p-3 rounded-2xl border text-left transition-colors cursor-pointer flex items-center gap-2.5 ${
                      isSelected
                        ? 'border-emerald-500 text-emerald-950 font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {isSelected && (
                      <motion.span
                        layoutId="activeCategoryPill"
                        className="absolute inset-0 rounded-2xl bg-emerald-50 border border-emerald-400 shadow-2xs"
                        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                      />
                    )}
                    <Icon className={`relative z-10 w-4 h-4 shrink-0 ${isSelected ? 'text-emerald-700' : 'text-slate-500'}`} />
                    <span className="relative z-10 text-xs font-semibold truncate">{cat.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Urgency Selection with Sliding Pill */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Delivery Window
            </span>
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setUrgency('express')}
                className={`relative px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  urgency === 'express' ? 'text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {urgency === 'express' && (
                  <motion.span
                    layoutId="activeUrgencyPill"
                    className="absolute inset-0 rounded-lg bg-emerald-600 shadow-xs"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  />
                )}
                <Zap className="relative z-10 w-3.5 h-3.5 fill-current" />
                <span className="relative z-10">Same-Day Transit</span>
              </button>
              <button
                type="button"
                onClick={() => setUrgency('standard')}
                className={`relative px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  urgency === 'standard' ? 'text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {urgency === 'standard' && (
                  <motion.span
                    layoutId="activeUrgencyPill"
                    className="absolute inset-0 rounded-lg bg-emerald-600 shadow-xs"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  />
                )}
                <span className="relative z-10">Flexible (24h)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Cost Comparison & Savings Display with Micro-Grid */}
        <div className="lg:col-span-5 bg-gradient-to-b from-slate-50/90 via-emerald-50/20 to-slate-50 border-t lg:border-t-0 lg:border-l border-slate-200/90 p-6 sm:p-8 flex flex-col justify-between space-y-6 relative overflow-hidden">
          <div className="absolute inset-0 pattern-grid opacity-30 pointer-events-none -z-10" />
          <div className="space-y-5 relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Cost Comparison
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                Save {calculation.savingsPercent}%
              </span>
            </div>

            {/* CarryGo Price Card with Smooth Value Spring & Gradient */}
            <div className="rounded-2xl bg-gradient-to-br from-white via-emerald-50/50 to-teal-50/30 border-2 border-emerald-500/40 p-4 sm:p-5 relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-emerald-800 font-bold">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" /> CarryGo Peer-to-Peer
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] border border-emerald-200">
                  Same-Day Delivery
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <motion.span
                  key={calculation.carrygoEst}
                  initial={{ opacity: 0.7, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  className="text-3xl sm:text-4xl font-heading font-extrabold text-slate-900 tabular-nums"
                >
                  ₹{calculation.carrygoEst}
                </motion.span>
                <span className="text-xs text-slate-500">all-inclusive</span>
              </div>
              <div className="mt-2 text-[11px] text-emerald-700 font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Handed over directly in 3 to 6 hours</span>
              </div>
            </div>

            {/* Courier Benchmark */}
            <div className="rounded-2xl bg-white border border-slate-200 p-4 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span>Traditional Courier (DTDC / Bluedart)</span>
                <span className="text-slate-400 line-through font-bold text-sm">
                  ₹{calculation.courierEst}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                Takes 2 to 4 days • Multiple sorting warehouses
              </div>
            </div>

            {/* Breakdown & Payout Transparency */}
            <div className="space-y-2 pt-2 border-t border-slate-200 text-xs">
              <div className="flex items-center justify-between text-slate-700 font-medium">
                <span className="flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-sky-600" /> Traveler Earnings (UPI):
                </span>
                <span className="font-mono font-bold text-emerald-700">₹{calculation.travelerPayout}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Escrow &amp; Insurance Protection:
                </span>
                <span className="font-mono font-bold text-slate-900">₹{calculation.platformFee}</span>
              </div>
            </div>
          </div>

          {/* Action CTA */}
          <div>
            <Link
              href={`/create-parcel?weight=${weight}&category=${category}&price=${calculation.carrygoEst}&urgency=${urgency}`}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm text-white bg-emerald-700 hover:bg-emerald-800 shadow-xs transition-all active:scale-[0.98] cursor-pointer"
            >
              <span>Post This Parcel for ₹{calculation.carrygoEst}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="text-[10px] text-center text-slate-500 mt-2">
              Free to post • Pay only when traveler accepts and is verified
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
