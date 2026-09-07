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
    <div className="w-full max-w-4xl mx-auto">
      {/* Search Container Card */}
      <div className="rounded-3xl bg-surface/95 backdrop-blur-xl border border-border shadow-2xl p-4 sm:p-6 transition-all">
        {/* Top Mode Switcher */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="inline-flex rounded-2xl bg-surface-elevated p-1 border border-border/80">
            <button
              type="button"
              onClick={() => setMode('send')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                mode === 'send'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>I Want to Send a Parcel</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('travel')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                mode === 'travel'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <Plane className="w-4 h-4" />
              <span>I&apos;m Traveling (Earn Money)</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-primary">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Over 2,400 active monthly routes</span>
          </div>
        </div>

        {/* Inputs Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_1fr] items-center gap-2 sm:gap-2">
            {/* Origin City */}
            <div className="relative">
              <label htmlFor="hero-from-city" className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1 pl-1">
                From
              </label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                <input
                  id="hero-from-city"
                  type="text"
                  placeholder="e.g. Mumbai"
                  value={fromCity}
                  onChange={(e) => setFromCity(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-border bg-background text-sm text-foreground font-medium placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
              </div>
            </div>

            {/* Swap Button */}
            <div className="hidden sm:flex self-end mb-1">
              <button
                type="button"
                onClick={handleSwap}
                className="p-3 rounded-xl border border-border bg-surface text-muted hover:text-foreground hover:bg-surface-elevated transition cursor-pointer"
                title="Swap cities"
                aria-label="Swap origin and destination cities"
              >
                <ArrowRightLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Destination City */}
            <div className="relative">
              <label htmlFor="hero-to-city" className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1 pl-1">
                To
              </label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-accent" />
                <input
                  id="hero-to-city"
                  type="text"
                  placeholder="e.g. Pune"
                  value={toCity}
                  onChange={(e) => setToCity(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-border bg-background text-sm text-foreground font-medium placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
              </div>
            </div>

            {/* Date Picker */}
            <div className="relative">
              <label htmlFor="hero-travel-date" className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1 pl-1">
                Date (Optional)
              </label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  id="hero-travel-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-border bg-background text-sm text-foreground font-medium placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
              </div>
            </div>
          </div>

          {/* Bottom Row: Quick Corridors & Search Action */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border/60">
            {/* Quick Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-muted font-medium">Popular:</span>
              {POPULAR_CORRIDORS.map((corridor) => (
                <button
                  key={`${corridor.from}-${corridor.to}`}
                  type="button"
                  onClick={() => handleQuickSelect(corridor.from, corridor.to)}
                  className="px-2.5 py-1 rounded-lg text-xs bg-surface-elevated hover:bg-primary-subtle text-muted hover:text-primary transition border border-border/70 cursor-pointer"
                >
                  {corridor.from} → {corridor.to}
                </button>
              ))}
            </div>

            {/* Search Submit Button */}
            <button
              type="submit"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary-hover shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>{mode === 'send' ? 'Find Travelers' : 'Find Available Parcels'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
