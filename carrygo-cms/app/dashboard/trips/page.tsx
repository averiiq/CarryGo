import { requireAdmin } from '@/utils/admin-guard'
import { redirect } from 'next/navigation'
import TripsTable from './TripsTable'

const PAGE_SIZE = 100

export default async function TripsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const auth = await requireAdmin()
  if ('error' in auth) redirect('/login')
  const supabase = auth.supabase

  const params = await searchParams
  const page = Math.max(1, parseInt(params.page || '1', 10))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data: tripsData, count } = await supabase
    .from('trips')
    .select('id, user_name, from_city, to_city, date, status, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  const mappedTrips = tripsData?.map(trip => ({
    id: trip.id,
    travellerName: trip.user_name || 'Unknown',
    route: `${trip.from_city} → ${trip.to_city}`,
    date: new Date(trip.date).toLocaleDateString(),
    status: trip.status,
    createdAt: new Date(trip.created_at).toLocaleDateString()
  })) || []

  const totalPages = Math.ceil((count || 0) / PAGE_SIZE)

  return (
    <div className="space-y-6">
      <TripsTable initialTrips={mappedTrips} />
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-4">
          <p className="text-sm text-muted">
            Showing {from + 1}–{Math.min(to + 1, count || 0)} of {count} trips
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <a href={`?page=${page - 1}`} className="px-4 py-2 text-sm rounded-xl bg-surface border border-border text-foreground hover:bg-slate-50 transition-colors font-medium">Previous</a>
            )}
            {page < totalPages && (
              <a href={`?page=${page + 1}`} className="px-4 py-2 text-sm rounded-xl bg-surface border border-border text-foreground hover:bg-slate-50 transition-colors font-medium">Next</a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
