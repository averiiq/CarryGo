import { requireAdmin } from '@/utils/admin-guard'
import { redirect } from 'next/navigation'
import ParcelsTable from './ParcelsTable'

export default async function ParcelsPage() {
  const auth = await requireAdmin()
  if ('error' in auth) redirect('/login')
  const supabase = auth.supabase

  const { data: parcelsData } = await supabase
    .from('parcels')
    .select('id, user_name, from_city, to_city, category, weight, status, created_at')
    .order('created_at', { ascending: false })

  const mappedParcels = parcelsData?.map(parcel => ({
    id: parcel.id,
    senderName: parcel.user_name || 'Unknown',
    route: `${parcel.from_city} → ${parcel.to_city}`,
    details: `${parcel.category} (${parcel.weight}kg)`,
    status: parcel.status,
    createdAt: new Date(parcel.created_at).toLocaleDateString()
  })) || []

  return (
    <div className="space-y-6">
      <ParcelsTable initialParcels={mappedParcels} />
    </div>
  )
}
