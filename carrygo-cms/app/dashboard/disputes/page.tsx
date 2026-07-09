import { requireAdmin } from '@/utils/admin-guard'
import { redirect } from 'next/navigation'
import { AlertTriangle, Clock, CheckCircle2, XCircle } from 'lucide-react'
import DisputeList from './DisputeList'

export interface Dispute {
  id: string
  parcelId: string
  tripId: string
  senderId: string
  senderName: string
  travellerId: string
  travellerName: string
  price: number
  status: string
  createdAt: string
  updatedAt: string
  message?: string
}

export default async function DisputesPage() {
  const auth = await requireAdmin()
  if ('error' in auth) redirect('/login')
  const supabase = auth.supabase

  const { data: failedRequests } = await supabase
    .from('requests')
    .select('*')
    .in('status', ['failed'])
    .order('updated_at', { ascending: false })
    .limit(50)

  const disputes: Dispute[] = (failedRequests ?? []).map(r => ({
    id: r.id,
    parcelId: r.parcel_id,
    tripId: r.trip_id,
    senderId: r.sender_id,
    senderName: r.sender_name ?? 'Unknown',
    travellerId: r.traveller_id,
    travellerName: r.traveller_name ?? 'Unknown',
    price: Number(r.price),
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    message: r.message,
  }))

  const openCount = disputes.length
  const { count: totalResolved } = await supabase
    .from('requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dispute Resolution</h1>
        <p className="text-gray-500">Manage failed deliveries and resolve disputes between users.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl border border-red-100">
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-red-700">{openCount}</p>
            <p className="text-xs text-red-600">Open Disputes</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-700">0</p>
            <p className="text-xs text-amber-600">Investigating</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-700">{totalResolved ?? 0}</p>
            <p className="text-xs text-emerald-600">Resolved</p>
          </div>
        </div>
      </div>

      <DisputeList disputes={disputes} />
    </div>
  )
}
