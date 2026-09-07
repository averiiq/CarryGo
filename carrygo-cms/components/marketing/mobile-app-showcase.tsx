'use client'

import { useState } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  Download,
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
      <div className="rounded-3xl bg-surface/90 border border-border shadow-2xl p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Side: Copywriting, Screen Switcher, & Download Links */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary-subtle text-primary border border-primary/20 mb-3">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Available for iOS &amp; Android</span>
            </div>
            <h3 className="text-3xl sm:text-4xl font-heading font-extrabold text-foreground tracking-tight">
              The Full Power of CarryGo in Your Pocket
            </h3>
            <p className="text-base text-muted leading-relaxed mt-2">
              From instant traveler route notifications to dual-OTP handovers and live chat, the CarryGo mobile app makes peer-to-peer parcel shipping seamless and secure.
            </p>
          </div>

          {/* Interactive Screen Feature Switcher */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {[
              {
                id: 'match' as const,
                title: 'Smart Route Match',
                desc: 'Find travelers heading your way',
                icon: Navigation,
              },
              {
                id: 'otp' as const,
                title: 'Dual-OTP Handover',
                desc: 'Verified pickup & dropoff',
                icon: KeyRound,
              },
              {
                id: 'chat' as const,
                title: 'In-App Secure Chat',
                desc: 'Coordinate seamlessly',
                icon: MessageSquare,
              },
              {
                id: 'wallet' as const,
                title: 'Instant Payout Wallet',
                desc: 'UPI & bank transfers',
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
                      ? 'border-primary bg-primary-subtle/60 text-primary shadow-xs'
                      : 'border-border bg-background text-muted hover:border-primary/30 hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted'}`} />
                    <span className="text-xs sm:text-sm font-bold text-foreground">
                      {item.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted line-clamp-1">{item.desc}</p>
                </button>
              )
            })}
          </div>

          {/* Download Buttons & Ratings */}
          <div className="pt-2 border-t border-border flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              {/* App Store Button */}
              <a
                href="#download"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-foreground text-background font-semibold text-xs hover:opacity-90 transition shadow-sm"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-2 .6-2.65 1.35-.58.67-1.09 1.74-.95 2.78 1.01.08 2.05-.53 2.68-1.28z" />
                </svg>
                <div className="text-left">
                  <div className="text-[9px] uppercase tracking-wider opacity-80 leading-none">Download on</div>
                  <div className="text-xs font-bold leading-tight">App Store</div>
                </div>
              </a>

              {/* Google Play Button */}
              <a
                href="#download"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-foreground text-background font-semibold text-xs hover:opacity-90 transition shadow-sm"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M3.609 1.814L13.793 12 3.61 22.186a2.007 2.007 0 0 1-.61-.958V2.772c.15-.365.37-.687.61-.958zm11.238 11.239l2.428 2.428-11.83 6.83 9.402-9.258zm0-2.106L5.445 1.69l11.83 6.829-2.428 2.428zm1.488 1.053l3.666 2.116c1.075.62 1.075 1.636 0 2.257l-3.666 2.116-2.502-2.502 2.502-2.502z" />
                </svg>
                <div className="text-left">
                  <div className="text-[9px] uppercase tracking-wider opacity-80 leading-none">Get it on</div>
                  <div className="text-xs font-bold leading-tight">Google Play</div>
                </div>
              </a>
            </div>

            {/* Trust Rating */}
            <div className="flex items-center gap-2 text-xs text-muted">
              <div className="flex items-center text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-current" />
                ))}
              </div>
              <span className="font-bold text-foreground">4.9/5</span>
              <span>(2,500+ reviews)</span>
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Smartphone Device Mockup */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-[280px] sm:w-[300px] rounded-[42px] p-3 bg-zinc-900 shadow-2xl border-4 border-zinc-700/60 relative">
            {/* Camera / Speaker Notch */}
            <div className="absolute top-5 left-1/2 -translate-x-1/2 w-24 h-4 bg-zinc-800 rounded-full z-20" />

            {/* Screen Glass Container */}
            <div className="w-full aspect-[9/18.5] rounded-[34px] overflow-hidden bg-background text-foreground flex flex-col justify-between p-4 border border-zinc-800 relative select-none">
              {/* Top Status Bar */}
              <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-3 px-2">
                <span className="font-bold">09:41</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px]">5G</span>
                  <div className="w-4 h-2 rounded-xs border border-muted-foreground/80 flex items-center p-0.5">
                    <div className="w-full h-full bg-primary rounded-xs" />
                  </div>
                </div>
              </div>

              {/* Dynamic Screen Content */}
              <div className="my-auto space-y-3 pt-2">
                {activeScreen === 'match' && (
                  <div className="space-y-2.5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Available Travelers</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-subtle text-primary font-semibold">
                        3 Matches
                      </span>
                    </div>

                    {/* Traveler Card */}
                    <div className="p-3 rounded-2xl bg-surface border border-border shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                            RK
                          </div>
                          <div>
                            <div className="text-xs font-bold text-foreground flex items-center gap-1">
                              Rahul K. <ShieldCheck className="w-3 h-3 text-primary" />
                            </div>
                            <div className="text-[10px] text-muted">Car • Leaving Today</div>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-primary">₹380</span>
                      </div>

                      <div className="text-[11px] font-medium text-foreground/80 flex items-center justify-between bg-surface-elevated p-1.5 rounded-xl">
                        <span>Mumbai</span>
                        <span className="text-muted">→</span>
                        <span>Pune</span>
                        <span className="text-[10px] text-muted">6 kg space</span>
                      </div>

                      <button
                        type="button"
                        className="w-full py-1.5 rounded-xl text-[11px] font-bold bg-primary text-primary-foreground text-center"
                      >
                        Request Delivery
                      </button>
                    </div>
                  </div>
                )}

                {activeScreen === 'otp' && (
                  <div className="space-y-2.5 animate-in fade-in duration-200 text-center">
                    <div className="inline-flex p-2 rounded-2xl bg-primary-subtle text-primary mx-auto">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">Dual-OTP Security</div>
                      <p className="text-[10px] text-muted">Handover verified in-person</p>
                    </div>

                    <div className="p-3 rounded-2xl bg-surface border border-border shadow-xs space-y-2 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-muted">Pickup Code</span>
                        <span className="text-xs font-mono font-bold text-primary tracking-widest bg-primary-subtle px-2 py-0.5 rounded-md">
                          7492
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-muted">Delivery OTP</span>
                        <span className="text-xs font-mono font-bold text-accent tracking-widest bg-accent-subtle px-2 py-0.5 rounded-md">
                          3815
                        </span>
                      </div>
                      <div className="text-[9px] text-muted-foreground pt-1 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-success" /> Recipient shares code to unlock payout
                      </div>
                    </div>
                  </div>
                )}

                {activeScreen === 'chat' && (
                  <div className="space-y-2 animate-in fade-in duration-200">
                    <div className="text-xs font-bold text-foreground">Route Handover Chat</div>

                    <div className="space-y-1.5 text-[11px]">
                      <div className="p-2 rounded-2xl rounded-tl-xs bg-surface border border-border text-foreground max-w-[85%]">
                        Hi Rahul! I have a 1.5kg document package. Can we meet near Dadar station?
                      </div>
                      <div className="p-2 rounded-2xl rounded-tr-xs bg-primary text-primary-foreground ml-auto max-w-[85%]">
                        Sure! I am reaching Dadar by 4:30 PM. I will enter the pickup OTP.
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-surface border border-border text-[10px] text-muted flex items-center justify-between">
                      <span>Type a message...</span>
                      <Zap className="w-3.5 h-3.5 text-primary" />
                    </div>
                  </div>
                )}

                {activeScreen === 'wallet' && (
                  <div className="space-y-2.5 animate-in fade-in duration-200">
                    <div className="p-3 rounded-2xl bg-surface border border-border shadow-xs space-y-1.5 text-center">
                      <span className="text-[10px] uppercase font-bold text-muted">Available Balance</span>
                      <div className="text-2xl font-extrabold text-foreground tracking-tight">
                        ₹3,450
                      </div>
                      <span className="text-[10px] text-success font-semibold flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> 8 Trips Completed
                      </span>
                    </div>

                    <button
                      type="button"
                      className="w-full py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground text-center flex items-center justify-center gap-1"
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      <span>Instant UPI Withdrawal</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Bottom App Navigation Bar */}
              <div className="pt-2 border-t border-border flex justify-around items-center text-[9px] text-muted">
                <span className="text-primary font-bold">Home</span>
                <span>My Trips</span>
                <span>Parcels</span>
                <span>Profile</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
