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

  const [{ data: payments, count, error }, { data: totals, error: totalsError }] = await Promise.all([
    query.range(from, from + PAGE_SIZE - 1),
    supabase.rpc('cms_payment_totals', { p_actor_id: auth.userId }),
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
  const total = count ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground tracking-tight">Payments & Escrow Management</h1>
        <p className="text-sm text-muted mt-1">
          Monitor Razorpay escrow balances, track fee transfers, and manually release or refund payments.
        </p>
      </div>

      <PaymentsTable
        payments={formattedPayments}
        totalRevenue={totalRevenue}
        totalLocked={totalLocked}
        totalRefunded={totalRefunded}
      />
      <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} totalItems={total} pageSize={PAGE_SIZE} itemLabel="payments" />
    </div>
  )
}
