import { requireAdmin } from '@/utils/admin-guard'
import { redirect } from 'next/navigation'
import { AlertTriangle, Clock, CheckCircle2, ShieldAlert } from 'lucide-react'
import DisputeList from './DisputeList'
import { isAwsCmsBackendEnabled } from '@/utils/backend/provider'
import { awsCmsRequest } from '@/utils/aws/api'

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
  route?: string | null
  parcelDescription?: string | null
  parcelCategory?: string | null
  parcelWeight?: number | null
  paymentStatus?: string | null
  paymentAmount?: number | null
  razorpayOrderId?: string | null
  deliveryStatus?: string | null
  pickupConfirmed?: boolean | null
  otpAttempts?: number | null
  conversationId?: string | null
}

export default async function DisputesPage() {
  const auth = await requireAdmin()
  if ('error' in auth) redirect(auth.error === 'Authentication required' ? '/login' : '/unauthorized')
  const supabase = auth.supabase

  let disputes: Dispute[] = []
  let totalResolved = 0

  if (isAwsCmsBackendEnabled()) {
    const response = (await awsCmsRequest('/admin/disputes?limit=50')) as {
      data: {
        failedRequests: Array<{
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
        }>
        totalResolved: number
      }
    }

    disputes = response.data.failedRequests.map((entry) => ({
      id: entry.id,
      parcelId: entry.parcelId,
      tripId: entry.tripId,
      senderId: entry.senderId,
      senderName: entry.senderName ?? 'Unknown',
      travellerId: entry.travellerId,
      travellerName: entry.travellerName ?? 'Unknown',
      price: Number(entry.price),
      status: entry.status,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      message: entry.message,
    }))
    totalResolved = response.data.totalResolved
  } else {
    // Fetch failed requests and recently resolved disputes
    type RequestRow = Record<string, unknown>
    const { data: rawRequests } = await supabase
      .from('requests')
      .select(`
        id,
        parcel_id,
        trip_id,
        sender_id,
        sender_name,
        traveller_id,
        traveller_name,
        price,
        status,
        message,
        created_at,
        updated_at,
        parcels:parcel_id ( description, category, weight, from_city, to_city ),
        trips:trip_id ( from_city, to_city, date, vehicle_type ),
        payments ( id, amount, status, razorpay_order_id ),
        deliveries ( id, status, pickup_confirmed, otp_attempt_count ),
        conversations ( id )
      `)
      .or('status.eq.failed,message.ilike.%[RESOLVED:%')
      .order('updated_at', { ascending: false })
      .limit(100)

    disputes = (rawRequests ?? []).map((raw: RequestRow) => {
      const parcel = raw.parcels as { description?: string; category?: string; weight?: number; from_city?: string; to_city?: string } | null
      const trip = raw.trips as { from_city?: string; to_city?: string; date?: string; vehicle_type?: string } | null
      
      const paymentsArr = Array.isArray(raw.payments) ? raw.payments : raw.payments ? [raw.payments] : []
      const payment = (paymentsArr[0] as { id?: string; amount?: number; status?: string; razorpay_order_id?: string } | undefined) || null

      const deliveriesArr = Array.isArray(raw.deliveries) ? raw.deliveries : raw.deliveries ? [raw.deliveries] : []
      const delivery = (deliveriesArr[0] as { id?: string; status?: string; pickup_confirmed?: boolean; otp_attempt_count?: number } | undefined) || null

      const conversationsArr = Array.isArray(raw.conversations) ? raw.conversations : raw.conversations ? [raw.conversations] : []
      const conversation = (conversationsArr[0] as { id?: string } | undefined) || null

      const fromCity = parcel?.from_city || trip?.from_city || null
      const toCity = parcel?.to_city || trip?.to_city || null
      const route = fromCity && toCity ? `${fromCity} → ${toCity}` : null

      return {
        id: raw.id as string,
        parcelId: raw.parcel_id as string,
        tripId: raw.trip_id as string,
        senderId: raw.sender_id as string,
        senderName: (raw.sender_name as string) || 'Unknown Sender',
        travellerId: raw.traveller_id as string,
        travellerName: (raw.traveller_name as string) || 'Unknown Traveller',
        price: Number(raw.price),
        status: raw.status as string,
        createdAt: raw.created_at as string,
        updatedAt: raw.updated_at as string,
        message: raw.message as string | undefined,
        route,
        parcelDescription: parcel?.description || null,
        parcelCategory: parcel?.category || null,
        parcelWeight: parcel?.weight ? Number(parcel.weight) : null,
        paymentStatus: payment?.status || null,
        paymentAmount: payment?.amount ? Number(payment.amount) : null,
        razorpayOrderId: payment?.razorpay_order_id || null,
        deliveryStatus: delivery?.status || null,
        pickupConfirmed: delivery?.pickup_confirmed ?? null,
        otpAttempts: delivery?.otp_attempt_count ?? null,
        conversationId: conversation?.id || null,
      }
    })

    const { count } = await supabase
      .from('requests')
      .select('*', { count: 'exact', head: true })
      .ilike('message', '%[RESOLVED:%')

    totalResolved = count ?? 0
  }

  const openCount = disputes.filter((d) => d.status === 'failed' && !d.message?.includes('[RESOLVED:')).length
  const investigatingCount = disputes.filter((d) => d.status === 'failed' && d.message?.includes('[NOTE ')).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground tracking-tight">Dispute Resolution Center</h1>
        <p className="text-sm text-muted mt-1">
          Review contested deliveries, inspect chat logs, and issue final administrative rulings (refund sender or pay traveller).
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-center gap-4 p-5 rounded-2xl bg-danger-subtle border border-danger/10 shadow-[var(--shadow-sm)]">
          <div className="p-2.5 bg-danger/10 rounded-xl">
            <AlertTriangle className="h-5 w-5 text-danger" />
          </div>
          <div>
            <p className="text-2xl font-heading font-bold text-danger">{openCount}</p>
            <p className="text-xs font-semibold text-danger/70 uppercase tracking-wider">Awaiting Ruling</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-5 rounded-2xl bg-warning-subtle border border-warning/10 shadow-[var(--shadow-sm)]">
          <div className="p-2.5 bg-warning/10 rounded-xl">
            <Clock className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-heading font-bold text-warning">{investigatingCount}</p>
            <p className="text-xs font-semibold text-warning/70 uppercase tracking-wider">Investigating Notes</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-5 rounded-2xl bg-success-subtle border border-success/10 shadow-[var(--shadow-sm)]">
          <div className="p-2.5 bg-success/10 rounded-xl">
            <CheckCircle2 className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-2xl font-heading font-bold text-success">{totalResolved}</p>
            <p className="text-xs font-semibold text-success/70 uppercase tracking-wider">Total Resolved</p>
          </div>
        </div>
      </div>

      <DisputeList disputes={disputes} />
    </div>
  )
}
