import { requireAdmin } from '@/utils/admin-guard'
import { redirect } from 'next/navigation'
import { AlertTriangle, Clock, CheckCircle2 } from 'lucide-react'
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground tracking-tight">Dispute Resolution</h1>
        <p className="text-sm text-muted mt-1">Manage failed deliveries and resolve disputes between users.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-center gap-4 p-5 rounded-2xl bg-danger-subtle border border-danger/10 shadow-[var(--shadow-sm)]">
          <div className="p-2.5 bg-danger/10 rounded-xl">
            <AlertTriangle className="h-5 w-5 text-danger" />
          </div>
          <div>
            <p className="text-2xl font-heading font-bold text-danger">{openCount}</p>
            <p className="text-xs font-medium text-danger/70">Open Disputes</p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-5 rounded-2xl bg-warning-subtle border border-warning/10 shadow-[var(--shadow-sm)]">
          <div className="p-2.5 bg-warning/10 rounded-xl">
            <Clock className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-heading font-bold text-warning">0</p>
            <p className="text-xs font-medium text-warning/70">Investigating</p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-5 rounded-2xl bg-success-subtle border border-success/10 shadow-[var(--shadow-sm)]">
          <div className="p-2.5 bg-success/10 rounded-xl">
            <CheckCircle2 className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-2xl font-heading font-bold text-success">{totalResolved ?? 0}</p>
            <p className="text-xs font-medium text-success/70">Resolved</p>
          </div>
        </div>
      </div>

      <DisputeList disputes={disputes} />
    </div>
  )
}
