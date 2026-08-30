import { requireAdmin } from '@/utils/admin-guard'
import { redirect } from 'next/navigation'
import ParcelsTable from './ParcelsTable'
import { isAwsCmsBackendEnabled } from '@/utils/backend/provider'
import { awsCmsRequest } from '@/utils/aws/api'
import Pagination from '@/components/Pagination'
import { parsePositiveInt } from '@/lib/validation'

const PAGE_SIZE = 100

type AwsParcel = {
  id: string
  userName: string
  fromCity: string
  toCity: string
  category: string
  weight: number
  status: string
  createdAt: string
}

export default async function ParcelsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const auth = await requireAdmin()
  if ('error' in auth) redirect(auth.error === 'Authentication required' ? '/login' : '/unauthorized')

  const params = await searchParams
  const page = parsePositiveInt(params.page, 1)
  const from = (page - 1) * PAGE_SIZE

  if (isAwsCmsBackendEnabled()) {
    const query = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(from) })
    const response = (await awsCmsRequest(`/parcels?${query.toString()}`)) as { data: AwsParcel[]; total?: number }

    const mappedParcels = response.data.map((parcel) => ({
      id: parcel.id,
      senderName: parcel.userName || 'Unknown',
      route: `${parcel.fromCity} -> ${parcel.toCity}`,
      details: `${parcel.category} (${parcel.weight}kg)`,
      status: parcel.status,
      createdAt: new Date(parcel.createdAt).toLocaleDateString(),
    }))

    const total = response.total ?? mappedParcels.length
    return <div className="space-y-6"><ParcelsTable initialParcels={mappedParcels} /><Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} totalItems={total} pageSize={PAGE_SIZE} itemLabel="parcels" /></div>
  }

  const supabase = auth.supabase
  const { data: parcelsData, count, error } = await supabase
    .from('parcels')
    .select('id, user_name, from_city, to_city, category, weight, status, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1)

  if (error) throw new Error(`Unable to load parcels: ${error.message}`)

  const mappedParcels =
    parcelsData?.map((parcel) => ({
      id: parcel.id,
      senderName: parcel.user_name || 'Unknown',
      route: `${parcel.from_city} -> ${parcel.to_city}`,
      details: `${parcel.category} (${parcel.weight}kg)`,
      status: parcel.status,
      createdAt: new Date(parcel.created_at).toLocaleDateString(),
    })) || []

  const total = count ?? 0
  return <div className="space-y-6"><ParcelsTable initialParcels={mappedParcels} /><Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} totalItems={total} pageSize={PAGE_SIZE} itemLabel="parcels" /></div>
}
