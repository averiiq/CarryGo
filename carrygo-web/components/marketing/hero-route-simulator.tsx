'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  Car,
  CheckCircle2,
  Clock,
  Compass,
  KeyRound,
  Lock,
  Navigation,
  Plane,
  ShieldCheck,
  Sparkles,
  Star,
  Train,
  Truck,
  Zap,
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { getRouteEstimate } from '@/lib/indian-cities'
import { InteractiveRouteFlow } from '@/components/marketing/interactive-route-flow'

type LiveCorridor = {
  id: string
  from: string
  to: string
  distance: string
  duration: string
  vehicle: 'car' | 'train' | 'flight'
  traveler: {
    name: string
    avatar: string
    rating: number
    vehicleDetail: string
    spaceAvailable: string
    ratePerKg: number
    eta: string
    verified: boolean
  }
}

export function HeroRouteSimulator() {
  const [corridors, setCorridors] = useState<LiveCorridor[]>([])
  const [activeCorridorId, setActiveCorridorId] = useState<string>('')
  const [isLoadingLive, setIsLoadingLive] = useState(true)

  // Fetch real active trips from /api/public/trips on mount
  useEffect(() => {
    const fetchLiveTrips = async () => {
      try {
        const res = await fetch('/api/public/trips?limit=6')
        const json = await res.json()
        const data = json.trips || []

        if (Array.isArray(data) && data.length > 0) {
          const mapped: LiveCorridor[] = data.map((t: any) => {
            const estimate = getRouteEstimate(t.from_city, t.to_city)
            const vehicle =
              t.vehicle_type === 'flight'
                ? 'flight'
                : t.vehicle_type === 'train'
                ? 'train'
                : 'car'

            const initials = (t.user_name || 'Traveler')
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)

            return {
              id: t.id,
              from: t.from_city,
              to: t.to_city,
              distance: estimate ? `${estimate.distanceKm} km` : 'Direct Route',
              duration: estimate
                ? vehicle === 'flight'
                  ? `~${estimate.flightHours || 1.5}h air`
                  : vehicle === 'train'
                  ? `~${estimate.trainHours}h rail`
                  : `~${estimate.driveHours}h road`
                : 'Same Day',
              vehicle,
              traveler: {
                name: t.user_name || 'Verified Traveler',
                avatar: initials || 'CG',
                rating: Number(t.user_rating) || 4.9,
                vehicleDetail:
                  vehicle === 'flight'
                    ? 'Cabin Luggage Space'
                    : vehicle === 'train'
                    ? 'Confirmed Seat Luggage'
                    : 'Personal Vehicle Trunk',
                spaceAvailable: `${t.available_capacity} kg open`,
                ratePerKg: Number(t.price_per_kg) || 45,
                eta: t.time ? `Departing at ${t.time}` : t.date || 'Departing Soon',
                verified: true,
              },
            }
          })

          setCorridors(mapped)
          setActiveCorridorId(mapped[0].id)
        } else {
          setCorridors([])
        }
      } catch {
        setCorridors([])
      } finally {
        setIsLoadingLive(false)
      }
    }

    void fetchLiveTrips()
  }, [])

  if (isLoadingLive || corridors.length === 0) {
    return <InteractiveRouteFlow />
  }

  const activeCorridor =
    corridors.find((c) => c.id === activeCorridorId) || corridors[0]

  const VehicleIcon =
    activeCorridor.vehicle === 'flight'
      ? Plane
      : activeCorridor.vehicle === 'train'
      ? Train
      : Car

  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* Main Glass HUD Container */}
      <div className="relative rounded-3xl border border-slate-200/90 bg-gradient-to-b from-white via-slate-50/30 to-white p-5 sm:p-6 overflow-hidden">
        {/* Top Gradient Hairline Accent */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-sky-500 via-teal-400 to-emerald-500" />
        <div className="absolute inset-0 pattern-dots opacity-30 pointer-events-none -z-10" />
        {/* Header Strip with Live Status */}
        <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="status-beacon" />
            <span className="text-xs font-bold tracking-wider uppercase text-emerald-700">
              Live Corridor Radar
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700">
            <Clock className="w-3 h-3 text-sky-600" />
            <span>Avg Match: 12 mins</span>
          </div>
        </div>

        {/* Interactive Corridor Selector Pills with Smooth Sliding Pill */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {corridors.map((c) => {
            const isSelected = c.id === activeCorridor.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCorridorId(c.id)}
                className={`relative px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  isSelected
                    ? 'text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-900'
                }`}
              >
                {isSelected && (
                  <motion.span
                    layoutId="heroCorridorActivePill"
                    className="absolute inset-0 rounded-xl bg-emerald-700 shadow-xs"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{c.from} ➔ {c.to}</span>
              </button>
            )
          })}
        </div>

        {/* Active Corridor Card HUD with AnimatePresence */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCorridor.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="mt-4 p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4"
          >
            {/* Top route & distance stats */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg sm:text-xl font-heading font-extrabold text-slate-900">
                    {activeCorridor.from}
                  </span>
                  <span className="text-emerald-600 font-bold">➔</span>
                  <span className="text-lg sm:text-xl font-heading font-extrabold text-slate-900">
                    {activeCorridor.to}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                  <span className="font-semibold text-slate-700">{activeCorridor.distance}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-sky-600" />
                    {activeCorridor.duration}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <VehicleIcon className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800 capitalize">
                  {activeCorridor.vehicle}
                </span>
              </div>
            </div>

            {/* Traveler Info Box */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center border border-emerald-200">
                  {activeCorridor.traveler.avatar}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900">
                      {activeCorridor.traveler.name}
                    </span>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                      KYC
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                    <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                      <Star className="w-3 h-3 fill-current" />
                      {activeCorridor.traveler.rating}
                    </span>
                    <span>•</span>
                    <span>{activeCorridor.traveler.vehicleDetail}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Capacity</span>
                <span className="text-xs font-bold font-mono text-emerald-700">
                  {activeCorridor.traveler.spaceAvailable}
                </span>
              </div>
            </div>

            {/* Pricing & Departure Pill */}
            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center gap-1.5 text-slate-600">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-semibold">{activeCorridor.traveler.eta}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-slate-400 text-[11px]">Starting from</span>
                <span className="text-base font-extrabold font-heading text-slate-900">
                  ₹{activeCorridor.traveler.ratePerKg}
                </span>
                <span className="text-[10px] text-slate-500">/kg</span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Dual-OTP Escrow Trust Guarantee */}
        <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <KeyRound className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-[11px]">Dual Golden Handshake OTP</p>
              <p className="text-[10px] text-slate-500">Private 4-digit code at pickup &amp; delivery</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700">
            <Lock className="w-3 h-3 text-emerald-600" />
            <span>SafeVault™</span>
          </div>
        </div>

        {/* Action Button: Directly matches with route */}
        <div className="mt-4 flex items-center gap-2">
          <Link
            href={`/search?from=${encodeURIComponent(activeCorridor.from)}&to=${encodeURIComponent(
              activeCorridor.to
            )}&type=trips`}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
          >
            <span>Match Travelers on {activeCorridor.from} → {activeCorridor.to}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          <Link
            href={`/create-parcel?from=${encodeURIComponent(activeCorridor.from)}&to=${encodeURIComponent(
              activeCorridor.to
            )}`}
            className="px-4 py-3 rounded-2xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all cursor-pointer whitespace-nowrap"
            title="Post a parcel on this route"
          >
            Send Parcel
          </Link>
        </div>
      </div>
    </div>
  )
}
