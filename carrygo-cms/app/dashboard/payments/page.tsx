import { requireAdmin } from '@/utils/admin-guard'
import { redirect } from 'next/navigation'
import PaymentsTable from '@/components/PaymentsTable'
import Pagination from '@/components/Pagination'
import { parsePositiveInt } from '@/lib/validation'

const PAGE_SIZE = 100

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ page?: string; status?: string }> }) {
  const auth = await requireAdmin()
  if ('error' in auth) redirect(auth.error === 'Authentication required' ? '/login' : '/unauthorized')
  const supabase = auth.supabase

  const params = await searchParams
  const page = parsePositiveInt(params.page, 1)
  const from = (page - 1) * PAGE_SIZE

  let query = supabase
    .from('payments')
    .select(`
      id,
      amount,
      status,
      razorpay_order_id,
      razorpay_payment_id,
      gateway_provider,
      gateway_order_id,
      gateway_payment_id,
      platform_fee,
      gst_amount,
      traveler_payout,
      payout_status,
      payout_reference,
      payout_completed_at,
      locked_at,
      released_at,
      created_at,
      request_id,
      sender:sender_id(full_name, email, phone),
      traveller:traveller_id(full_name, email, phone),
      request:request_id(
        id,
        status,
        message,
        parcel:parcel_id(description, category, weight, from_city, to_city),
        trip:trip_id(from_city, to_city, date, vehicle_type)
      )
    `, { count: 'exact' })
    .order('locked_at', { ascending: false })

  if (params.status && ['locked', 'released', 'refunded'].includes(params.status)) {
    query = query.eq('status', params.status)
  }

  const [{ data: payments, count, error }, { data: totals, error: totalsError }, { data: payoutStats }] = await Promise.all([
    query.range(from, from + PAGE_SIZE - 1),
    supabase.rpc('cms_payment_totals', { p_actor_id: auth.userId }),
    supabase.rpc('cms_payout_summary'),
  ])

  if (error || totalsError) throw new Error(`Unable to load payments: ${(error || totalsError)?.message}`)

  type PaymentRow = Record<string, unknown>
  const formattedPayments = (payments || []).map((p: PaymentRow) => {
    const sender = p.sender as { full_name: string | null; email?: string | null; phone?: string | null } | null
    const traveller = p.traveller as { full_name: string | null; email?: string | null; phone?: string | null } | null
    const request = p.request as {
      id?: string
      status?: string
      message?: string
      parcel?: { description?: string; category?: string; weight?: number; from_city?: string; to_city?: string } | null
      trip?: { from_city?: string; to_city?: string; date?: string; vehicle_type?: string } | null
    } | null

    const fromCity = request?.parcel?.from_city || request?.trip?.from_city || null
    const toCity = request?.parcel?.to_city || request?.trip?.to_city || null
    const route = fromCity && toCity ? `${fromCity} → ${toCity}` : null

    return {
      id: p.id as string,
      sender_name: sender?.full_name || 'Unknown Sender',
      sender_email: sender?.email || null,
      sender_phone: sender?.phone || null,
      traveller_name: traveller?.full_name || 'Unknown Traveller',
      traveller_email: traveller?.email || null,
      traveller_phone: traveller?.phone || null,
      amount: Number(p.amount),
      status: p.status as 'locked' | 'released' | 'refunded',
      razorpay_order_id: p.razorpay_order_id as string | null,
      razorpay_payment_id: p.razorpay_payment_id as string | null,
      gateway_provider: (p.gateway_provider || 'razorpay') as string,
      gateway_order_id: (p.gateway_order_id || p.razorpay_order_id) as string | null,
      gateway_payment_id: (p.gateway_payment_id || p.razorpay_payment_id) as string | null,
      platform_fee: p.platform_fee != null ? Number(p.platform_fee) : null,
      gst_amount: p.gst_amount != null ? Number(p.gst_amount) : null,
      traveler_payout: p.traveler_payout != null ? Number(p.traveler_payout) : null,
      payout_status: (p.payout_status || null) as string | null,
      payout_reference: (p.payout_reference || null) as string | null,
      payout_completed_at: (p.payout_completed_at || null) as string | null,
      locked_at: (p.locked_at || p.created_at) as string,
      released_at: p.released_at as string | null,
      request_id: (p.request_id || '') as string,
      route,
      parcel_description: request?.parcel?.description || null,
      parcel_category: request?.parcel?.category || null,
      parcel_weight: request?.parcel?.weight ? Number(request?.parcel?.weight) : null,
      request_status: request?.status || null,
    }
  })

  const summary = (totals?.[0] ?? {}) as { released?: number; locked?: number; refunded?: number }
  const totalRevenue = Number(summary.released ?? 0)
  const totalLocked = Number(summary.locked ?? 0)
  const totalRefunded = Number(summary.refunded ?? 0)
  const payout = (payoutStats?.[0] ?? {}) as Record<string, number>
  const total = count ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground tracking-tight">Payments & Payout Management</h1>
        <p className="text-sm text-muted mt-1">
          Monitor gateway payments, split commissions, and manage traveler payouts across all gateways.
        </p>
      </div>

      <PaymentsTable
        payments={formattedPayments}
        totalRevenue={totalRevenue}
        totalLocked={totalLocked}
        totalRefunded={totalRefunded}
        payoutSummary={{
          pending: Number(payout.total_pending ?? 0),
          processing: Number(payout.total_processing ?? 0),
          completed: Number(payout.total_completed ?? 0),
          failed: Number(payout.total_failed ?? 0),
          sumPending: Number(payout.sum_pending ?? 0),
          sumProcessing: Number(payout.sum_processing ?? 0),
          sumCompleted: Number(payout.sum_completed ?? 0),
          sumFailed: Number(payout.sum_failed ?? 0),
        }}
      />
      <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} totalItems={total} pageSize={PAGE_SIZE} itemLabel="payments" />
    </div>
  )
}
