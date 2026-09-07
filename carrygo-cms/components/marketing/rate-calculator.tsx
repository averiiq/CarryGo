'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Coins,
  IndianRupee,
  Layers,
  Percent,
  ShieldCheck,
  TrendingDown,
  Zap,
} from 'lucide-react'

const CATEGORIES = [
  { id: 'documents', label: 'Documents', baseFee: 120, ratePerKg: 40 },
  { id: 'electronics', label: 'Electronics', baseFee: 200, ratePerKg: 80 },
  { id: 'clothing', label: 'Clothing & Gifts', baseFee: 150, ratePerKg: 50 },
  { id: 'medicine', label: 'Medicine / Urgent', baseFee: 180, ratePerKg: 60 },
  { id: 'other', label: 'General / Other', baseFee: 140, ratePerKg: 50 },
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
      <div className="rounded-3xl bg-surface border border-border shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Left Side: Interactive Controls */}
        <div className="lg:col-span-7 p-6 sm:p-8 space-y-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary-subtle text-primary border border-primary/20 mb-3">
              <Coins className="w-3.5 h-3.5" />
              <span>Transparent Pricing Calculator</span>
            </div>
            <h3 className="text-2xl font-heading font-bold text-foreground">
              Calculate Delivery Cost &amp; Traveler Payout
            </h3>
            <p className="text-sm text-muted mt-1">
              Move parcels affordably with travelers already commuting on your route.
            </p>
          </div>

          {/* Weight Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="package-weight-slider" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Package Weight
              </label>
              <span className="text-base font-heading font-bold text-primary">
                {weight} {weight === 1 ? 'kg' : 'kg'}
              </span>
            </div>
            <input
              id="package-weight-slider"
              type="range"
              min="0.5"
              max="15"
              step="0.5"
              value={weight}
              onChange={(e) => setWeight(parseFloat(e.target.value))}
              aria-label="Package weight in kilograms"
              className="w-full h-2 rounded-lg bg-surface-elevated appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[11px] text-muted">
              <span>0.5 kg (Small envelope)</span>
              <span>5 kg (Shoebox)</span>
              <span>15 kg (Suitcase parcel)</span>
            </div>
          </div>

          {/* Category Selectors */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Item Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold border text-left transition cursor-pointer ${
                    category === cat.id
                      ? 'border-primary bg-primary-subtle text-primary shadow-xs'
                      : 'border-border bg-background text-muted hover:border-primary/40 hover:text-foreground'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Speed / Urgency */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Timeline Window
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUrgency('express')}
                className={`flex items-center gap-2 p-3 rounded-2xl border text-left transition cursor-pointer ${
                  urgency === 'express'
                    ? 'border-primary bg-primary-subtle text-primary'
                    : 'border-border bg-background text-muted'
                }`}
              >
                <Zap className="w-4 h-4 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-foreground">Same-Day / Next-Day</div>
                  <div className="text-[10px] text-muted">Handed over directly on route</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setUrgency('standard')}
                className={`flex items-center gap-2 p-3 rounded-2xl border text-left transition cursor-pointer ${
                  urgency === 'standard'
                    ? 'border-primary bg-primary-subtle text-primary'
                    : 'border-border bg-background text-muted'
                }`}
              >
                <Clock className="w-4 h-4 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-foreground">Flexible Window (2–3 Days)</div>
                  <div className="text-[10px] text-muted">Matches weekend trips</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Price Comparison Card */}
        <div className="lg:col-span-5 bg-surface-elevated p-6 sm:p-8 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-border">
          <div className="space-y-5">
            {/* Big Price Headline */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Estimated Delivery Fare
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl sm:text-5xl font-heading font-extrabold text-foreground tracking-tight">
                  ₹{calculation.carrygoEst}
                </span>
                <span className="text-xs font-medium text-muted">total all-inclusive</span>
              </div>
            </div>

            {/* Savings Pill */}
            <div className="p-3.5 rounded-2xl bg-success-subtle border border-success/20 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-success font-bold">
                <TrendingDown className="w-4 h-4 shrink-0" />
                <span>Save ~₹{calculation.savings} ({calculation.savingsPercent}%)</span>
              </div>
              <span className="text-muted text-[11px] line-through">
                ₹{calculation.courierEst} Courier
              </span>
            </div>

            {/* Breakdown List */}
            <div className="space-y-2.5 pt-2 border-t border-border/80 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted">Traveler Fuel/Ticket Payout</span>
                <span className="font-semibold text-foreground">₹{calculation.travelerPayout}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Escrow Protection &amp; Protocol Fee</span>
                <span className="font-semibold text-foreground">₹{calculation.platformFee}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Estimated Delivery Speed</span>
                <span className="font-semibold text-primary">Same-Day / Next-Day</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Traditional Courier Speed</span>
                <span className="text-muted-foreground">3 to 5 business days</span>
              </div>
            </div>

            {/* Trust Bullet */}
            <div className="flex items-center gap-2 text-xs text-muted pt-2">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
              <span>Funds held securely in escrow until recipient verifies OTP drop</span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="pt-6 space-y-2">
            <Link
              href={`/create-parcel?weight=${weight}&category=${category}`}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary-hover shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              <span>Post Delivery Request</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/create-trip"
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-muted hover:text-foreground hover:bg-surface transition"
            >
              <span>Have extra luggage space? Travel &amp; Earn ₹{calculation.travelerPayout}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
