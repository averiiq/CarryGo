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
  ArrowRight,
  Wifi,
  MapPin,
  Car,
  Send,
} from 'lucide-react'

type AppScreen = 'match' | 'otp' | 'chat' | 'wallet'

export function MobileAppShowcase() {
  const [activeScreen, setActiveScreen] = useState<AppScreen>('match')

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="relative rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 md:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center overflow-hidden shadow-sm">
        {/* Left Side: Copywriting, Screen Switcher, & Ratings */}
        <div className="lg:col-span-7 space-y-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-3">
              <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
              <span>Mobile commuter network</span>
            </div>
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-heading font-semibold text-slate-900 tracking-tight">
              Move parcels or monetize travel with the CarryGo app
            </h3>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed mt-2.5 max-w-xl">
              Live highway corridor matching, two-step handover passkeys, direct commuter messaging, and UPI payouts right from your phone.
            </p>
          </div>

          {/* Interactive Screen Feature Switcher Cards (2x2 Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                id: 'match' as const,
                title: 'Corridor Radar',
                desc: 'Real-time transit match along your highway corridor',
                badge: 'Live route',
                icon: Navigation,
                color: 'text-emerald-800 bg-emerald-50',
              },
              {
                id: 'otp' as const,
                title: 'Two-Step Handover',
                desc: 'Personal verification codes at pickup and delivery',
                badge: 'Passkey PIN',
                icon: KeyRound,
                color: 'text-sky-800 bg-sky-50',
              },
              {
                id: 'chat' as const,
                title: 'Direct Commuter Chat',
                desc: 'Sender-traveler coordination and meeting points',
                badge: 'Direct chat',
                icon: MessageSquare,
                color: 'text-indigo-800 bg-indigo-50',
              },
              {
                id: 'wallet' as const,
                title: 'Direct UPI Payouts',
                desc: 'Immediate settlement to GPay, PhonePe, or bank account',
                badge: 'Zero fee',
                icon: Wallet,
                color: 'text-amber-800 bg-amber-50',
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
                      ? 'border-emerald-600 bg-emerald-50/60 text-slate-950 font-semibold'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="appFeaturePill"
                      className="absolute inset-0 rounded-2xl border-2 border-emerald-600 pointer-events-none"
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    />
                  )}
                  <div className="relative z-10 flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center border border-slate-200/60 ${item.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs sm:text-sm font-semibold text-slate-900">
                        {item.title}
                      </span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${
                      isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
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
                <span className="font-semibold text-slate-900">4.9 / 5</span> commuter satisfaction across Haryana corridors
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700">
              <QrCode className="w-4 h-4 text-emerald-700" />
              <span>Get the mobile app</span>
            </div>
          </div>
        </div>

        {/* Right Side: Clean Smartphone Mockup */}
        <div className="lg:col-span-5 flex justify-center w-full relative">
          {/* Smartphone Hardware Chassis */}
          <div className="w-[280px] sm:w-[310px] rounded-[48px] p-3 bg-slate-100 border-[4px] border-slate-300 relative select-none shadow-md">
            {/* Dynamic Island Capsule */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-6 bg-slate-950 rounded-full z-30 flex items-center justify-between px-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[9px] font-mono font-medium text-white tracking-tight">Gurugram</span>
              </div>
              <span className="text-[9px] font-semibold text-emerald-400">14m</span>
            </div>

            {/* Screen Glass Container */}
            <div className="w-full aspect-[9/18.5] rounded-[38px] overflow-hidden bg-white text-slate-900 flex flex-col justify-between p-3.5 border border-slate-200 relative select-none">
              {/* Status Bar */}
              <div className="flex justify-between items-center text-[10px] text-slate-600 pt-1.5 px-2 font-medium z-20">
                <span className="font-semibold tabular-nums">09:41</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-medium text-slate-700">5G</span>
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
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="my-auto space-y-2.5 pt-2 z-10"
                >
                  {/* SCREEN 1: SMART ROUTE RADAR */}
                  {activeScreen === 'match' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-900">Highway corridors</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-medium border border-emerald-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          3 active now
                        </span>
                      </div>

                      {/* Traveler Match Card */}
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-semibold">
                              RK
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-slate-900 flex items-center gap-1">
                                Rahul Kumar <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                              </div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                <Car className="w-3 h-3 text-slate-500" /> Swift Dzire • Departs 4:30 PM
                              </div>
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-slate-900 tabular-nums">₹380</span>
                        </div>

                        {/* Corridor & Luggage Progress */}
                        <div className="p-2 rounded-xl bg-white border border-slate-200 text-[11px] space-y-1.5">
                          <div className="flex items-center justify-between font-semibold text-slate-800">
                            <span>Gurugram</span>
                            <span className="text-emerald-700">➔</span>
                            <span>Panipat</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span>Luggage space</span>
                            <span className="font-semibold text-emerald-800 tabular-nums">6 kg open</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-emerald-600 h-full rounded-full w-3/5" />
                          </div>
                        </div>

                        <button
                          type="button"
                          className="w-full py-2 rounded-xl text-xs font-semibold bg-emerald-700 text-white text-center hover:bg-emerald-800 transition cursor-pointer flex items-center justify-center gap-1"
                        >
                          <span>Book luggage space</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* SCREEN 2: DUAL-OTP HANDOVER */}
                  {activeScreen === 'otp' && (
                    <div className="space-y-2 text-center">
                      <div className="inline-flex p-2 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 mx-auto">
                        <KeyRound className="w-4 h-4 text-emerald-700" />
                      </div>

                      <div>
                        <div className="text-xs font-semibold text-slate-900">In-person handover passkey</div>
                        <p className="text-[10px] text-slate-500">Codes confirmed directly at pickup and delivery</p>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-left">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-medium text-slate-600">Pickup passkey</span>
                          <span className="text-xs font-mono font-semibold text-emerald-900 tracking-widest bg-emerald-100 px-2.5 py-0.5 rounded-md border border-emerald-300 tabular-nums">
                            7492
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-medium text-slate-600">Delivery passkey</span>
                          <span className="text-xs font-mono font-semibold text-sky-900 tracking-widest bg-sky-100 px-2.5 py-0.5 rounded-md border border-sky-300 tabular-nums">
                            3815
                          </span>
                        </div>
                        <div className="text-[9px] text-slate-500 pt-1.5 border-t border-slate-200 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Lock className="w-3 h-3 text-emerald-700" /> Safe Pay reserve active
                          </span>
                          <span className="text-emerald-800 font-semibold">Protected</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SCREEN 3: ENCRYPTED LIVE CHAT */}
                  {activeScreen === 'chat' && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-900 flex items-center justify-between pb-1 border-b border-slate-100">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-600" />
                          Rahul (Commuter)
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">DL-10</span>
                      </div>

                      <div className="space-y-1.5 text-[11px]">
                        <div className="p-2 rounded-2xl rounded-tl-xs bg-slate-100 text-slate-800 max-w-[88%] text-[10px]">
                          Hi! I have a 1.5kg sealed bag. Can we meet near IFFCO Chowk, Gurugram?
                        </div>
                        <div className="p-2 rounded-2xl rounded-tr-xs bg-emerald-700 text-white font-normal ml-auto max-w-[88%] text-[10px]">
                          Sure, arriving at IFFCO Chowk around 4:30 PM. I will verify your pickup passkey.
                        </div>
                      </div>

                      {/* GPS Landmark Attachment */}
                      <div className="p-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[9px] text-emerald-900 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span className="truncate">IFFCO Chowk Metro Gate 2 • 4:25 PM</span>
                      </div>

                      <div className="p-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-400 flex items-center justify-between">
                        <span>Message traveler...</span>
                        <Send className="w-3 h-3 text-slate-400" />
                      </div>
                    </div>
                  )}

                  {/* SCREEN 4: INSTANT UPI WALLET */}
                  {activeScreen === 'wallet' && (
                    <div className="space-y-2">
                      <div className="p-3 rounded-2xl bg-emerald-900 text-white space-y-1 text-center">
                        <span className="text-[9px] text-emerald-200 font-medium">
                          Available balance
                        </span>
                        <div className="text-2xl font-semibold tracking-tight font-heading tabular-nums">
                          ₹3,450
                        </div>
                        <span className="text-[9px] text-emerald-200 flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-300" /> 8 trips completed
                        </span>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-[9px] text-slate-600 flex items-center justify-between">
                        <span className="font-medium text-slate-800">Direct UPI</span>
                        <span className="text-emerald-800 font-mono font-medium">GPay • PhonePe • Paytm</span>
                      </div>

                      <button
                        type="button"
                        className="w-full py-2 rounded-xl text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white text-center flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Wallet className="w-3.5 h-3.5" />
                        <span>Transfer to bank</span>
                      </button>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Bottom App Navigation Bar */}
              <div className="pt-2 border-t border-slate-200 flex justify-around items-center text-[9px] text-slate-500 font-medium z-20">
                <span className="text-emerald-800 font-semibold">Corridors</span>
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
