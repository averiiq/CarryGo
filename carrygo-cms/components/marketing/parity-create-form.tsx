'use client'

import { FormEvent, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Loader2, MapPin, Package2, Route } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

type Mode = 'trip' | 'parcel'

type Props = {
  mode: Mode
}

type SubmitState = {
  kind: 'idle' | 'success' | 'error'
  message?: string
}

const VEHICLE_TYPES = [
  { value: 'bike', label: 'Bike' },
  { value: 'car', label: 'Car' },
  { value: 'bus', label: 'Bus' },
  { value: 'train', label: 'Train' },
]

const PARCEL_CATEGORIES = [
  { value: 'documents', label: 'Documents' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'food', label: 'Food' },
  { value: 'medicine', label: 'Medicine' },
  { value: 'other', label: 'Other' },
]

function toTomorrowDateKey() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toISOString().slice(0, 10)
}

export function ParityCreateForm({ mode }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: 'idle' })

  const [fromCity, setFromCity] = useState('')
  const [toCity, setToCity] = useState('')

  const [date, setDate] = useState(toTomorrowDateKey())
  const [time, setTime] = useState('09:00')
  const [vehicleType, setVehicleType] = useState('car')
  const [availableCapacity, setAvailableCapacity] = useState('10')
  const [pricePerKg, setPricePerKg] = useState('120')

  const [deliveryDate, setDeliveryDate] = useState(toTomorrowDateKey())
  const [category, setCategory] = useState('documents')
  const [description, setDescription] = useState('')
  const [weight, setWeight] = useState('1')
  const [priceOffer, setPriceOffer] = useState('200')

  const title = useMemo(() => (mode === 'trip' ? 'Create Trip (Web)' : 'Create Parcel (Web)'), [mode])

  const validateBase = () => {
    if (!fromCity.trim() || !toCity.trim()) {
      return 'Origin and destination are required.'
    }
    if (fromCity.trim().toLowerCase() === toCity.trim().toLowerCase()) {
      return 'Origin and destination must be different.'
    }
    return null
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
        setSubmitState({ kind: 'error', message: 'Travel date and time are required.' })
        return
      }
      if (Number(availableCapacity) <= 0 || Number(pricePerKg) < 0) {
        setSubmitState({ kind: 'error', message: 'Capacity must be > 0 and price cannot be negative.' })
        return
      }
    }

    if (mode === 'parcel') {
      if (!deliveryDate || !description.trim()) {
        setSubmitState({ kind: 'error', message: 'Delivery date and description are required.' })
        return
      }
      if (Number(weight) <= 0 || Number(priceOffer) < 0) {
        setSubmitState({ kind: 'error', message: 'Weight must be > 0 and offer cannot be negative.' })
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
        setSubmitState({
          kind: 'error',
          message: 'No active user session found on web. Please use the mobile app login for now.',
        })
        return
      }

      const userName =
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        user.email ||
        'CarryGo user'

      if (mode === 'trip') {
        const { error } = await supabase.from('trips').insert({
          user_id: user.id,
          user_name: userName,
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

        if (error) throw error

        setSubmitState({ kind: 'success', message: 'Trip created successfully from website.' })
        return
      }

      const { error } = await supabase.from('parcels').insert({
        user_id: user.id,
        user_name: userName,
        from_city: fromCity.trim(),
        to_city: toCity.trim(),
        category,
        description: description.trim(),
        delivery_date: deliveryDate,
        weight: Number(weight),
        price_offer: Number(priceOffer),
        status: 'open',
      })

      if (error) throw error

      setSubmitState({ kind: 'success', message: 'Parcel created successfully from website.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request failed.'
      setSubmitState({
        kind: 'error',
        message: `Submission failed: ${message}`,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className='glass-card mx-auto w-full max-w-3xl rounded-3xl p-6 md:p-8'>
      <div className='mb-5 flex items-center gap-3'>
        <span className='inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-subtle text-primary'>
          {mode === 'trip' ? <Route className='h-5 w-5' /> : <Package2 className='h-5 w-5' />}
        </span>
        <div>
          <h2 className='text-2xl font-heading font-bold tracking-tight text-foreground'>{title}</h2>
          <p className='text-sm text-muted'>App-parity workflow on web using the same core data model.</p>
        </div>
      </div>

      <form className='space-y-5' onSubmit={handleSubmit}>
        <div className='grid gap-4 md:grid-cols-2'>
          <label className='space-y-2'>
            <span className='text-sm font-medium text-foreground'>From City</span>
            <input
              value={fromCity}
              onChange={(event) => setFromCity(event.target.value)}
              className='w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary/45'
              placeholder='e.g., Mumbai'
              required
            />
          </label>

          <label className='space-y-2'>
            <span className='text-sm font-medium text-foreground'>To City</span>
            <input
              value={toCity}
              onChange={(event) => setToCity(event.target.value)}
              className='w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary/45'
              placeholder='e.g., Pune'
              required
            />
          </label>
        </div>

        {mode === 'trip' ? (
          <>
            <div className='grid gap-4 md:grid-cols-2'>
              <label className='space-y-2'>
                <span className='text-sm font-medium text-foreground'>Travel Date</span>
                <input
                  type='date'
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className='w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary/45'
                  required
                />
              </label>

              <label className='space-y-2'>
                <span className='text-sm font-medium text-foreground'>Travel Time</span>
                <input
                  type='time'
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  className='w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary/45'
                  required
                />
              </label>
            </div>

            <div className='grid gap-4 md:grid-cols-3'>
              <label className='space-y-2'>
                <span className='text-sm font-medium text-foreground'>Vehicle</span>
                <select
                  value={vehicleType}
                  onChange={(event) => setVehicleType(event.target.value)}
                  className='w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary/45'
                >
                  {VEHICLE_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className='space-y-2'>
                <span className='text-sm font-medium text-foreground'>Capacity (kg)</span>
                <input
                  type='number'
                  min='1'
                  value={availableCapacity}
                  onChange={(event) => setAvailableCapacity(event.target.value)}
                  className='w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary/45'
                  required
                />
              </label>

              <label className='space-y-2'>
                <span className='text-sm font-medium text-foreground'>Price / kg (₹)</span>
                <input
                  type='number'
                  min='0'
                  value={pricePerKg}
                  onChange={(event) => setPricePerKg(event.target.value)}
                  className='w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary/45'
                  required
                />
              </label>
            </div>
          </>
        ) : (
          <>
            <div className='grid gap-4 md:grid-cols-3'>
              <label className='space-y-2 md:col-span-1'>
                <span className='text-sm font-medium text-foreground'>Delivery Date</span>
                <input
                  type='date'
                  value={deliveryDate}
                  onChange={(event) => setDeliveryDate(event.target.value)}
                  className='w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary/45'
                  required
                />
              </label>

              <label className='space-y-2 md:col-span-1'>
                <span className='text-sm font-medium text-foreground'>Category</span>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className='w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary/45'
                >
                  {PARCEL_CATEGORIES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className='space-y-2 md:col-span-1'>
                <span className='text-sm font-medium text-foreground'>Weight (kg)</span>
                <input
                  type='number'
                  min='0.1'
                  step='0.1'
                  value={weight}
                  onChange={(event) => setWeight(event.target.value)}
                  className='w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary/45'
                  required
                />
              </label>
            </div>

            <label className='space-y-2'>
              <span className='text-sm font-medium text-foreground'>Parcel Description</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className='min-h-[116px] w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary/45'
                placeholder='Describe parcel type, handling notes, and urgency.'
                required
              />
            </label>

            <label className='space-y-2'>
              <span className='text-sm font-medium text-foreground'>Price Offer (₹)</span>
              <input
                type='number'
                min='0'
                value={priceOffer}
                onChange={(event) => setPriceOffer(event.target.value)}
                className='w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary/45'
                required
              />
            </label>
          </>
        )}

        <div className='rounded-2xl border border-border bg-surface-elevated/80 p-3 text-xs text-muted'>
          <div className='inline-flex items-center gap-1.5 font-medium text-foreground'>
            <MapPin className='h-3.5 w-3.5 text-primary' />
            Web parity beta
          </div>
          <p className='mt-1'>
            This uses the same `trips` / `parcels` data model as mobile. If your web session is not authenticated, use the mobile app flow.
          </p>
        </div>

        {submitState.kind !== 'idle' && (
          <div
            className={`rounded-xl border px-3 py-2.5 text-sm ${
              submitState.kind === 'success'
                ? 'border-success/35 bg-success-subtle text-success'
                : 'border-danger/35 bg-danger-subtle text-danger'
            }`}
          >
            {submitState.kind === 'success' && <CheckCircle2 className='mr-1 inline h-4 w-4' />}
            {submitState.message}
          </div>
        )}

        <div className='flex flex-wrap items-center gap-3'>
          <button
            type='submit'
            disabled={isSubmitting}
            className='button-primary disabled:cursor-not-allowed disabled:opacity-70'
          >
            {isSubmitting ? <Loader2 className='h-4 w-4 animate-spin' /> : null}
            {isSubmitting ? 'Submitting...' : mode === 'trip' ? 'Publish Trip' : 'Publish Parcel'}
          </button>

          <Link href='/features' className='button-secondary'>
            View all features
          </Link>

          <Link href='/contact' className='inline-link'>
            Need onboarding help?
            <ArrowRight className='h-4 w-4' />
          </Link>
        </div>
      </form>
    </section>
  )
}
