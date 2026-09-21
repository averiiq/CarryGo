'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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

const DEFAULT_HARYANA_CORRIDORS: LiveCorridor[] = [
  {
    id: 'corridor-ggn-fbd',
    from: 'Gurugram',
    to: 'Faridabad',
    distance: '38 km',
    duration: '~55m road',
    vehicle: 'car',
    traveler: {
      name: 'Vikas Sharma',
      avatar: 'VS',
      rating: 4.9,
      vehicleDetail: 'Personal Sedan Trunk',
      spaceAvailable: '8 kg open',
      ratePerKg: 35,
      eta: 'Departing today at 4:30 PM',
      verified: true,
    },
  },
  {
    id: 'corridor-ggn-panipat',
    from: 'Gurugram',
    to: 'Panipat',
    distance: '115 km',
    duration: '~2.1h road',
    vehicle: 'car',
    traveler: {
      name: 'Amit Dahiya',
      avatar: 'AD',
      rating: 5.0,
      vehicleDetail: 'SUV Boot Space',
      spaceAvailable: '12 kg open',
      ratePerKg: 50,
      eta: 'Departing today at 6:00 PM',
      verified: true,
    },
  },
  {
    id: 'corridor-ambala-karnal',
    from: 'Ambala',
    to: 'Karnal',
    distance: '85 km',
    duration: '~1.2h rail',
    vehicle: 'train',
    traveler: {
      name: 'Pooja Verma',
      avatar: 'PV',
      rating: 4.8,
      vehicleDetail: 'Vande Bharat Express Luggage',
      spaceAvailable: '6 kg open',
      ratePerKg: 45,
      eta: 'Departing today at 5:15 PM',
      verified: true,
    },
  },
  {
    id: 'corridor-rohtak-hisar',
    from: 'Rohtak',
    to: 'Hisar',
    distance: '98 km',
    duration: '~1.5h road',
    vehicle: 'car',
    traveler: {
      name: 'Sandeep Malik',
      avatar: 'SM',
      rating: 4.9,
      vehicleDetail: 'Hatchback Luggage Space',
      spaceAvailable: '10 kg open',
      ratePerKg: 40,
      eta: 'Departing today at 7:00 PM',
      verified: true,
    },
  },
  {
    id: 'corridor-panchkula-ambala',
    from: 'Panchkula',
    to: 'Ambala',
    distance: '45 km',
    duration: '~45m road',
    vehicle: 'car',
    traveler: {
      name: 'Ritu Saini',
      avatar: 'RS',
      rating: 5.0,
      vehicleDetail: 'Compact Car Trunk',
      spaceAvailable: '5 kg open',
      ratePerKg: 35,
      eta: 'Departing today at 3:45 PM',
      verified: true,
    },
  },
]

export function HeroRouteSimulator() {
  const [corridors, setCorridors] = useState<LiveCorridor[]>(DEFAULT_HARYANA_CORRIDORS)
  const [activeCorridorId, setActiveCorridorId] = useState<string>('corridor-ggn-fbd')
  const [isLoadingLive, setIsLoadingLive] = useState(false)

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
        }
      } catch {
        // Retain default Haryana corridors on network error
      }
    }

    void fetchLiveTrips()
  }, [])

  if (isLoadingLive) {
    return (
      <div className="relative w-full max-w-lg mx-auto">
        <div className="rounded-3xl border border-slate-200 bg-white/95 p-8 text-center space-y-3 shadow-xl">
          <div className="w-8 h-8 mx-auto border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Scanning live transit corridors...</p>
        </div>
      </div>
    )
  }

  if (corridors.length === 0) {
    return (
      <div className="relative w-full max-w-lg mx-auto">
        <div className="rounded-3xl border border-slate-200 bg-white/95 backdrop-blur-xl p-8 text-center shadow-xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-heading font-bold text-slate-900">Live Travel Radar</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No active community journeys are departing right now. List your journey or request a delivery to match with travelers.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <Link href="/create-trip" className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition">
              Post a Journey
            </Link>
            <Link href="/create-parcel" className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 transition">
              Send a Parcel
            </Link>
          </div>
        </div>
      </div>
    )
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
      <div className="relative rounded-3xl border border-slate-200/80 bg-white shadow-xl p-5 sm:p-6 overflow-hidden">
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

        {/* Interactive Corridor Selector Pills */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {corridors.map((c) => {
            const isSelected = c.id === activeCorridor.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCorridorId(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {c.from} ➔ {c.to}
              </button>
            )
          })}
        </div>

        {/* Active Corridor Card HUD */}
        <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
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
        </div>

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
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold text-white bg-slate-900 hover:bg-emerald-600 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
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
