import { requireAdmin } from '@/utils/admin-guard'
import { redirect } from 'next/navigation'
import TripsTable from './TripsTable'
import { isAwsCmsBackendEnabled } from '@/utils/backend/provider'
import { awsCmsRequest } from '@/utils/aws/api'

const PAGE_SIZE = 100

type AwsTrip = {
  id: string
  userName: string
  fromCity: string
  toCity: string
  date: string
  status: string
  createdAt: string
}

export default async function TripsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const auth = await requireAdmin()
  if ('error' in auth) redirect('/login')

  const params = await searchParams
  const page = Math.max(1, parseInt(params.page || '1', 10))
  const from = (page - 1) * PAGE_SIZE

  if (isAwsCmsBackendEnabled()) {
    const query = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(from) })
    const response = (await awsCmsRequest(`/trips?${query.toString()}`)) as { data: AwsTrip[] }

    const mappedTrips = response.data.map((trip) => ({
      id: trip.id,
      travellerName: trip.userName || 'Unknown',
      route: `${trip.fromCity} -> ${trip.toCity}`,
      date: new Date(trip.date).toLocaleDateString(),
      status: trip.status,
      createdAt: new Date(trip.createdAt).toLocaleDateString(),
    }))

    return <TripsTable initialTrips={mappedTrips} />
  }

  const supabase = auth.supabase
  const { data: tripsData } = await supabase
    .from('trips')
    .select('id, user_name, from_city, to_city, date, status, created_at')
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1)

  const mappedTrips =
    tripsData?.map((trip) => ({
      id: trip.id,
      travellerName: trip.user_name || 'Unknown',
      route: `${trip.from_city} -> ${trip.to_city}`,
      date: new Date(trip.date).toLocaleDateString(),
      status: trip.status,
      createdAt: new Date(trip.created_at).toLocaleDateString(),
    })) || []

  return <TripsTable initialTrips={mappedTrips} />
}
