'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HeroRouteSearch } from '@/components/marketing/hero-route-search'
import { HeroRouteSimulator } from '@/components/marketing/hero-route-simulator'
import { Star, ShieldCheck, Search, Radio, Sparkles } from 'lucide-react'

export function HeroSplitExperience() {
  const [mobileTab, setMobileTab] = useState<'search' | 'radar'>('search')

  return (
    <div className="w-full">
      {/* Mobile-Only Segmented View Controller (< lg) */}
      <div className="lg:hidden mb-5">
        <div className="relative grid grid-cols-2 rounded-2xl bg-slate-100 p-1 border border-slate-200/90 text-xs font-bold">
          <button
            type="button"
            onClick={() => setMobileTab('search')}
            className={`relative z-10 py-2.5 px-3 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              mobileTab === 'search' ? 'text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {mobileTab === 'search' && (
              <motion.span
                layoutId="heroMobileViewTab"
                className="absolute inset-0 rounded-xl bg-[#004AAD]"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <Search className="relative z-10 w-3.5 h-3.5" />
            <span className="relative z-10">Find Routes</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('radar')}
            className={`relative z-10 py-2.5 px-3 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              mobileTab === 'radar' ? 'text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {mobileTab === 'radar' && (
              <motion.span
                layoutId="heroMobileViewTab"
                className="absolute inset-0 rounded-xl bg-[#004AAD]"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <Radio className="relative z-10 w-3.5 h-3.5 text-emerald-600" />
            <span className="relative z-10">Live Radar</span>
            <span className="relative z-10 text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-800 text-white font-mono">
              Live
            </span>
          </button>
        </div>
      </div>

      {/* Responsive Viewport Split */}
      {/* Desktop (lg:grid): Shows BOTH Left Column and Right Column Side-by-Side */}
      <div className="hidden lg:grid lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Left Column: Route Search Form + Trust Proof */}
        <div className="lg:col-span-7 space-y-4">
          <HeroRouteSearch />

          {/* Trust Evidence Strip */}
          <div className="pt-2 flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-800">Highway corridors active daily</span>
            </div>

            <div className="h-3.5 w-px bg-slate-200" />

            <div className="flex items-center gap-1 font-medium text-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Aadhaar verified commuters</span>
            </div>

            <div className="h-3.5 w-px bg-slate-200" />

            <div className="flex items-center gap-1 font-medium text-slate-800">
              <span>Safe Pay protected</span>
            </div>
          </div>
        </div>

        {/* Right Column: Live Corridor Simulator HUD */}
        <div className="lg:col-span-5 w-full">
          <HeroRouteSimulator />
        </div>
      </div>

      {/* Mobile Mode (< lg): Smooth animated switcher between Search and Radar */}
      <div className="lg:hidden">
        <AnimatePresence mode="wait">
          {mobileTab === 'search' ? (
            <motion.div
              key="mobile-search-tab"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              <HeroRouteSearch />

              {/* Mobile Trust Proof Strip */}
              <div className="p-3 rounded-xl bg-white border border-slate-200/90 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-700">
                <span className="font-medium text-slate-800">Haryana commuter network</span>
                <div className="flex items-center gap-1 font-medium text-emerald-700">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ID Verified</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="mobile-radar-tab"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              <HeroRouteSimulator />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
