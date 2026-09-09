'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  ArrowRightLeft,
  Calendar,
  MapPin,
  Package,
  Plane,
  Search,
  Sparkles,
} from 'lucide-react'

const POPULAR_CORRIDORS = [
  { from: 'Mumbai', to: 'Pune' },
  { from: 'Delhi', to: 'Jaipur' },
  { from: 'Bangalore', to: 'Hyderabad' },
  { from: 'Chennai', to: 'Bangalore' },
  { from: 'Delhi', to: 'Chandigarh' },
]

export function HeroRouteSearch() {
  const router = useRouter()
  const [mode, setMode] = useState<'send' | 'travel'>('send')
  const [fromCity, setFromCity] = useState('')
  const [toCity, setToCity] = useState('')
  const [date, setDate] = useState('')

  const handleSwap = () => {
    setFromCity(toCity)
    setToCity(fromCity)
  }

  const handleQuickSelect = (from: string, to: string) => {
    setFromCity(from)
    setToCity(to)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const typeParam = mode === 'send' ? 'trips' : 'parcels'
    const query = new URLSearchParams()
    if (fromCity.trim()) query.set('from', fromCity.trim())
    if (toCity.trim()) query.set('to', toCity.trim())
    query.set('type', typeParam)

    router.push(`/search?${query.toString()}`)
  }

  return (
    <div className="w-full max-w-xl mx-auto lg:mx-0">
      {/* Search Container Card */}
      <div className="relative rounded-3xl border border-slate-200/90 bg-white shadow-xl p-5 sm:p-7 overflow-hidden">
        {/* Top edge glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />

        {/* Mode Switcher Segmented Control */}
        <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1.5 border border-slate-200 mb-5">
          <button
            type="button"
            onClick={() => setMode('send')}
            className={`inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              mode === 'send'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4 shrink-0" />
            <span>Send a Parcel</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('travel')}
            className={`inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              mode === 'travel'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plane className="w-4 h-4 shrink-0" />
            <span>Travel &amp; Earn</span>
          </button>
        </div>

        {/* Inputs Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-2.5">
            {/* Origin City */}
            <div className="relative">
              <label
                htmlFor="hero-from-city"
                className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 pl-1"
              >
                From City
              </label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
                <input
                  id="hero-from-city"
                  type="text"
                  placeholder="e.g. Mumbai"
                  value={fromCity}
                  onChange={(e) => setFromCity(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 rounded-2xl border border-slate-200 bg-white text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition shadow-xs"
                />
              </div>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center sm:pt-4">
              <button
                type="button"
                onClick={handleSwap}
                className="p-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 hover:text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50/50 shadow-xs transition-all cursor-pointer group"
                title="Swap origin and destination"
              >
                <ArrowRightLeft className="w-4 h-4 transition-transform group-hover:rotate-180" />
              </button>
            </div>

            {/* Destination City */}
            <div className="relative">
              <label
                htmlFor="hero-to-city"
                className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 pl-1"
              >
                To Destination
              </label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-600" />
                <input
                  id="hero-to-city"
                  type="text"
                  placeholder="e.g. Pune"
                  value={toCity}
                  onChange={(e) => setToCity(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 rounded-2xl border border-slate-200 bg-white text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition shadow-xs"
                />
              </div>
            </div>
          </div>

          {/* Date Selector & Submit Button */}
          <div className="grid grid-cols-1 sm:grid-cols-[1.1fr_1fr] gap-2.5 pt-1">
            <div className="relative">
              <label
                htmlFor="hero-travel-date"
                className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 pl-1"
              >
                Travel / Delivery Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="hero-travel-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 rounded-2xl border border-slate-200 bg-white text-sm text-slate-900 font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition shadow-xs"
                />
              </div>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full h-[46px] rounded-2xl font-extrabold text-sm text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-105 shadow-md shadow-emerald-600/25 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" />
                <span>
                  {mode === 'send' ? 'Find Travelers' : 'Find Parcels'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>

        {/* Popular Corridors Quick Filter */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-semibold text-slate-700">Popular Corridors:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_CORRIDORS.map((corridor) => (
              <button
                key={`${corridor.from}-${corridor.to}`}
                type="button"
                onClick={() => handleQuickSelect(corridor.from, corridor.to)}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 transition-all cursor-pointer"
              >
                {corridor.from} → {corridor.to}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
