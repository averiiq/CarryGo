import Link from 'next/link'
import { ArrowRight, Filter, MapPin, Package, Route, Search as SearchIcon } from 'lucide-react'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { PageHero } from '@/components/marketing/page-hero'
import { ScrollLinkedSection } from '@/components/marketing/scroll-linked-section'
import { RequestIntentForm } from '@/components/marketing/request-intent-form'
import { createMarketingMetadata } from '@/lib/marketing-metadata'
import { createClient } from '@/utils/supabase/server'

export const metadata = createMarketingMetadata(
  'Search & Match',
  'Discover trips and parcel requests using app-style route filters on web.',
  '/search'
)

type SearchParams = Promise<{
  from?: string
  to?: string
  type?: 'all' | 'trips' | 'parcels'
}>

type TripRecord = {
  id: string
  from_city: string
  to_city: string
  date: string
  time: string | null
  vehicle_type: string
  available_capacity: number
  price_per_kg: number
  status: string
  user_name: string | null
}

type ParcelRecord = {
  id: string
  from_city: string
  to_city: string
  delivery_date: string
  category: string
  weight: number
  price_offer: number
  status: string
  user_name: string | null
}

function normalizeQuery(value: string | undefined): string {
  return (value ?? '').trim()
}

function safeNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const from = normalizeQuery(params.from)
  const to = normalizeQuery(params.to)
  const type = params.type === 'trips' || params.type === 'parcels' ? params.type : 'all'

  const supabase = await createClient()

  const shouldLoadTrips = type === 'all' || type === 'trips'
  const shouldLoadParcels = type === 'all' || type === 'parcels'

  const tripsPromise = shouldLoadTrips
    ? (() => {
        let query = supabase
          .from('trips')
          .select('id, from_city, to_city, date, time, vehicle_type, available_capacity, price_per_kg, status, user_name')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(24)

        if (from) query = query.ilike('from_city', `%${from}%`)
        if (to) query = query.ilike('to_city', `%${to}%`)

        return query
      })()
    : Promise.resolve({ data: [], error: null } as const)

  const parcelsPromise = shouldLoadParcels
    ? (() => {
        let query = supabase
          .from('parcels')
          .select('id, from_city, to_city, delivery_date, category, weight, price_offer, status, user_name')
          .in('status', ['open', 'matched'])
          .order('created_at', { ascending: false })
          .limit(24)

        if (from) query = query.ilike('from_city', `%${from}%`)
        if (to) query = query.ilike('to_city', `%${to}%`)

        return query
      })()
    : Promise.resolve({ data: [], error: null } as const)

  const [tripsRes, parcelsRes] = await Promise.all([tripsPromise, parcelsPromise])

  const trips = ((tripsRes.data ?? []) as unknown[]).map((entry) => {
    const row = entry as Partial<TripRecord>
    return {
      id: row.id ?? 'unknown',
      from_city: row.from_city ?? 'Unknown',
      to_city: row.to_city ?? 'Unknown',
      date: row.date ?? 'N/A',
      time: row.time ?? null,
      vehicle_type: row.vehicle_type ?? 'car',
      available_capacity: safeNumber(row.available_capacity),
      price_per_kg: safeNumber(row.price_per_kg),
      status: row.status ?? 'active',
      user_name: row.user_name ?? 'CarryGo traveler',
    }
  })

  const parcels = ((parcelsRes.data ?? []) as unknown[]).map((entry) => {
    const row = entry as Partial<ParcelRecord>
    return {
      id: row.id ?? 'unknown',
      from_city: row.from_city ?? 'Unknown',
      to_city: row.to_city ?? 'Unknown',
      delivery_date: row.delivery_date ?? 'N/A',
      category: row.category ?? 'other',
      weight: safeNumber(row.weight),
      price_offer: safeNumber(row.price_offer),
      status: row.status ?? 'open',
      user_name: row.user_name ?? 'CarryGo sender',
    }
  })

  const hasError = Boolean(tripsRes.error || parcelsRes.error)

  return (
    <MarketingShell>
      <ScrollLinkedSection className='px-6 pt-16 pb-10 md:pt-24 md:pb-12'>
        <PageHero
          badge='Phase 2: Search & Match'
          title='Find Trips and Parcels Like in the App'
          description='Use route filters to discover active trips and open parcel requests with the same discovery intent as the mobile experience.'
          illustrationSrc='/images/custom/route-network.svg'
          illustrationAlt='Route discovery illustration'
          illustrationLabel='Live route discovery'
          actions={[
            { label: 'Create Trip', href: '/create-trip' },
            { label: 'Create Parcel', href: '/create-parcel', variant: 'secondary' },
          ]}
        />
      </ScrollLinkedSection>

      <ScrollLinkedSection className='px-6 pb-8'>
        <section className='glass-card mx-auto w-full max-w-6xl rounded-3xl p-5 md:p-6'>
          <form method='GET' className='grid gap-3 md:grid-cols-[1fr_1fr_180px_auto] md:items-end'>
            <label className='space-y-1.5'>
              <span className='text-xs font-medium uppercase tracking-wide text-muted'>From City</span>
              <input
                name='from'
                defaultValue={from}
                placeholder='e.g. Mumbai'
                className='w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary/45'
              />
            </label>

            <label className='space-y-1.5'>
              <span className='text-xs font-medium uppercase tracking-wide text-muted'>To City</span>
              <input
                name='to'
                defaultValue={to}
                placeholder='e.g. Pune'
                className='w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary/45'
              />
            </label>

            <label className='space-y-1.5'>
              <span className='text-xs font-medium uppercase tracking-wide text-muted'>Type</span>
              <select
                name='type'
                defaultValue={type}
                className='w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary/45'
              >
                <option value='all'>All</option>
                <option value='trips'>Trips</option>
                <option value='parcels'>Parcels</option>
              </select>
            </label>

            <button type='submit' className='button-primary'>
              <Filter className='h-4 w-4' />
              Apply Filters
            </button>
          </form>
        </section>
      </ScrollLinkedSection>

      <ScrollLinkedSection className='px-6 pb-24 md:pb-28'>
        <section className='mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-2'>
          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <h2 className='text-xl font-heading font-semibold text-foreground'>Active Trips</h2>
              <span className='rounded-full bg-primary-subtle px-2.5 py-1 text-xs font-medium text-primary'>
                {trips.length}
              </span>
            </div>

            {trips.map((trip) => (
              <article key={trip.id} className='glass-card rounded-2xl p-4'>
                <div className='flex items-start justify-between gap-3'>
                  <div>
                    <p className='text-sm font-semibold text-foreground'>{trip.user_name}</p>
                    <p className='mt-1 inline-flex items-center gap-1 text-xs text-muted'>
                      <MapPin className='h-3.5 w-3.5 text-primary' />
                      {trip.from_city} → {trip.to_city}
                    </p>
                  </div>
                  <span className='rounded-lg bg-surface-elevated px-2 py-1 text-xs font-medium text-muted'>
                    {trip.vehicle_type}
                  </span>
                </div>
                <div className='mt-3 grid grid-cols-3 gap-2 text-xs'>
                  <div className='rounded-lg bg-surface-elevated px-2.5 py-2'>
                    <p className='text-muted'>Date</p>
                    <p className='font-semibold text-foreground'>{trip.date}</p>
                  </div>
                  <div className='rounded-lg bg-surface-elevated px-2.5 py-2'>
                    <p className='text-muted'>Capacity</p>
                    <p className='font-semibold text-foreground'>{trip.available_capacity}kg</p>
                  </div>
                  <div className='rounded-lg bg-surface-elevated px-2.5 py-2'>
                    <p className='text-muted'>Price/kg</p>
                    <p className='font-semibold text-foreground'>₹{trip.price_per_kg}</p>
                  </div>
                </div>
                <RequestIntentForm mode='trip' tripId={trip.id} suggestedPrice={trip.price_per_kg} />
              </article>
            ))}

            {trips.length === 0 && (
              <div className='glass-card rounded-2xl p-6 text-center text-sm text-muted'>
                <Route className='mx-auto mb-2 h-5 w-5 text-primary' />
                No matching trips found.
              </div>
            )}
          </div>

          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <h2 className='text-xl font-heading font-semibold text-foreground'>Open Parcels</h2>
              <span className='rounded-full bg-accent-subtle px-2.5 py-1 text-xs font-medium text-accent'>
                {parcels.length}
              </span>
            </div>

            {parcels.map((parcel) => (
              <article key={parcel.id} className='glass-card rounded-2xl p-4'>
                <div className='flex items-start justify-between gap-3'>
                  <div>
                    <p className='text-sm font-semibold text-foreground'>{parcel.user_name}</p>
                    <p className='mt-1 inline-flex items-center gap-1 text-xs text-muted'>
                      <MapPin className='h-3.5 w-3.5 text-accent' />
                      {parcel.from_city} → {parcel.to_city}
                    </p>
                  </div>
                  <span className='rounded-lg bg-surface-elevated px-2 py-1 text-xs font-medium text-muted'>
                    {parcel.category}
                  </span>
                </div>
                <div className='mt-3 grid grid-cols-3 gap-2 text-xs'>
                  <div className='rounded-lg bg-surface-elevated px-2.5 py-2'>
                    <p className='text-muted'>Delivery</p>
                    <p className='font-semibold text-foreground'>{parcel.delivery_date}</p>
                  </div>
                  <div className='rounded-lg bg-surface-elevated px-2.5 py-2'>
                    <p className='text-muted'>Weight</p>
                    <p className='font-semibold text-foreground'>{parcel.weight}kg</p>
                  </div>
                  <div className='rounded-lg bg-surface-elevated px-2.5 py-2'>
                    <p className='text-muted'>Offer</p>
                    <p className='font-semibold text-foreground'>₹{parcel.price_offer}</p>
                  </div>
                </div>
                <RequestIntentForm mode='parcel' parcelId={parcel.id} suggestedPrice={parcel.price_offer} />
              </article>
            ))}

            {parcels.length === 0 && (
              <div className='glass-card rounded-2xl p-6 text-center text-sm text-muted'>
                <Package className='mx-auto mb-2 h-5 w-5 text-accent' />
                No matching parcels found.
              </div>
            )}
          </div>
        </section>

        <section className='mx-auto mt-7 flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface-elevated/70 px-4 py-3'>
          <div className='inline-flex items-center gap-2 text-sm text-muted'>
            <SearchIcon className='h-4 w-4 text-primary' />
            <span>Next phase: one-tap chat handoff after request creation from these cards.</span>
          </div>
          <Link href='/features' className='inline-link'>
            See parity roadmap
            <ArrowRight className='h-4 w-4' />
          </Link>
        </section>

        {hasError && (
          <p className='mx-auto mt-4 w-full max-w-6xl rounded-xl border border-danger/35 bg-danger-subtle px-3 py-2 text-sm text-danger'>
            Some results could not be loaded right now. Please retry in a few moments.
          </p>
        )}
      </ScrollLinkedSection>
    </MarketingShell>
  )
}
