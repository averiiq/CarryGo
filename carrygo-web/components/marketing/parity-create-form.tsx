'use client'

import { FormEvent, useMemo, useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock,
  Coins,
  Compass,
  FileText,
  Loader2,
  Lock,
  MapPin,
  Package2,
  Plane,
  Route,
  ShieldCheck,
  Sparkles,
  Train,
  Truck,
  UploadCloud,
  X,
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { CityAutocomplete } from '@/components/ui/city-autocomplete'
import { getRouteEstimate } from '@/lib/indian-cities'

type Mode = 'trip' | 'parcel'

type Props = {
  mode: Mode
}

type SubmitState = {
  kind: 'idle' | 'success' | 'error'
  message?: string
  createdId?: string
}

const VEHICLE_TYPES = [
  { value: 'bike', label: 'Bike / Two Wheeler', icon: Truck },
  { value: 'car', label: 'Car / Cab', icon: Truck },
  { value: 'train', label: 'Indian Railways (Train)', icon: Train },
  { value: 'bus', label: 'Interstate Bus', icon: Truck },
  { value: 'flight', label: 'Flight', icon: Plane },
]

const PARCEL_CATEGORIES = [
  { value: 'documents', label: 'Legal & Business Documents' },
  { value: 'electronics', label: 'Electronics & Gadgets' },
  { value: 'clothing', label: 'Clothing & Apparels' },
  { value: 'food', label: 'Packaged Non-Perishables' },
  { value: 'medicine', label: 'Prescription Medicines' },
  { value: 'other', label: 'General Goods / Gifts' },
]

function toTomorrowDateKey() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toISOString().slice(0, 10)
}

export function ParityCreateForm({ mode }: Props) {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-500">Loading form...</div>}>
      <ParityCreateFormInner mode={mode} />
    </Suspense>
  )
}

function ParityCreateFormInner({ mode }: Props) {
  const searchParams = useSearchParams()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: 'idle' })
  const [authChecking, setAuthChecking] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userName, setUserName] = useState('')

  // Form Fields - Pre-populated from URL query params if present
  const [fromCity, setFromCity] = useState(searchParams.get('from') || '')
  const [toCity, setToCity] = useState(searchParams.get('to') || '')
  const [date, setDate] = useState(toTomorrowDateKey())
  const [time, setTime] = useState('09:00')
  const [vehicleType, setVehicleType] = useState('train')
  const [availableCapacity, setAvailableCapacity] = useState('10')
  const [pricePerKg, setPricePerKg] = useState(searchParams.get('price') || '150')

  const [deliveryDate, setDeliveryDate] = useState(toTomorrowDateKey())
  const [category, setCategory] = useState(searchParams.get('category') || 'electronics')
  const [description, setDescription] = useState('')
  const [weight, setWeight] = useState(searchParams.get('weight') || '2')
  const [priceOffer, setPriceOffer] = useState(searchParams.get('price') || '450')
  const [isFragile, setIsFragile] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  // Route Intelligence & Suggestions
  const routeEstimate = useMemo(() => {
    if (!fromCity.trim() || !toCity.trim()) return null
    if (fromCity.trim().toLowerCase() === toCity.trim().toLowerCase()) return null
    return getRouteEstimate(fromCity, toCity)
  }, [fromCity, toCity])

  // Check auth state and check for saved drafts
  useEffect(() => {
    const supabase = createClient()
    const checkAuth = async () => {
      setAuthChecking(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setIsLoggedIn(true)
        const name = (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'User'
        setUserName(name)
      } else {
        setIsLoggedIn(false)
      }
      setAuthChecking(false)

      // Restore saved draft from sessionStorage if available
      try {
        const draftKey = `carrygo_draft_${mode}`
        const saved = sessionStorage.getItem(draftKey)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed.fromCity && !fromCity) setFromCity(parsed.fromCity)
          if (parsed.toCity && !toCity) setToCity(parsed.toCity)
          if (parsed.description) setDescription(parsed.description)
          if (parsed.category) setCategory(parsed.category)
          if (parsed.weight) setWeight(parsed.weight)
          if (parsed.priceOffer) setPriceOffer(parsed.priceOffer)
          if (parsed.pricePerKg) setPricePerKg(parsed.pricePerKg)
          if (parsed.availableCapacity) setAvailableCapacity(parsed.availableCapacity)
        }
      } catch {
        // Ignore session read errors
      }
    }
    void checkAuth()
  }, [mode])

  // Auto-update price suggestions when route estimate updates
  useEffect(() => {
    if (routeEstimate) {
      if (mode === 'trip' && (!searchParams.get('price') || pricePerKg === '150')) {
        setPricePerKg(String(routeEstimate.basePriceEstimate))
      } else if (mode === 'parcel' && (!searchParams.get('price') || priceOffer === '450')) {
        const est = Math.round(routeEstimate.basePriceEstimate * Number(weight || 1) + 80)
        setPriceOffer(String(est))
      }
    }
  }, [routeEstimate, mode])

  const title = useMemo(() => (mode === 'trip' ? 'Post a Travel Itinerary' : 'Send a Parcel Request'), [mode])

  const validateBase = () => {
    if (!fromCity.trim() || !toCity.trim()) {
      return 'Origin and destination cities are required.'
    }
    if (fromCity.trim().toLowerCase() === toCity.trim().toLowerCase()) {
      return 'Origin and destination cities cannot be the same.'
    }
    return null
  }

  // Handle file selection with Base64 Data URL conversion
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setSubmitState({ kind: 'error', message: 'Image file size exceeds 5MB limit.' })
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImageUrl(reader.result)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  // Save current form state to sessionStorage
  const saveDraft = () => {
    try {
      const draftKey = `carrygo_draft_${mode}`
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          fromCity,
          toCity,
          date,
          time,
          vehicleType,
          availableCapacity,
          pricePerKg,
          deliveryDate,
          category,
          description,
          weight,
          priceOffer,
          isFragile,
        })
      )
    } catch {
      // Ignore sessionStorage errors
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitState({ kind: 'idle' })

    const baseError = validateBase()
    if (baseError) {
      setSubmitState({ kind: 'error', message: baseError })
      return
    }

    if (mode === 'trip') {
      if (!date || !time) {
        setSubmitState({ kind: 'error', message: 'Travel date and departure time are required.' })
        return
      }
      if (Number(availableCapacity) <= 0 || Number(pricePerKg) < 0) {
        setSubmitState({ kind: 'error', message: 'Available capacity must be > 0 and price cannot be negative.' })
        return
      }
    }

    if (mode === 'parcel') {
      if (!deliveryDate || !description.trim()) {
        setSubmitState({ kind: 'error', message: 'Expected delivery date and description are required.' })
        return
      }
      if (Number(weight) <= 0 || Number(priceOffer) < 0) {
        setSubmitState({ kind: 'error', message: 'Weight must be > 0 and reward offer cannot be negative.' })
        return
      }
    }

    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        saveDraft()
        setSubmitState({
          kind: 'error',
          message: 'Please sign in to publish your listing to the network. Your draft has been saved.',
        })
        setIsSubmitting(false)
        return
      }

      const activeUserName =
        userName ||
        (user.user_metadata?.full_name as string | undefined) ||
        user.email?.split('@')[0] ||
        'CarryGo Member'

      if (mode === 'trip') {
        const { data: tripData, error } = await supabase
          .from('trips')
          .insert({
            user_id: user.id,
            user_name: activeUserName,
            user_rating: 5,
            from_city: fromCity.trim(),
            to_city: toCity.trim(),
            date,
            time,
            vehicle_type: vehicleType,
            available_capacity: Number(availableCapacity),
            price_per_kg: Number(pricePerKg),
            status: 'active',
          })
          .select('id')
          .single()

        if (error) throw error

        try {
          sessionStorage.removeItem(`carrygo_draft_${mode}`)
        } catch {}

        setSubmitState({
          kind: 'success',
          message: 'Your trip itinerary is now published and visible to senders looking for fast delivery!',
          createdId: tripData?.id,
        })
        return
      }

      const { data: parcelData, error } = await supabase
        .from('parcels')
        .insert({
          user_id: user.id,
          user_name: activeUserName,
          from_city: fromCity.trim(),
          to_city: toCity.trim(),
          category,
          description: description.trim() + (isFragile ? ' [FRAGILE - HANDLE WITH CARE]' : ''),
          delivery_date: deliveryDate,
          weight: Number(weight),
          price_offer: Number(priceOffer),
          image_url: imageUrl || null,
          status: 'open',
        })
        .select('id')
        .single()

      if (error) throw error

      try {
        sessionStorage.removeItem(`carrygo_draft_${mode}`)
      } catch {}

      setSubmitState({
        kind: 'success',
        message: 'Your parcel request has been posted! Travelers on this route can now match with you.',
        createdId: parcelData?.id,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Database request failed.'
      setSubmitState({
        kind: 'error',
        message: `Submission failed: ${message}`,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Success Celebration View
  if (submitState.kind === 'success') {
    return (
      <section className="glass-card mx-auto w-full max-w-2xl rounded-3xl p-8 md:p-12 text-center border border-emerald-200 bg-white/95 shadow-2xl space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-200">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">
            {mode === 'trip' ? 'Trip Published' : 'Parcel Request Live'}
          </span>
          <h2 className="text-2xl md:text-3xl font-heading font-extrabold text-slate-900">
            {mode === 'trip' ? 'Ready to Earn on Your Route!' : 'Your Parcel is Live on the Network!'}
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            {submitState.message}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs max-w-md mx-auto">
          <span className="text-slate-500 font-medium">Route:</span>
          <span className="font-bold text-slate-900">{fromCity} ➔ {toCity}</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Link
            href="/activity"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/25 transition active:scale-95 text-center"
          >
            View in My Deliveries
          </Link>
          <Link
            href={`/search?from=${encodeURIComponent(fromCity)}&to=${encodeURIComponent(toCity)}`}
            className="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-sm transition text-center"
          >
            Find Matching {mode === 'trip' ? 'Parcels' : 'Travelers'}
          </Link>
          <button
            type="button"
            onClick={() => setSubmitState({ kind: 'idle' })}
            className="w-full sm:w-auto px-5 py-3 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer"
          >
            Post Another
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="glass-card mx-auto w-full max-w-3xl rounded-3xl p-6 md:p-10 border border-slate-200/90 bg-white/95 shadow-xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3.5">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-xs">
            {mode === 'trip' ? <Route className="h-6 w-6" /> : <Package2 className="h-6 w-6" />}
          </span>
          <div>
            <h2 className="text-2xl font-heading font-extrabold tracking-tight text-slate-900">{title}</h2>
            <p className="text-xs text-slate-500">
              {mode === 'trip'
                ? 'Monetize spare luggage capacity on your upcoming journey.'
                : 'Send your parcel safely with a verified traveler heading the same direction.'}
            </p>
          </div>
        </div>

        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5" /> Escrow Protected
        </span>
      </div>

      {/* Unauthenticated Alert Callout with Saved Draft Guarantee */}
      {!authChecking && !isLoggedIn && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-emerald-950 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-emerald-600" />
              Sign-in to Publish Listing
            </span>
            <Link
              href={`/login?next=${mode === 'trip' ? '/create-trip' : '/create-parcel'}`}
              onClick={saveDraft}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-xs transition"
            >
              Sign In / Register
            </Link>
          </div>
          <p className="text-emerald-900/80 leading-relaxed text-[11px]">
            You can fill out all details below. When you click publish, you will be prompted to sign in and your form details will be automatically restored without any data loss.
          </p>
        </div>
      )}

      {submitState.kind === 'error' && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800 flex items-center gap-2">
          <X className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{submitState.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Route Section with Autocomplete */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            Route Specifications
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CityAutocomplete
              id="create-from-city"
              label="Origin City"
              placeholder="e.g. Mumbai"
              value={fromCity}
              onChange={setFromCity}
              iconColor="text-emerald-600"
              required
            />
            <CityAutocomplete
              id="create-to-city"
              label="Destination City"
              placeholder="e.g. Pune"
              value={toCity}
              onChange={setToCity}
              iconColor="text-sky-600"
              required
            />
          </div>

          {/* Route Estimate Card */}
          {routeEstimate && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-slate-800">
                <Compass className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold">{routeEstimate.distanceKm} km route</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-600">
                  ~{routeEstimate.driveHours}h road / ~{routeEstimate.trainHours}h rail
                </span>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-lg border border-emerald-200">
                Benchmark: ₹{routeEstimate.basePriceEstimate}/kg
              </span>
            </div>
          )}
        </div>

        {/* TRIP MODE SPECIFIC FIELDS */}
        {mode === 'trip' && (
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              Travel Itinerary &amp; Capacity
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-700">Travel Date</span>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:bg-white focus:border-emerald-500 transition"
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-700">Departure Time</span>
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:bg-white focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">Mode of Transport</span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {VEHICLE_TYPES.map((v) => {
                  const Icon = v.icon
                  const selected = vehicleType === v.value
                  return (
                    <button
                      key={v.value}
                      type="button"
                      onClick={() => setVehicleType(v.value)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition cursor-pointer ${
                        selected
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold shadow-xs'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600 text-xs'
                      }`}
                    >
                      <Icon className={`w-5 h-5 mb-1 ${selected ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span className="text-xs">{v.label.split(' ')[0]}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-700">Spare Capacity (kg)</span>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  required
                  value={availableCapacity}
                  onChange={(e) => setAvailableCapacity(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:bg-white focus:border-emerald-500 transition font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-700">Price per kg (₹)</span>
                <input
                  type="number"
                  min="10"
                  step="5"
                  required
                  value={pricePerKg}
                  onChange={(e) => setPricePerKg(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:bg-white focus:border-emerald-500 transition font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* PARCEL MODE SPECIFIC FIELDS */}
        {mode === 'parcel' && (
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Package2 className="w-3.5 h-3.5 text-emerald-600" />
              Package Details &amp; Reward
            </label>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:bg-white focus:border-emerald-500 transition"
              >
                {PARCEL_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">Description of Contents</span>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe package contents (e.g. Laptop in bubblewrap, sealed legal paperwork, winter jacket)"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:bg-white focus:border-emerald-500 transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-700">Approx Weight (kg)</span>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  required
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:bg-white focus:border-emerald-500 transition font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-700">Reward Offer (₹)</span>
                <input
                  type="number"
                  min="50"
                  step="10"
                  required
                  value={priceOffer}
                  onChange={(e) => setPriceOffer(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:bg-white focus:border-emerald-500 transition font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-700">Deliver By Date</span>
                <input
                  type="date"
                  required
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:bg-white focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                id="fragile"
                type="checkbox"
                checked={isFragile}
                onChange={(e) => setIsFragile(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <label htmlFor="fragile" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Handle with Care (Fragile or Sensitive Item)
              </label>
            </div>

            {/* Photo Upload Preview */}
            <div className="space-y-1.5 pt-2">
              <span className="text-xs font-semibold text-slate-700">Package Photo (Optional)</span>
              {imageUrl ? (
                <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-slate-200 group shadow-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt="Package preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageUrl(null)}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-slate-900/70 text-white hover:bg-slate-900 transition"
                    title="Remove photo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-4 hover:border-emerald-400 hover:bg-emerald-50/30 transition cursor-pointer">
                  <Camera className="w-6 h-6 text-slate-400 mb-1" />
                  <span className="text-xs font-semibold text-slate-700">Click to upload photo</span>
                  <span className="text-[10px] text-slate-400">PNG, JPG up to 5MB</span>
                  <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                </label>
              )}
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {mode === 'trip' ? (
              <span>Potential Earnings: <strong className="text-slate-900 font-mono">₹{Number(availableCapacity || 0) * Number(pricePerKg || 0)}</strong></span>
            ) : (
              <span>Estimated Delivery Reward: <strong className="text-slate-900 font-mono">₹{priceOffer}</strong></span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-md shadow-emerald-600/25 hover:brightness-105 active:scale-95 transition disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Publishing...</span>
              </>
            ) : (
              <>
                <span>{mode === 'trip' ? 'Publish Travel Plan' : 'Publish Parcel Request'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  )
}
