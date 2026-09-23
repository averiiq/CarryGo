'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2,
  KeyRound,
  Lock,
  MessageSquare,
  Navigation,
  QrCode,
  ShieldCheck,
  Smartphone,
  Star,
  Wallet,
  Zap,
  Radio,
  ArrowRight,
  Wifi,
  Battery,
  MapPin,
  Car,
} from 'lucide-react'

type AppScreen = 'match' | 'otp' | 'chat' | 'wallet'

export function MobileAppShowcase() {
  const [activeScreen, setActiveScreen] = useState<AppScreen>('match')

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="relative rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/50 to-emerald-50/20 p-6 sm:p-10 md:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center overflow-hidden">
        {/* Top Hairline Gradient Accent */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-500" />
        {/* Subtle Minimal Grid Pattern with Vignette Mask */}
        <div className="absolute inset-0 bg-grid-minimal opacity-40 mask-radial-vignette pointer-events-none" />

        {/* Left Side: Copywriting, Screen Switcher, & Ratings */}
        <div className="lg:col-span-7 space-y-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-3">
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
              <span>Mobile-First Peer-to-Peer Delivery Network</span>
            </div>
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-heading font-extrabold text-slate-900 tracking-tight">
              Move Parcels or Earn on the Go with CarryGo App
            </h3>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed mt-2.5 max-w-xl">
              Live highway route matching, private dual-OTP handovers, encrypted direct messaging, and zero-fee UPI payouts right from your pocket.
            </p>
          </div>

          {/* Interactive Screen Feature Switcher Cards (2x2 Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                id: 'match' as const,
                title: 'Smart Route Radar',
                desc: 'Real-time GPS match on your highway corridor',
                badge: 'Live GPS',
                icon: Navigation,
                color: 'text-emerald-700 bg-emerald-100',
              },
              {
                id: 'otp' as const,
                title: 'Dual-OTP Handover',
                desc: 'Guaranteed personal verification codes',
                badge: 'Dual PIN',
                icon: KeyRound,
                color: 'text-sky-700 bg-sky-100',
              },
              {
                id: 'chat' as const,
                title: 'Encrypted Live Chat',
                desc: 'Direct sender-traveler coordination & live location',
                badge: 'AES-256',
                icon: MessageSquare,
                color: 'text-indigo-700 bg-indigo-100',
              },
              {
                id: 'wallet' as const,
                title: 'Instant UPI Payouts',
                desc: 'Immediate release to GPay, PhonePe & Paytm',
                badge: 'Zero Fees',
                icon: Wallet,
                color: 'text-amber-700 bg-amber-100',
              },
            ].map((item) => {
              const Icon = item.icon
              const isActive = activeScreen === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveScreen(item.id)}
                  className={`relative p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isActive
                      ? 'border-emerald-500 bg-emerald-50/70 text-slate-950 font-bold'
                      : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="appFeaturePill"
                      className="absolute inset-0 rounded-2xl border-2 border-emerald-500 bg-emerald-50/40 pointer-events-none"
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    />
                  )}
                  <div className="relative z-10 flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${item.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-slate-900">
                        {item.title}
                      </span>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      isActive ? 'bg-emerald-200/80 text-emerald-900' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {item.badge}
                    </span>
                  </div>
                  <p className="relative z-10 text-[11px] text-slate-500 leading-snug">{item.desc}</p>
                </button>
              )
            })}
          </div>

          {/* Ratings & Downloads Strip */}
          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <div className="text-xs text-slate-600">
                <span className="font-bold text-slate-900">4.9 / 5</span> rating across iOS &amp; Android
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
              <QrCode className="w-4 h-4 text-emerald-600" />
              <span>Scan to download app</span>
            </div>
          </div>
        </div>

        {/* Right Side: Hyper-Realistic Titanium Smartphone Mockup */}
        <div className="lg:col-span-5 flex justify-center w-full relative">
          {/* Ambient Soft Aurora Aura behind device */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full bg-gradient-to-tr from-emerald-400/15 via-teal-300/10 to-sky-400/10 blur-3xl pointer-events-none -z-10" />

          {/* Smartphone Hardware Chassis */}
          <div className="w-[280px] sm:w-[310px] rounded-[52px] p-3 bg-gradient-to-b from-slate-300 via-slate-100 to-slate-300 border-[5px] border-slate-300/90 relative select-none">
            {/* Side Hardware Buttons */}
            <div className="absolute -left-[7px] top-28 w-[3px] h-9 bg-slate-400 rounded-l-xs" />
            <div className="absolute -left-[7px] top-40 w-[3px] h-9 bg-slate-400 rounded-l-xs" />
            <div className="absolute -right-[7px] top-32 w-[3px] h-14 bg-slate-400 rounded-r-xs" />

            {/* Dynamic Island Capsule */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-6 bg-slate-950 rounded-full z-30 flex items-center justify-between px-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] font-mono font-bold text-white tracking-tight">Gurugram</span>
              </div>
              <span className="text-[9px] font-bold text-emerald-400">14m</span>
            </div>

            {/* Screen Glass Container */}
            <div className="w-full aspect-[9/18.5] rounded-[42px] overflow-hidden bg-white text-slate-900 flex flex-col justify-between p-3.5 border border-slate-200/90 relative select-none">
              {/* Subtle Screen Glass Sheen Overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent pointer-events-none z-20" />

              {/* Realistic Status Bar */}
              <div className="flex justify-between items-center text-[10px] text-slate-600 pt-1.5 px-2 font-medium z-20">
                <span className="font-bold">09:41</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold text-slate-700">Jio 5G</span>
                  <Wifi className="w-3 h-3 text-slate-600" />
                  <div className="w-4 h-2 rounded-xs border border-slate-600 flex items-center p-0.5">
                    <div className="w-full h-full bg-slate-800 rounded-xs" />
                  </div>
                </div>
              </div>

              {/* Dynamic Screen Content with AnimatePresence */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeScreen}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="my-auto space-y-2.5 pt-2 z-10"
                >
                  {/* SCREEN 1: SMART ROUTE RADAR */}
                  {activeScreen === 'match' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-900">Live Highway Matches</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          3 Commuters Now
                        </span>
                      </div>

                      {/* Traveler Match Card */}
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-extrabold">
                              RK
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                                Rahul Kumar <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              </div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                <Car className="w-3 h-3 text-emerald-600" /> Swift Dzire • Departs 4:30 PM
                              </div>
                            </div>
                          </div>
                          <span className="text-sm font-extrabold text-emerald-700">₹380</span>
                        </div>

                        {/* Corridor & Luggage Progress */}
                        <div className="p-2 rounded-xl bg-white border border-slate-200 text-[11px] space-y-1.5">
                          <div className="flex items-center justify-between font-bold text-slate-800">
                            <span>Gurugram</span>
                            <span className="text-emerald-600">➔</span>
                            <span>Panipat</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span>Baggage Space</span>
                            <span className="font-bold text-emerald-700">6 kg available</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-emerald-600 h-full rounded-full w-3/5" />
                          </div>
                        </div>

                        <button
                          type="button"
                          className="w-full py-2 rounded-xl text-xs font-bold bg-emerald-700 text-white text-center hover:bg-emerald-800 transition cursor-pointer flex items-center justify-center gap-1"
                        >
                          <span>Book Baggage Space</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* SCREEN 2: DUAL-OTP HANDOVER */}
                  {activeScreen === 'otp' && (
                    <div className="space-y-2 text-center">
                      <div className="inline-flex p-2 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 mx-auto">
                        <KeyRound className="w-4 h-4 text-emerald-600" />
                      </div>

                      <div>
                        <div className="text-xs font-bold text-slate-900">Protected In-Person Handover</div>
                        <p className="text-[10px] text-slate-500">Dual security passkeys for sender &amp; receiver</p>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-left">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase text-slate-500">Pickup Passkey</span>
                          <span className="text-xs font-mono font-extrabold text-emerald-800 tracking-widest bg-emerald-100 px-2.5 py-0.5 rounded-md border border-emerald-300">
                            7492
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase text-slate-500">Delivery OTP</span>
                          <span className="text-xs font-mono font-extrabold text-sky-800 tracking-widest bg-sky-100 px-2.5 py-0.5 rounded-md border border-sky-300">
                            3815
                          </span>
                        </div>
                        <div className="text-[9px] text-slate-500 pt-1.5 border-t border-slate-200 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Lock className="w-3 h-3 text-emerald-600" /> SafeVault™ Escrow Locked
                          </span>
                          <span className="text-emerald-700 font-bold">100% Protected</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SCREEN 3: ENCRYPTED LIVE CHAT */}
                  {activeScreen === 'chat' && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-900 flex items-center justify-between pb-1 border-b border-slate-100">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          Rahul (Commuter)
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">Car • DL-10</span>
                      </div>

                      <div className="space-y-1.5 text-[11px]">
                        <div className="p-2 rounded-2xl rounded-tl-xs bg-slate-100 text-slate-800 max-w-[88%] text-[10px]">
                          Hi! I have a 1.5kg sealed bag. Can we meet near IFFCO Chowk, Gurugram?
                        </div>
                        <div className="p-2 rounded-2xl rounded-tr-xs bg-emerald-700 text-white font-medium ml-auto max-w-[88%] text-[10px]">
                          Sure! Arriving at IFFCO Chowk by 4:30 PM. I will verify your Pickup PIN.
                        </div>
                      </div>

                      {/* GPS Landmark Attachment */}
                      <div className="p-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[9px] text-emerald-900 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span className="truncate">IFFCO Chowk Metro Gate 2 • 4:25 PM</span>
                      </div>

                      <div className="p-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-400 flex items-center justify-between">
                        <span>Message Rahul...</span>
                        <Zap className="w-3 h-3 text-emerald-600" />
                      </div>
                    </div>
                  )}

                  {/* SCREEN 4: INSTANT UPI WALLET */}
                  {activeScreen === 'wallet' && (
                    <div className="space-y-2">
                      <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-700 to-teal-800 text-white space-y-1 text-center">
                        <span className="text-[9px] uppercase tracking-wider text-emerald-200 font-bold">
                          Available UPI Balance
                        </span>
                        <div className="text-2xl font-extrabold tracking-tight font-heading">
                          ₹3,450
                        </div>
                        <span className="text-[9px] text-emerald-100 flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-300" /> 8 Trips Completed • ₹0 Fees
                        </span>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-[9px] text-slate-600 flex items-center justify-between">
                        <span className="font-bold text-slate-800">Direct UPI Transfer</span>
                        <span className="text-emerald-700 font-mono font-bold">GPay • PhonePe • Paytm</span>
                      </div>

                      <button
                        type="button"
                        className="w-full py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white text-center flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Wallet className="w-3.5 h-3.5" />
                        <span>Instant Transfer to Bank</span>
                      </button>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Bottom App Navigation Bar */}
              <div className="pt-2 border-t border-slate-200 flex justify-around items-center text-[9px] text-slate-500 font-semibold z-20">
                <span className="text-emerald-700 font-bold">Corridors</span>
                <span>My Trips</span>
                <span>Parcels</span>
                <span>Wallet</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
