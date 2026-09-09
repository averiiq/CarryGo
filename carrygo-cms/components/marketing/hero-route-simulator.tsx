'use client'

import { useState } from 'react'
import {
  Car,
  CheckCircle2,
  Clock,
  KeyRound,
  Lock,
  Navigation,
  Plane,
  ShieldCheck,
  Train,
  Unlock,
  Zap,
} from 'lucide-react'

type Corridor = {
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
    trips: number
    vehicleDetail: string
    spaceAvailable: string
    ratePerKg: number
    eta: string
  }
}

const CORRIDORS: Corridor[] = [
  {
    id: 'mumbai-pune',
    from: 'Mumbai',
    to: 'Pune',
    distance: '148 km',
    duration: '2h 45m',
    vehicle: 'car',
    traveler: {
      name: 'Aditya S.',
      avatar: 'AS',
      rating: 4.9,
      trips: 38,
      vehicleDetail: 'Sedan Trunk Space',
      spaceAvailable: '8 kg space',
      ratePerKg: 50,
      eta: 'Departs in 35m',
    },
  },
  {
    id: 'delhi-jaipur',
    from: 'Delhi',
    to: 'Jaipur',
    distance: '280 km',
    duration: '4h 15m',
    vehicle: 'train',
    traveler: {
      name: 'Pooja M.',
      avatar: 'PM',
      rating: 5.0,
      trips: 64,
      vehicleDetail: 'Vande Bharat Express',
      spaceAvailable: '10 kg space',
      ratePerKg: 60,
      eta: 'Departs 4:00 PM',
    },
  },
  {
    id: 'blr-hyd',
    from: 'Bangalore',
    to: 'Hyderabad',
    distance: '570 km',
    duration: '1h 20m',
    vehicle: 'flight',
    traveler: {
      name: 'Vikram R.',
      avatar: 'VR',
      rating: 4.9,
      trips: 52,
      vehicleDetail: 'Cabin Luggage Space',
      spaceAvailable: '5 kg space',
      ratePerKg: 110,
      eta: 'Flight at 6:30 PM',
    },
  },
]

export function HeroRouteSimulator() {
  const [activeCorridorId, setActiveCorridorId] = useState('mumbai-pune')
  const [simulatingOtp, setSimulatingOtp] = useState(false)
  const [otpStep, setOtpStep] = useState<1 | 2 | 3>(1)

  const activeCorridor =
    CORRIDORS.find((c) => c.id === activeCorridorId) || CORRIDORS[0]

  const handleSimulateOtp = () => {
    setSimulatingOtp(true)
    setOtpStep(1)
    setTimeout(() => setOtpStep(2), 1200)
    setTimeout(() => setOtpStep(3), 2600)
  }

  const handleResetSimulation = () => {
    setSimulatingOtp(false)
    setOtpStep(1)
  }

  const VehicleIcon =
    activeCorridor.vehicle === 'flight'
      ? Plane
      : activeCorridor.vehicle === 'train'
      ? Train
      : Car

  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* Background ambient lighting */}
      <div className="absolute -top-10 -right-10 w-64 h-64 bg-emerald-400/10 blur-[80px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-sky-400/10 blur-[80px] rounded-full pointer-events-none" />

      {/* Main Glass HUD Container */}
      <div className="relative rounded-3xl border border-slate-200/80 bg-white/95 backdrop-blur-xl p-5 sm:p-6 shadow-xl overflow-hidden">
        {/* Subtle top edge highlight */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500" />

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
          {CORRIDORS.map((c) => {
            const isSelected = c.id === activeCorridor.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setActiveCorridorId(c.id)
                  handleResetSimulation()
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs'
                    : 'bg-slate-100 text-slate-600 border border-transparent hover:text-slate-900 hover:bg-slate-200/80'
                }`}
              >
                {c.from} ➔ {c.to}
              </button>
            )
          })}
        </div>

        {/* Dynamic Route Arc & Node Visualization */}
        <div className="mt-5 relative rounded-2xl bg-slate-50 border border-slate-200/70 p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
            <span className="font-bold text-slate-900 flex items-center gap-1">
              <Navigation className="w-3.5 h-3.5 text-emerald-600" />
              <span>{activeCorridor.from}</span>
            </span>
            <span className="text-[11px] text-sky-700 font-mono font-bold">
              {activeCorridor.distance} • {activeCorridor.duration}
            </span>
            <span className="font-bold text-slate-900">
              {activeCorridor.to}
            </span>
          </div>

          {/* Animated Route Line */}
          <div className="relative h-12 flex items-center">
            <svg className="w-full h-10 overflow-visible" viewBox="0 0 320 40">
              <defs>
                <linearGradient id="routeGradientLight" x1="0" y1="0" x2="320" y2="0" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#059669" />
                  <stop offset="0.5" stopColor="#0284C7" />
                  <stop offset="1" stopColor="#059669" />
                </linearGradient>
              </defs>
              {/* Background trace line */}
              <path
                d="M 15 20 Q 160 -5 305 20"
                fill="none"
                stroke="rgba(15, 23, 42, 0.12)"
                strokeWidth="2"
              />
              {/* Active animated dashed line */}
              <path
                d="M 15 20 Q 160 -5 305 20"
                fill="none"
                stroke="url(#routeGradientLight)"
                strokeWidth="2.5"
                className="animate-route-dash"
              />
              {/* Origin Circle */}
              <circle cx="15" cy="20" r="5" fill="#059669" />
              <circle cx="15" cy="20" r="9" fill="rgba(5, 150, 105, 0.2)" className="animate-pulse" />
              {/* Mid-Transit Vehicle Badge */}
              <circle cx="160" cy="7" r="11" fill="#FFFFFF" stroke="#0284C7" strokeWidth="2" />
              {/* Destination Circle */}
              <circle cx="305" cy="20" r="5" fill="#0284C7" />
              <circle cx="305" cy="20" r="9" fill="rgba(2, 132, 199, 0.2)" className="animate-pulse" />
            </svg>

            {/* Icon centered on the middle SVG node */}
            <div className="absolute left-1/2 -translate-x-1/2 -translate-y-2.5 pointer-events-none">
              <VehicleIcon className="w-3.5 h-3.5 text-sky-600" />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-medium">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Pickup Point
            </span>
            <span className="text-emerald-700 font-semibold">In Transit via Expressway</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-600" /> Dropoff Point
            </span>
          </div>
        </div>

        {/* Live Traveler Card */}
        <div className="mt-4 rounded-2xl bg-white border border-slate-200 p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-sm flex items-center justify-center">
                  {activeCorridor.traveler.avatar}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                  <ShieldCheck className="w-3 h-3" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-slate-900">
                    {activeCorridor.traveler.name}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                    Aadhaar KYC
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {activeCorridor.traveler.vehicleDetail} • {activeCorridor.traveler.rating} ★ ({activeCorridor.traveler.trips} reviews)
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm font-extrabold text-slate-900">
                ₹{activeCorridor.traveler.ratePerKg}
                <span className="text-[10px] text-slate-500 font-normal">/kg</span>
              </div>
              <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                {activeCorridor.traveler.spaceAvailable}
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Dual-OTP Security Demonstration */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          {!simulatingOtp ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Dual-OTP Guarantee</div>
                  <div className="text-[11px] text-slate-500">See how secure handover works</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSimulateOtp}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:brightness-105 shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Test Live Handover</span>
              </button>
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-50 border border-emerald-300 p-3.5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Dual-OTP Handover Simulator</span>
                </span>
                <button
                  type="button"
                  onClick={handleResetSimulation}
                  className="text-[11px] text-slate-500 hover:text-slate-900 underline cursor-pointer"
                >
                  Reset
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                {/* Step 1: Pickup OTP */}
                <div
                  className={`p-2.5 rounded-xl border transition-all ${
                    otpStep >= 1
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-white border-slate-200 text-slate-400'
                  }`}
                >
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">
                    1. Pickup OTP
                  </div>
                  <div className="font-mono text-sm font-extrabold tracking-widest text-emerald-800">
                    8 4 1 9
                  </div>
                  <div className="text-[9px] text-emerald-700 font-semibold mt-1 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Sender Verified</span>
                  </div>
                </div>

                {/* Step 2: Delivery OTP */}
                <div
                  className={`p-2.5 rounded-xl border transition-all ${
                    otpStep >= 3
                      ? 'bg-sky-50 border-sky-300 text-sky-900'
                      : 'bg-white border-slate-200 text-slate-400'
                  }`}
                >
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">
                    2. Dropoff OTP
                  </div>
                  <div className="font-mono text-sm font-extrabold tracking-widest text-sky-800">
                    {otpStep >= 3 ? '2 0 7 3' : '• • • •'}
                  </div>
                  <div className="text-[9px] text-sky-700 font-semibold mt-1 flex items-center justify-center gap-1">
                    {otpStep >= 3 ? (
                      <>
                        <Unlock className="w-3 h-3" />
                        <span>Escrow Released</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3" />
                        <span>Locked in Escrow</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress message */}
              <p className="text-[10px] text-center text-slate-600 font-medium mt-2.5">
                {otpStep === 1 && 'Traveler enters pickup code at sender doorstep...'}
                {otpStep === 2 && 'Package in transit. Payout securely held in smart escrow...'}
                {otpStep === 3 && '✓ Recipient provided OTP! ₹380 instantly deposited to traveler UPI.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
