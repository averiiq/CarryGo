import { requireAdmin } from '@/utils/admin-guard'
import { redirect } from 'next/navigation'
import TripsTable from './TripsTable'

export default async function TripsPage() {
  const auth = await requireAdmin()
  if ('error' in auth) redirect('/login')
  const supabase = auth.supabase

  const { data: tripsData } = await supabase
    .from('trips')
    .select('id, user_name, from_city, to_city, date, status, created_at')
    .order('created_at', { ascending: false })

  const mappedTrips = tripsData?.map(trip => ({
    id: trip.id,
    travellerName: trip.user_name || 'Unknown',
    route: `${trip.from_city} → ${trip.to_city}`,
    date: new Date(trip.date).toLocaleDateString(),
    status: trip.status,
    createdAt: new Date(trip.created_at).toLocaleDateString()
  })) || []

  return (
    <div className="space-y-6">
      <TripsTable initialTrips={mappedTrips} />
    </div>
  )
}
