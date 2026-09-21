'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Navigation, Clock, ShieldCheck, Zap } from 'lucide-react'

interface RouteCorridorIllustrationProps {
  fromCity?: string
  toCity?: string
  duration?: string
  distance?: string
  className?: string
}

export function RouteCorridorIllustration({
  fromCity = 'Gurugram',
  toCity = 'Panipat',
  duration = '1h 45m',
  distance = '112 km',
  className = '',
}: RouteCorridorIllustrationProps) {
  const [activeSpeed, setActiveSpeed] = useState<'normal' | 'express'>('normal')

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-surface via-surface-elevated/60 to-surface p-5 sm:p-6 shadow-bento ${className}`}
    >
      {/* Background Cyber Grid */}
      <div className="cyber-grid opacity-50" />

      {/* Header Info Pill */}
      <div className="relative z-10 flex items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-700">
            Live Travel Pathway
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-muted">
          <Clock className="h-3.5 w-3.5 text-sky-600" />
          <span>{duration} Transit</span>
          <span className="text-border-strong">•</span>
          <span>{distance}</span>
        </div>
      </div>

      {/* Main SVG Vector Canvas */}
      <div className="relative z-10 my-6 flex items-center justify-center">
        <svg
          viewBox="0 0 460 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full max-w-lg h-auto"
        >
          {/* Subtle Topography Terrain Lines */}
          <path
            d="M20 140C80 120 140 145 220 135C300 125 360 140 440 130"
            stroke="rgba(148, 163, 184, 0.15)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <path
            d="M20 90C90 105 160 85 240 95C320 105 380 90 440 100"
            stroke="rgba(148, 163, 184, 0.12)"
            strokeWidth="1.5"
          />

          {/* Primary Route Highway Curve (Backdrop) */}
          <path
            d="M50 110 C140 40, 320 40, 410 110"
            stroke="rgba(5, 150, 105, 0.18)"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Glowing Animated Highway Pulse Track */}
          <path
            d="M50 110 C140 40, 320 40, 410 110"
            stroke="url(#corridorGradient)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Traveling Courier Light Packet */}
          <motion.circle
            r="5"
            fill="#10B981"
            filter="drop-shadow(0 0 8px #10B981)"
            animate={{
              cx: [50, 140, 230, 320, 410],
              cy: [110, 52, 45, 52, 110],
            }}
            transition={{
              duration: activeSpeed === 'express' ? 2 : 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Waypoint 1: Origin (From City) */}
          <g transform="translate(50, 110)">
            <circle r="12" fill="rgba(5, 150, 105, 0.15)" />
            <circle r="6" fill="#059669" />
            <circle r="2.5" fill="#FFFFFF" />
          </g>

          {/* Waypoint 2: Midpoint Checkpoint */}
          <g transform="translate(230, 45)">
            <circle r="7" fill="rgba(2, 132, 199, 0.15)" />
            <circle r="3.5" fill="#0284C7" />
          </g>

          {/* Waypoint 3: Destination (To City) */}
          <g transform="translate(410, 110)">
            <circle r="14" fill="rgba(16, 185, 129, 0.2)" className="animate-pulse" />
            <circle r="7" fill="#10B981" />
            <circle r="3" fill="#FFFFFF" />
          </g>

          {/* Gradients */}
          <defs>
            <linearGradient id="corridorGradient" x1="50" y1="110" x2="410" y2="110" gradientUnits="userSpaceOnUse">
              <stop stopColor="#059669" />
              <stop offset="0.5" stopColor="#0284C7" />
              <stop offset="1" stopColor="#10B981" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Pathway Footnote Cards */}
      <div className="relative z-10 grid grid-cols-2 gap-3 pt-2">
        <div className="rounded-2xl border border-border/70 bg-surface/90 p-3 shadow-xs">
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted">Pickup Origin</p>
          <div className="mt-1 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span className="font-heading font-bold text-sm text-foreground">{fromCity}</span>
          </div>
          <span className="mt-1 inline-block text-[11px] text-emerald-700 font-medium">
            Golden Passkey Active
          </span>
        </div>

        <div className="rounded-2xl border border-border/70 bg-surface/90 p-3 shadow-xs text-right">
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted">Dropoff Target</p>
          <div className="mt-1 flex items-center justify-end gap-1.5">
            <span className="font-heading font-bold text-sm text-foreground">{toCity}</span>
            <Navigation className="h-3.5 w-3.5 text-sky-600 shrink-0" />
          </div>
          <span className="mt-1 inline-block text-[11px] text-sky-700 font-medium">
            Doorstep Handshake Signoff
          </span>
        </div>
      </div>
    </div>
  )
}
