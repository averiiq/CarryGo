'use client'

import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Clock,
  ShieldCheck,
  Zap,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'

interface CorridorPreset {
  id: string
  name: string
  from: string
  to: string
  via: string
  distanceKm: number
  driveHours: string
  courierHours: string
  carryGoCost: number
  courierCost: number
  vehicleType: 'car' | 'train' | 'flight'
  activeTravelers: number
}

const PRESETS: CorridorPreset[] = [
  {
    id: 'corridor-1',
    name: 'Capital Expressway',
    from: 'Gurugram',
    to: 'Rohtak',
    via: 'Jhajjar Corridor',
    distanceKm: 78,
    driveHours: '1h 30m',
    courierHours: '24-48h',
    carryGoCost: 110,
    courierCost: 380,
    vehicleType: 'car',
    activeTravelers: 14,
  },
  {
    id: 'corridor-2',
    name: 'Grand Trunk Highway',
    from: 'Panipat',
    to: 'Ambala Cantt',
    via: 'Karnal & Kurukshetra',
    distanceKm: 122,
    driveHours: '2h 10m',
    courierHours: '36h',
    carryGoCost: 140,
    courierCost: 460,
    vehicleType: 'car',
    activeTravelers: 19,
  },
  {
    id: 'corridor-3',
    name: 'NCR Southern Spine',
    from: 'Faridabad',
    to: 'Hisar',
    via: 'Rohtak Bypass',
    distanceKm: 185,
    driveHours: '3h 15m',
    courierHours: '48h',
    carryGoCost: 190,
    courierCost: 580,
    vehicleType: 'train',
    activeTravelers: 8,
  },
]

export function InteractiveRouteFlow() {
  const [selectedPreset, setSelectedPreset] = useState<CorridorPreset>(PRESETS[0])
  const shouldReduceMotion = useReducedMotion()

  return (
    <div className="relative w-full max-w-xl mx-auto">
      <div className="relative rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xl overflow-hidden">
        {/* Header Strip: Live Radar & Active Traveler Counter */}
        <div className="flex items-center justify-between gap-3 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Live Transit Radar
              </p>
              <p className="text-[11px] text-slate-500 font-medium">Haryana Commuter Network</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50/90 border border-emerald-200/80 text-emerald-800 text-xs font-semibold">
            <span className="font-mono font-bold">{selectedPreset.activeTravelers}</span>
            <span>travelers en route</span>
          </div>
        </div>

        {/* Corridor Route Tabs - Crisp Light Styling */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          {PRESETS.map((preset) => {
            const isSelected = preset.id === selectedPreset.id
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setSelectedPreset(preset)}
                className={`px-2.5 py-2 rounded-xl text-left transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-emerald-50/60 hover:text-emerald-900'
                }`}
              >
                <p className="text-[11px] font-bold truncate">
                  {preset.from} → {preset.to}
                </p>
                <p
                  className={`text-[10px] mt-0.5 truncate ${
                    isSelected ? 'text-emerald-100 font-medium' : 'text-slate-500'
                  }`}
                >
                  {preset.distanceKm} km • {preset.driveHours}
                </p>
              </button>
            )
          })}
        </div>

        {/* SVG Route Visualizer - Crisp Light Design */}
        <div className="relative mt-6 rounded-2xl bg-gradient-to-b from-slate-50/90 via-emerald-50/20 to-white p-5 text-slate-900 border border-slate-200/90 shadow-2xs overflow-hidden">
          {/* Subtle grid background */}
          <div
            className="absolute inset-0 opacity-[0.35] pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, #cbd5e1 1px, transparent 0)',
              backgroundSize: '16px 16px',
            }}
          />

          {/* Top route metadata */}
          <div className="relative z-10 flex items-center justify-between text-xs pb-3 border-b border-slate-200/80">
            <span className="flex items-center gap-1.5 font-bold text-emerald-800">
              <Zap className="w-3.5 h-3.5 text-emerald-600" />
              Direct Commuter Transit
            </span>
            <span className="font-mono text-[11px] text-slate-600 font-medium">
              Via: {selectedPreset.via}
            </span>
          </div>

          {/* Route Graphic */}
          <div className="relative z-10 py-5 px-2">
            <svg
              viewBox="0 0 460 90"
              className="w-full h-24 overflow-visible"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Background transit rail line */}
              <path
                d="M 40 45 C 150 15, 310 75, 420 45"
                stroke="#cbd5e1"
                strokeWidth="2.5"
                strokeDasharray="4 4"
              />

              {/* Glowing active animated route laser */}
              <motion.path
                d="M 40 45 C 150 15, 310 75, 420 45"
                stroke="url(#routeLaserGradient)"
                strokeWidth="3"
                strokeLinecap="round"
                initial={shouldReduceMotion ? false : { pathLength: 0 }}
                animate={{ pathLength: [0, 1] }}
                transition={{
                  duration: 2.8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />

              {/* Gradient definition */}
              <defs>
                <linearGradient id="routeLaserGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#059669" />
                  <stop offset="50%" stopColor="#0284c7" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
                <radialGradient id="pulseGlowLight" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#059669" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#059669" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Origin Node */}
              <g transform="translate(40, 45)">
                <circle r="16" fill="url(#pulseGlowLight)" />
                <circle r="6" fill="#059669" />
                <circle r="2.5" fill="#ffffff" />
                <text
                  x="0"
                  y="-14"
                  textAnchor="middle"
                  fill="#0f172a"
                  fontSize="12"
                  fontWeight="bold"
                >
                  {selectedPreset.from}
                </text>
                <text x="0" y="22" textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="500">
                  Pickup Hub
                </text>
              </g>

              {/* Traveling Packet (Light Courier Particle) */}
              {!shouldReduceMotion && (
                <motion.g
                  animate={{
                    offsetDistance: ['0%', '100%'],
                  }}
                  transition={{
                    duration: 3.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  style={{
                    offsetPath: 'path("M 40 45 C 150 15, 310 75, 420 45")',
                  }}
                >
                  <circle r="6" fill="#0284c7" opacity="0.4" />
                  <circle r="3.5" fill="#0284c7" />
                  <circle r="1.5" fill="#ffffff" />
                </motion.g>
              )}

              {/* Destination Node */}
              <g transform="translate(420, 45)">
                <circle r="16" fill="url(#pulseGlowLight)" />
                <circle r="6" fill="#0284c7" />
                <circle r="2.5" fill="#ffffff" />
                <text
                  x="0"
                  y="-14"
                  textAnchor="middle"
                  fill="#0f172a"
                  fontSize="12"
                  fontWeight="bold"
                >
                  {selectedPreset.to}
                </text>
                <text x="0" y="22" textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="500">
                  Handover Hub
                </text>
              </g>
            </svg>
          </div>

          {/* Delivery Speed vs Traditional Courier Telemetry - Light Styling */}
          <div className="relative z-10 grid grid-cols-2 gap-3 pt-3 border-t border-slate-200/80 text-xs">
            <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-emerald-800 text-[11px] mb-1 font-semibold">
                <span>CarryGo Commuter</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-200/70 text-emerald-900 font-bold text-[10px]">
                  Same-Day
                </span>
              </div>
              <p className="text-base font-extrabold text-emerald-950 font-heading">
                {selectedPreset.driveHours}
              </p>
              <p className="text-[11px] text-emerald-700 font-bold mt-0.5">
                ~₹{selectedPreset.carryGoCost} via UPI
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-[11px] mb-1">
                <span>Legacy Courier</span>
                <span className="text-rose-600 font-semibold text-[10px]">2-3 Days</span>
              </div>
              <p className="text-base font-bold text-slate-700 font-heading">
                {selectedPreset.courierHours}
              </p>
              <p className="text-[11px] text-slate-400 line-through mt-0.5">
                ~₹{selectedPreset.courierCost} standard
              </p>
            </div>
          </div>
        </div>

        {/* Security & Verification Callout */}
        <div className="mt-5 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-slate-700">Aadhaar + Dual OTP Handshake</span>
          </div>

          <Link
            href="/search"
            className="inline-flex items-center gap-1.5 font-bold text-emerald-700 hover:text-emerald-800 transition cursor-pointer"
          >
            <span>View All Trips</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
