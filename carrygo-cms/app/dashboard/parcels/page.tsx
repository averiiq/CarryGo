import { requireAdmin } from '@/utils/admin-guard'
import { redirect } from 'next/navigation'
import ParcelsTable from './ParcelsTable'
import { isAwsCmsBackendEnabled } from '@/utils/backend/provider'
import { awsCmsRequest } from '@/utils/aws/api'

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
  if ('error' in auth) redirect('/login')

  const params = await searchParams
  const page = Math.max(1, parseInt(params.page || '1', 10))
  const from = (page - 1) * PAGE_SIZE

  if (isAwsCmsBackendEnabled()) {
    const query = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(from) })
    const response = (await awsCmsRequest(`/parcels?${query.toString()}`)) as { data: AwsParcel[] }

    const mappedParcels = response.data.map((parcel) => ({
      id: parcel.id,
      senderName: parcel.userName || 'Unknown',
      route: `${parcel.fromCity} -> ${parcel.toCity}`,
      details: `${parcel.category} (${parcel.weight}kg)`,
      status: parcel.status,
      createdAt: new Date(parcel.createdAt).toLocaleDateString(),
    }))

    return <ParcelsTable initialParcels={mappedParcels} />
  }

  const supabase = auth.supabase
  const { data: parcelsData } = await supabase
    .from('parcels')
    .select('id, user_name, from_city, to_city, category, weight, status, created_at')
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1)

  const mappedParcels =
    parcelsData?.map((parcel) => ({
      id: parcel.id,
      senderName: parcel.user_name || 'Unknown',
      route: `${parcel.from_city} -> ${parcel.to_city}`,
      details: `${parcel.category} (${parcel.weight}kg)`,
      status: parcel.status,
      createdAt: new Date(parcel.created_at).toLocaleDateString(),
    })) || []

  return <ParcelsTable initialParcels={mappedParcels} />
}
