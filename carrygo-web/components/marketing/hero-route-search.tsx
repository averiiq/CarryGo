'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  ArrowRightLeft,
  Calendar,
  Clock,
  Compass,
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

  // Route calculation based on verified Indian coordinates
  const routeEstimate = useMemo(() => {
    if (!fromCity.trim() || !toCity.trim()) return null
    if (fromCity.trim().toLowerCase() === toCity.trim().toLowerCase()) return null
    return getRouteEstimate(fromCity, toCity)
  }, [fromCity, toCity])

  const handleSwap = () => {
    const temp = fromCity
    setFromCity(toCity)
    setToCity(temp)
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
    <div className="w-full max-w-xl mx-auto lg:mx-0">
      <div className="relative rounded-3xl border border-slate-200/90 bg-white shadow-xl p-5 sm:p-7 overflow-hidden card-hover-elevate">
        {/* Mode Switcher Segmented Control */}
        <div className="grid grid-cols-2 rounded-2xl bg-slate-100/90 p-1.5 border border-slate-200 mb-5">
          <button
            type="button"
            onClick={() => setMode('send')}
            className={`inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              mode === 'send'
                ? 'bg-emerald-700 text-white shadow-xs'
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
                ? 'bg-emerald-700 text-white shadow-xs'
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
            {/* Origin City with Autocomplete */}
            <CityAutocomplete
              id="hero-from-city"
              label="From City (Haryana)"
              placeholder="e.g. Gurugram"
              value={fromCity}
              onChange={setFromCity}
              iconColor="text-emerald-600"
            />

            {/* Swap Button */}
            <div className="flex justify-center sm:pt-4">
              <button
                type="button"
                onClick={handleSwap}
                className="p-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 hover:text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50/50 shadow-xs transition-all cursor-pointer group active:scale-95"
                title="Swap origin and destination"
                aria-label="Swap cities"
              >
                <ArrowRightLeft className="w-4 h-4 transition-transform group-hover:rotate-180 duration-300" />
              </button>
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

          {/* Live Route Intelligence Banner */}
          {routeEstimate && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-1 duration-200 shadow-xs">
              <div className="flex items-center gap-2 text-slate-800">
                <Compass className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold">
                  {routeEstimate.distanceKm} km transit
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-600 flex items-center gap-1.5 font-medium">
                  <Car className="w-3 h-3 text-emerald-600" />
                  ~{routeEstimate.driveHours}h
                  <Train className="w-3 h-3 text-sky-600 ml-1" />
                  ~{routeEstimate.trainHours}h
                </span>
              </div>
              <span className="font-mono font-bold text-emerald-800 bg-white px-2.5 py-1 rounded-xl border border-emerald-200 shadow-xs">
                From ₹{routeEstimate.basePriceEstimate}/kg
              </span>
            </div>
          )}

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
                className="w-full h-[46px] rounded-2xl font-bold text-sm text-white bg-emerald-700 hover:bg-emerald-800 shadow-xs transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 group"
              >
                <Search className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>
                  {mode === 'send' ? 'Find Travelers' : 'Find Parcels'}
                </span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
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
            {POPULAR_CORRIDORS.map((corridor) => {
              const active = isCurrentCorridor(corridor.from, corridor.to)
              return (
                <button
                  key={`${corridor.from}-${corridor.to}`}
                  type="button"
                  onClick={() => handleQuickSelect(corridor.from, corridor.to)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    active
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <span>{corridor.from} → {corridor.to}</span>
                  <span className={`text-[9px] px-1 rounded ${active ? 'bg-emerald-700 text-white' : 'bg-white text-slate-500'}`}>
                    {corridor.tag}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
