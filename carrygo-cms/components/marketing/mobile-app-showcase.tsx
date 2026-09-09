'use client'

import { useState } from 'react'
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
} from 'lucide-react'

type AppScreen = 'match' | 'otp' | 'chat' | 'wallet'

export function MobileAppShowcase() {
  const [activeScreen, setActiveScreen] = useState<AppScreen>('match')

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="relative rounded-3xl border border-slate-200/90 bg-white shadow-xl p-6 sm:p-10 md:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center overflow-hidden">
        {/* Subtle top edge highlight */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500" />

        {/* Left Side: Copywriting, Screen Switcher, & Ratings */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-3">
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
              <span>Mobile First Delivery Network</span>
            </div>
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-heading font-extrabold text-slate-900 tracking-tight">
              Move Parcels or Earn on the Go with CarryGo App
            </h3>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed mt-2.5">
              Live route matching, instant dual-OTP signoffs, real-time in-transit messaging, and zero-fee UPI payouts right from your pocket.
            </p>
          </div>

          {/* Interactive Screen Feature Switcher */}
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-2.5 sm:gap-3">
            {[
              {
                id: 'match' as const,
                title: 'Smart Route Radar',
                desc: 'Instant traveler route matching',
                icon: Navigation,
              },
              {
                id: 'otp' as const,
                title: 'Dual-OTP Guarantee',
                desc: 'Verified pickup & dropoff codes',
                icon: KeyRound,
              },
              {
                id: 'chat' as const,
                title: 'Encrypted Live Chat',
                desc: 'Direct sender-traveler coordination',
                icon: MessageSquare,
              },
              {
                id: 'wallet' as const,
                title: 'Instant UPI Payouts',
                desc: 'Direct to GPay, PhonePe, Bank',
                icon: Wallet,
              },
            ].map((item) => {
              const Icon = item.icon
              const isActive = activeScreen === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveScreen(item.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    isActive
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-900 shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-slate-500'}`} />
                    <span className="text-xs sm:text-sm font-bold">
                      {item.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1">{item.desc}</p>
                </button>
              )
            })}
          </div>

          {/* Ratings & Downloads */}
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

        {/* Right Side: Interactive Smartphone Device Mockup */}
        <div className="lg:col-span-5 flex justify-center w-full">
          <div className="w-[270px] sm:w-[300px] rounded-[44px] p-3 bg-slate-900 shadow-2xl border-4 border-slate-700 relative">
            {/* Dynamic Island */}
            <div className="absolute top-5 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-full z-20 flex items-center justify-end px-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            {/* Screen Glass Container (Light Theme App Screen Inside Phone) */}
            <div className="w-full aspect-[9/18.5] rounded-[36px] overflow-hidden bg-slate-50 text-slate-900 flex flex-col justify-between p-4 border border-slate-200 relative select-none">
              {/* Top Status Bar */}
              <div className="flex justify-between items-center text-[10px] text-slate-500 pt-3 px-2">
                <span className="font-bold">09:41</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-semibold">5G</span>
                  <div className="w-4 h-2 rounded-xs border border-slate-500 flex items-center p-0.5">
                    <div className="w-full h-full bg-emerald-600 rounded-xs" />
                  </div>
                </div>
              </div>

              {/* Dynamic Screen Content */}
              <div className="my-auto space-y-3 pt-4">
                {activeScreen === 'match' && (
                  <div className="space-y-2.5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">Verified Matches</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                        3 Traveling Now
                      </span>
                    </div>

                    {/* Traveler Card */}
                    <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
                            RK
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                              Rahul K. <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            </div>
                            <div className="text-[10px] text-slate-500">Car • Departs 4:30 PM</div>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-emerald-700">₹380</span>
                      </div>

                      <div className="text-[11px] font-medium text-slate-700 flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span>Mumbai</span>
                        <span className="text-emerald-600 font-bold">→</span>
                        <span>Pune</span>
                        <span className="text-[10px] text-slate-500">6 kg space</span>
                      </div>

                      <button
                        type="button"
                        className="w-full py-1.5 rounded-xl text-[11px] font-bold bg-emerald-600 text-white text-center shadow-xs"
                      >
                        Book Baggage Space
                      </button>
                    </div>
                  </div>
                )}

                {activeScreen === 'otp' && (
                  <div className="space-y-2.5 animate-in fade-in duration-200 text-center">
                    <div className="inline-flex p-2 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 mx-auto">
                      <KeyRound className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Dual-OTP Handover</div>
                      <p className="text-[10px] text-slate-500">Protected in-person verification</p>
                    </div>

                    <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-slate-500">Pickup Code</span>
                        <span className="text-xs font-mono font-bold text-emerald-800 tracking-widest bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          7492
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-slate-500">Delivery OTP</span>
                        <span className="text-xs font-mono font-bold text-sky-800 tracking-widest bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                          3815
                        </span>
                      </div>
                      <div className="text-[9px] text-slate-500 pt-1 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-emerald-600" /> Funds held safely in Smart Escrow
                      </div>
                    </div>
                  </div>
                )}

                {activeScreen === 'chat' && (
                  <div className="space-y-2 animate-in fade-in duration-200">
                    <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                      <span>Rahul (Traveler)</span>
                      <span className="text-[10px] text-emerald-600 font-semibold">Online</span>
                    </div>

                    <div className="space-y-1.5 text-[11px]">
                      <div className="p-2 rounded-2xl rounded-tl-xs bg-white border border-slate-200 text-slate-800 shadow-xs max-w-[85%]">
                        Hi! I have a 1.5kg sealed parcel. Can we meet near Dadar Station?
                      </div>
                      <div className="p-2 rounded-2xl rounded-tr-xs bg-emerald-600 text-white font-medium ml-auto max-w-[85%] shadow-xs">
                        Sure! I am reaching Dadar by 4:30 PM. I will enter pickup OTP.
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-white border border-slate-200 text-[10px] text-slate-400 flex items-center justify-between shadow-xs">
                      <span>Type a message...</span>
                      <Zap className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                  </div>
                )}

                {activeScreen === 'wallet' && (
                  <div className="space-y-2.5 animate-in fade-in duration-200">
                    <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1.5 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Available Balance</span>
                      <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
                        ₹3,450
                      </div>
                      <span className="text-[10px] text-emerald-700 font-semibold flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> 8 Trips Completed
                      </span>
                    </div>

                    <button
                      type="button"
                      className="w-full py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white text-center flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      <span>Instant UPI Withdrawal</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Bottom App Navigation Bar */}
              <div className="pt-2 border-t border-slate-200 flex justify-around items-center text-[9px] text-slate-500">
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
