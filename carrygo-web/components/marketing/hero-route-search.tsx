'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  ArrowRightLeft,
  Calendar,
  Clock,
  MapPin,
  Package,
  Plane,
  Search,
  Sparkles,
  Train,
  Car,
} from 'lucide-react'
import { CityAutocomplete } from '@/components/ui/city-autocomplete'
import { getRouteEstimate } from '@/lib/indian-cities'

const POPULAR_CORRIDORS = [
  { from: 'Gurugram', to: 'Faridabad', tag: '1h road' },
  { from: 'Gurugram', to: 'Panipat', tag: '2h road' },
  { from: 'Ambala', to: 'Karnal', tag: '1.2h rail' },
  { from: 'Rohtak', to: 'Hisar', tag: '1.5h road' },
  { from: 'Panchkula', to: 'Ambala', tag: '45m road' },
  { from: 'Rewari', to: 'Gurugram', tag: '1h road' },
]

export function HeroRouteSearch() {
  const router = useRouter()
  const [mode, setMode] = useState<'send' | 'travel'>('send')
  const [fromCity, setFromCity] = useState('')
  const [toCity, setToCity] = useState('')
  const [date, setDate] = useState('')
  const [isSwapping, setIsSwapping] = useState(false)

  // Route calculation based on verified Indian coordinates
  const routeEstimate = useMemo(() => {
    if (!fromCity.trim() || !toCity.trim()) return null
    if (fromCity.trim().toLowerCase() === toCity.trim().toLowerCase()) return null
    return getRouteEstimate(fromCity, toCity)
  }, [fromCity, toCity])

  const handleSwap = () => {
    setIsSwapping(true)
    const temp = fromCity
    setFromCity(toCity)
    setToCity(temp)
    setTimeout(() => setIsSwapping(false), 350)
  }

  const handleQuickSelect = (from: string, to: string) => {
    setFromCity(from)
    setToCity(to)
  }

  const isCurrentCorridor = (from: string, to: string) => {
    return (
      fromCity.trim().toLowerCase() === from.toLowerCase() &&
      toCity.trim().toLowerCase() === to.toLowerCase()
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const typeParam = mode === 'send' ? 'trips' : 'parcels'
    const query = new URLSearchParams()
    if (fromCity.trim()) query.set('from', fromCity.trim())
    if (toCity.trim()) query.set('to', toCity.trim())
    if (date) query.set('date', date)
    query.set('type', typeParam)

    router.push(`/search?${query.toString()}`)
  }

  return (
    <div className="w-full">
      <div className="relative rounded-3xl border border-slate-200/90 bg-gradient-to-b from-white via-slate-50/30 to-white p-4 sm:p-6 lg:p-7 overflow-hidden">
        {/* Top Gradient Hairline Accent */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-500" />
        <div className="absolute inset-0 pattern-dots opacity-30 pointer-events-none -z-10" />
        {/* Mode Switcher Segmented Control with Smooth Sliding Pill */}
        <div className="relative grid grid-cols-2 rounded-2xl bg-slate-100 p-1 border border-slate-200/90 mb-4 sm:mb-5">
          <button
            type="button"
            onClick={() => setMode('send')}
            className={`relative z-10 inline-flex items-center justify-center gap-2 py-2 sm:py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
              mode === 'send' ? 'text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {mode === 'send' && (
              <motion.span
                layoutId="heroModeTab"
                className="absolute inset-0 rounded-xl bg-emerald-700"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <Package className="relative z-10 w-4 h-4 shrink-0" />
            <span className="relative z-10">Send a Parcel</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('travel')}
            className={`relative z-10 inline-flex items-center justify-center gap-2 py-2 sm:py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
              mode === 'travel' ? 'text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {mode === 'travel' && (
              <motion.span
                layoutId="heroModeTab"
                className="absolute inset-0 rounded-xl bg-emerald-700"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <Plane className="relative z-10 w-4 h-4 shrink-0" />
            <span className="relative z-10">Travel &amp; Earn</span>
          </button>
        </div>

        {/* Inputs Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-2.5">
            {/* Origin City with Autocomplete */}
            <CityAutocomplete
              id="hero-from-city"
              label="From City (Haryana)"
              placeholder="e.g. Gurugram"
              value={fromCity}
              onChange={setFromCity}
              iconColor="text-emerald-600"
            />

            {/* Swap Button with Smooth Spring Rotation */}
            <div className="flex justify-center -my-1 sm:my-0 sm:pt-4 z-10">
              <motion.button
                type="button"
                onClick={handleSwap}
                animate={{ rotate: isSwapping ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 sm:p-2.5 rounded-full sm:rounded-2xl border border-slate-200 bg-white sm:bg-slate-50 text-slate-600 hover:text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors cursor-pointer"
                title="Swap origin and destination"
                aria-label="Swap cities"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </motion.button>
            </div>

            {/* Destination City with Autocomplete */}
            <CityAutocomplete
              id="hero-to-city"
              label="To Destination (Haryana)"
              placeholder="e.g. Panipat"
              value={toCity}
              onChange={setToCity}
              iconColor="text-sky-600"
            />
          </div>

          {/* Dynamic Travel Corridor Route Preview */}
          {routeEstimate && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/90 text-xs text-emerald-950 space-y-1.5"
            >
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  Estimated Highway Route
                </span>
                <span className="font-mono text-emerald-800 font-bold">{routeEstimate.distanceKm} km</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 text-[11px]">
                <span className="flex items-center gap-1">
                  <Car className="w-3 h-3 text-emerald-600" /> ~{routeEstimate.driveHours}h road
                </span>
                <span className="flex items-center gap-1">
                  <Train className="w-3 h-3 text-sky-600" /> ~{routeEstimate.trainHours}h rail
                </span>
                <span className="font-bold text-emerald-700 font-mono">
                  From ₹{Math.round(routeEstimate.distanceKm * 1.5 + 80)}
                </span>
              </div>
            </motion.div>
          )}

          {/* Date Picker & Search Button Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label htmlFor="hero-travel-date" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Travel Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  id="hero-travel-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 rounded-2xl border border-slate-200 bg-white text-sm text-slate-900 font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
                />
              </div>
            </div>

            <div className="flex items-end">
              <motion.button
                type="submit"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full h-[46px] rounded-2xl font-bold text-sm text-white bg-emerald-700 hover:bg-emerald-800 transition-colors cursor-pointer flex items-center justify-center gap-2 group"
              >
                <Search className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>
                  {mode === 'send' ? 'Find Travelers' : 'Find Parcels'}
                </span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </motion.button>
            </div>
          </div>
        </form>

        {/* Popular Corridors Quick Filter with Tactile Hover */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-semibold text-slate-700">Popular Corridors:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_CORRIDORS.map((corridor) => {
              const active = isCurrentCorridor(corridor.from, corridor.to)
              return (
                <motion.button
                  key={`${corridor.from}-${corridor.to}`}
                  type="button"
                  onClick={() => handleQuickSelect(corridor.from, corridor.to)}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    active
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <span>{corridor.from} → {corridor.to}</span>
                  <span className={`text-[9px] px-1 rounded ${active ? 'bg-emerald-800 text-white' : 'bg-white text-slate-500'}`}>
                    {corridor.tag}
                  </span>
                </motion.button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
