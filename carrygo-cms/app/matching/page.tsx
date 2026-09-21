'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  ArrowRight,
  Package,
  Car,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Calendar,
  DollarSign,
  Weight,
  MapPin,
  RefreshCw,
  Loader2,
  Send,
  Info,
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { CityAutocomplete } from '@/components/ui/city-autocomplete'
import { RequestIntentForm } from '@/components/marketing/request-intent-form'
import {
  Trip,
  Parcel,
  scoreMatch,
  findBestMatches,
  findBestParcelsForTrip,
  diagnoseParcelTripMatching,
  mapDbTripToDomain,
  mapDbParcelToDomain,
  MatchingDiagnostic,
  RankedTripMatch,
  RankedParcelMatch,
} from '@/lib/smart-matching'
import { getRouteEstimate } from '@/lib/indian-cities'

export default function SmartMatchingPage() {
  const [mode, setMode] = useState<'sender' | 'traveler'>('sender')
  const [loading, setLoading] = useState(true)
  const [trips, setTrips] = useState<Trip[]>([])
  const [parcels, setParcels] = useState<Parcel[]>([])
  const [userParcels, setUserParcels] = useState<Parcel[]>([])
  const [userTrips, setUserTrips] = useState<Trip[]>([])
  const [selectedUserListingId, setSelectedUserListingId] = useState<string>('')

  // Custom search form inputs
  const [fromCity, setFromCity] = useState('Hisar')
  const [toCity, setToCity] = useState('Delhi')
  const [weight, setWeight] = useState(2)
  const [priceOffer, setPriceOffer] = useState(200)
  const [deliveryDate, setDeliveryDate] = useState('')
  const [availableCapacity, setAvailableCapacity] = useState(10)
  const [pricePerKg, setPricePerKg] = useState(60)

  // Load trips, parcels, and user's own items
  const loadData = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // 1. Fetch real active trips & parcels from public APIs
      const [tripsRes, parcelsRes] = await Promise.all([
        fetch('/api/public/trips?limit=100').then((r) => r.json()),
        fetch('/api/public/parcels?limit=100').then((r) => r.json()),
      ])

      const dbTrips = tripsRes.trips || []
      const dbParcels = parcelsRes.parcels || []

      const domainTrips: Trip[] = dbTrips.map(mapDbTripToDomain)
      const domainParcels: Parcel[] = dbParcels.map(mapDbParcelToDomain)

      setTrips(domainTrips)
      setParcels(domainParcels)

      // Default corridor to first available real trip or parcel
      if (domainTrips.length > 0) {
        setFromCity(domainTrips[0].fromCity)
        setToCity(domainTrips[0].toCity)
        setPricePerKg(domainTrips[0].pricePerKg)
        setAvailableCapacity(domainTrips[0].availableCapacity)
      } else if (domainParcels.length > 0) {
        setFromCity(domainParcels[0].fromCity)
        setToCity(domainParcels[0].toCity)
        setWeight(domainParcels[0].weight)
        setPriceOffer(domainParcels[0].priceOffer)
      }

      if (user?.id) {
        const myParcels = domainParcels.filter((p) => p.userId === user.id)
        const myTrips = domainTrips.filter((t) => t.userId === user.id)
        setUserParcels(myParcels)
        setUserTrips(myTrips)

        if (mode === 'sender' && myParcels.length > 0) {
          setSelectedUserListingId(myParcels[0].id)
          setFromCity(myParcels[0].fromCity)
          setToCity(myParcels[0].toCity)
          setWeight(myParcels[0].weight)
          setPriceOffer(myParcels[0].priceOffer)
        } else if (mode === 'traveler' && myTrips.length > 0) {
          setSelectedUserListingId(myTrips[0].id)
          setFromCity(myTrips[0].fromCity)
          setToCity(myTrips[0].toCity)
          setAvailableCapacity(myTrips[0].availableCapacity)
          setPricePerKg(myTrips[0].pricePerKg)
        }
      }
    } catch (err) {
      console.error('Failed to load matching candidates:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  // Handle user listing selection
  const handleSelectUserListing = (id: string) => {
    setSelectedUserListingId(id)
    if (mode === 'sender') {
      const p = userParcels.find((item) => item.id === id)
      if (p) {
        setFromCity(p.fromCity)
        setToCity(p.toCity)
        setWeight(p.weight)
        setPriceOffer(p.priceOffer)
      }
    } else {
      const t = userTrips.find((item) => item.id === id)
      if (t) {
        setFromCity(t.fromCity)
        setToCity(t.toCity)
        setAvailableCapacity(t.availableCapacity)
        setPricePerKg(t.pricePerKg)
      }
    }
  }

  // Active Parcel under evaluation
  const activeParcel: Parcel = useMemo(() => {
    return {
      id: selectedUserListingId || 'custom-parcel',
      userId: 'active-session-user',
      fromCity,
      toCity,
      weight,
      priceOffer,
      deliveryDate: deliveryDate || undefined,
      status: 'open',
      createdAt: new Date().toISOString(),
    }
  }, [selectedUserListingId, fromCity, toCity, weight, priceOffer, deliveryDate])

  // Active Trip under evaluation
  const activeTrip: Trip = useMemo(() => {
    return {
      id: selectedUserListingId || 'custom-trip',
      userId: 'active-session-user',
      fromCity,
      toCity,
      date: new Date().toISOString().split('T')[0],
      totalCapacity: availableCapacity,
      availableCapacity,
      pricePerKg,
      status: 'active',
      userRating: 4.8,
    }
  }, [selectedUserListingId, fromCity, toCity, availableCapacity, pricePerKg])

  // Match calculations
  const tripMatches: RankedTripMatch[] = useMemo(() => {
    if (mode !== 'sender') return []
    return findBestMatches(activeParcel, trips, { minScore: 20, limit: 15 })
  }, [mode, activeParcel, trips])

  const parcelMatches: RankedParcelMatch[] = useMemo(() => {
    if (mode !== 'traveler') return []
    return findBestParcelsForTrip(activeTrip, parcels, { minScore: 20, limit: 15 })
  }, [mode, activeTrip, parcels])

  // Diagnostics for zero or weak matches
  const diagnostic: MatchingDiagnostic | null = useMemo(() => {
    if (mode === 'sender') {
      if (tripMatches.length === 0 || tripMatches[0].score.total < 40) {
        return diagnoseParcelTripMatching(activeParcel, trips)
      }
    }
    return null
  }, [mode, tripMatches, activeParcel, trips])

  const routeEst = getRouteEstimate(fromCity, toCity)

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero Header */}
      <div className="border-b border-border/40 bg-gradient-to-b from-surface via-surface/80 to-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Multi-Factor Algorithmic Routing Engine</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground">
            Smart Corridor Matchmaking
          </h1>

          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            Our algorithmic engine continuously cross-evaluates route proximity (30%), schedule
            alignment (20%), capacity fit (15%), price compatibility (15%), and user
            reliability (20%) to match packages with travelers along Indian transit corridors.
          </p>

          {/* Mode Switcher */}
          <div className="pt-2 flex justify-center">
            <div className="p-1 rounded-2xl bg-surface border border-border/60 shadow-sm inline-flex">
              <button
                onClick={() => {
                  setMode('sender')
                  setSelectedUserListingId('')
                }}
                className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition inline-flex items-center gap-2 ${
                  mode === 'sender'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>I Have a Parcel (Find Travelers)</span>
              </button>

              <button
                onClick={() => {
                  setMode('traveler')
                  setSelectedUserListingId('')
                }}
                className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition inline-flex items-center gap-2 ${
                  mode === 'traveler'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Car className="w-4 h-4" />
                <span>I Am a Traveler (Find Parcels)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Corridor & Parameters Configuration */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-border/60 bg-surface shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-heading font-semibold text-foreground flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-primary" />
                  <span>Matching Parameters</span>
                </h2>
                <button
                  onClick={() => void loadData()}
                  title="Reload listings"
                  className="w-7 h-7 rounded-lg border border-border/60 bg-surface hover:bg-surface-hover flex items-center justify-center text-muted-foreground hover:text-foreground transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* User Listings Pre-select if available */}
              {mode === 'sender' && userParcels.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Select Your Open Parcel
                  </label>
                  <select
                    value={selectedUserListingId}
                    onChange={(e) => handleSelectUserListing(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border/70 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Custom Parcel Details</option>
                    {userParcels.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fromCity} → {p.toCity} ({p.weight}kg, ₹{p.priceOffer})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {mode === 'traveler' && userTrips.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Select Your Active Trip
                  </label>
                  <select
                    value={selectedUserListingId}
                    onChange={(e) => handleSelectUserListing(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border/70 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Custom Journey Details</option>
                    {userTrips.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fromCity} → {t.toCity} ({t.availableCapacity}kg free, ₹{t.pricePerKg}
                        /kg)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* City Autocompletes */}
              <div className="space-y-3">
                <CityAutocomplete
                  label="Origin City"
                  value={fromCity}
                  onChange={setFromCity}
                  placeholder="Select pickup city..."
                />
                <CityAutocomplete
                  label="Destination City"
                  value={toCity}
                  onChange={setToCity}
                  placeholder="Select dropoff city..."
                />
              </div>

              {/* Route Estimate Banner */}
              {routeEst && (
                <div className="p-3 rounded-xl bg-surface-subtle/50 border border-border/40 text-[11px] text-muted-foreground flex items-center justify-between">
                  <span>Corridor: {routeEst.distanceKm} km</span>
                  <span>Est: ~{routeEst.driveHours}h road</span>
                </div>
              )}

              {/* Numerical Inputs depending on mode */}
              {mode === 'sender' ? (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      min={0.5}
                      step={0.5}
                      value={weight}
                      onChange={(e) => setWeight(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border/70 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Offer (₹)
                    </label>
                    <input
                      type="number"
                      min={50}
                      step={20}
                      value={priceOffer}
                      onChange={(e) => setPriceOffer(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border/70 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Free Space (kg)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={availableCapacity}
                      onChange={(e) => setAvailableCapacity(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border/70 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Rate (₹/kg)
                    </label>
                    <input
                      type="number"
                      min={20}
                      step={10}
                      value={pricePerKg}
                      onChange={(e) => setPricePerKg(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border/70 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Smart Matching Algorithm Weights Explainer */}
            <div className="p-5 rounded-2xl border border-border/60 bg-surface text-xs space-y-3">
              <h3 className="font-semibold text-foreground flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-primary" />
                <span>How Scores Are Weighted</span>
              </h3>
              <div className="space-y-1.5 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Route Proximity & Detour:</span>
                  <span className="font-bold text-foreground">30%</span>
                </div>
                <div className="flex justify-between">
                  <span>Schedule & Date Gap:</span>
                  <span className="font-bold text-foreground">20%</span>
                </div>
                <div className="flex justify-between">
                  <span>Luggage Capacity Fit:</span>
                  <span className="font-bold text-foreground">15%</span>
                </div>
                <div className="flex justify-between">
                  <span>Price Equilibrium:</span>
                  <span className="font-bold text-foreground">15%</span>
                </div>
                <div className="flex justify-between">
                  <span>Verified Rating & Trust:</span>
                  <span className="font-bold text-foreground">20%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Ranked Matches & Diagnostics (Col Span 2) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header of Results */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-heading font-semibold text-foreground">
                  {mode === 'sender' ? 'Ranked Traveler Matches' : 'Ranked Available Parcels'}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {mode === 'sender'
                    ? `Showing active travel companions for ${fromCity} → ${toCity}`
                    : `Showing open parcels ready for pickup along ${fromCity} → ${toCity}`}
                </p>
              </div>

              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                {mode === 'sender' ? tripMatches.length : parcelMatches.length} Matches Found
              </span>
            </div>

            {/* Loading state */}
            {loading && (
              <div className="p-12 rounded-2xl border border-border/60 bg-surface flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground font-medium">
                  Running multi-factor corridor analysis...
                </p>
              </div>
            )}

            {/* SENDER MODE: List of Ranked Trips */}
            {!loading && mode === 'sender' && tripMatches.length > 0 && (
              <div className="space-y-4">
                {tripMatches.map(({ trip: t, score }) => (
                  <div
                    key={t.id}
                    className="p-5 rounded-2xl border border-border/60 bg-surface hover:border-primary/40 transition shadow-sm space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Trip info */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-heading font-bold text-foreground">
                            {t.fromCity} → {t.toCity}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              score.grade === 'excellent'
                                ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                                : score.grade === 'good'
                                  ? 'bg-sky-500/15 text-sky-500 border border-sky-500/30'
                                  : 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                            }`}
                          >
                            {score.grade} ({score.total}%)
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Departure: <span className="font-semibold text-foreground">{t.date}</span>
                          {t.time ? ` at ${t.time}` : ''} • Available:{' '}
                          <span className="font-semibold text-foreground">
                            {t.availableCapacity} kg
                          </span>{' '}
                          • Rate: ₹{t.pricePerKg}/kg
                        </p>
                      </div>

                      {/* Match Score Badge */}
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-xl font-heading font-bold text-primary">
                            {score.total}%
                          </span>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">
                            Match Score
                          </span>
                        </div>

                        {/* Direct Action */}
                        <RequestIntentForm
                          mode="trip"
                          tripId={t.id}
                          suggestedPrice={priceOffer}
                          fromCity={fromCity}
                          toCity={toCity}
                        />
                      </div>
                    </div>

                    {/* Breakdown Progress Bars */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/40 text-[11px]">
                      <div>
                        <span className="text-muted-foreground block">Route Proximity</span>
                        <div className="h-1.5 w-full bg-surface-subtle rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${score.breakdown.routeScore}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Date Alignment</span>
                        <div className="h-1.5 w-full bg-surface-subtle rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-sky-500"
                            style={{ width: `${score.breakdown.dateScore}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Capacity Fit</span>
                        <div className="h-1.5 w-full bg-surface-subtle rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-emerald-500"
                            style={{ width: `${score.breakdown.capacityScore}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Price Fit</span>
                        <div className="h-1.5 w-full bg-surface-subtle rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-amber-500"
                            style={{ width: `${score.breakdown.priceScore}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TRAVELER MODE: List of Ranked Parcels */}
            {!loading && mode === 'traveler' && parcelMatches.length > 0 && (
              <div className="space-y-4">
                {parcelMatches.map(({ parcel: p, score }) => (
                  <div
                    key={p.id}
                    className="p-5 rounded-2xl border border-border/60 bg-surface hover:border-primary/40 transition shadow-sm space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-heading font-bold text-foreground">
                            {p.fromCity} → {p.toCity}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              score.grade === 'excellent'
                                ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                                : score.grade === 'good'
                                  ? 'bg-sky-500/15 text-sky-500 border border-sky-500/30'
                                  : 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                            }`}
                          >
                            {score.grade} ({score.total}%)
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Category: {p.category || 'Parcel'} • Weight:{' '}
                          <span className="font-semibold text-foreground">{p.weight} kg</span> •
                          Reward:{' '}
                          <span className="font-semibold text-emerald-500">₹{p.priceOffer}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-xl font-heading font-bold text-primary">
                            {score.total}%
                          </span>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">
                            Match Score
                          </span>
                        </div>

                        <RequestIntentForm
                          mode="parcel"
                          parcelId={p.id}
                          suggestedPrice={p.priceOffer}
                          fromCity={p.fromCity}
                          toCity={p.toCity}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Diagnostic Box: Appears when 0 matches or poor match quality */}
            {!loading && diagnostic && (
              <div className="p-6 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-surface shadow-sm space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-heading font-semibold text-foreground">
                      {diagnostic.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {diagnostic.explanation}
                    </p>
                  </div>
                </div>

                {/* Diagnostic Recommended Actions */}
                <div className="pt-2 border-t border-amber-500/20 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                    Recommended Actions to Secure a Match:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {diagnostic.actions.map((act) => (
                      <div
                        key={act.id}
                        className="p-3 rounded-xl bg-surface border border-border/70 hover:border-primary/50 transition space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground">{act.label}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <p className="text-[11px] text-muted-foreground">{act.hint}</p>
                      </div>
                    ))}
                  </div>

                  {/* Fallback CTAs */}
                  <div className="pt-3 flex flex-wrap gap-3">
                    <Link
                      href={`/create-parcel?from=${encodeURIComponent(fromCity)}&to=${encodeURIComponent(toCity)}&weight=${weight}&price=${priceOffer}`}
                      className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:opacity-95 transition inline-flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Post Open Parcel Request</span>
                    </Link>
                    <Link
                      href={`/search?from=${encodeURIComponent(fromCity)}&to=${encodeURIComponent(toCity)}`}
                      className="px-4 py-2 rounded-xl border border-border/70 bg-surface hover:bg-surface-hover text-foreground font-semibold text-xs transition"
                    >
                      Browse All Corridor Listings
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
