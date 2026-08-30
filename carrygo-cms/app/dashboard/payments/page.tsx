import { requireAdmin } from '@/utils/admin-guard'
import { redirect } from 'next/navigation'
import PaymentsTable from '@/components/PaymentsTable'
import Pagination from '@/components/Pagination'

const PAGE_SIZE = 100

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const auth = await requireAdmin()
  if ('error' in auth) redirect('/login')
  const supabase = auth.supabase

  const params = await searchParams
  const page = Math.max(1, Number.parseInt(params.page || '1', 10) || 1)
  const from = (page - 1) * PAGE_SIZE

  const [{ data: payments, count, error }, { data: totals, error: totalsError }] = await Promise.all([
    supabase
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
      sender:sender_id(full_name),
      traveller:traveller_id(full_name)
    `, { count: 'exact' })
    .order('locked_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1),
    supabase.rpc('cms_payment_totals', { p_actor_id: auth.userId }),
  ])

  if (error || totalsError) throw new Error(`Unable to load payments: ${(error || totalsError)?.message}`)

  type PaymentRow = Record<string, unknown>
  const formattedPayments = (payments || []).map((p: PaymentRow) => {
    const sender = p.sender as { full_name: string | null } | null
    const traveller = p.traveller as { full_name: string | null } | null
    return {
      id: p.id as string,
      sender_name: sender?.full_name || 'Unknown',
      traveller_name: traveller?.full_name || 'Unknown',
      amount: Number(p.amount),
      status: p.status as 'locked' | 'released' | 'refunded',
      razorpay_order_id: p.razorpay_order_id as string | null,
      razorpay_payment_id: p.razorpay_payment_id as string | null,
      locked_at: (p.locked_at || p.created_at) as string,
      released_at: p.released_at as string | null,
      request_id: (p.request_id || '') as string,
    }
  })

  const summary = (totals?.[0] ?? {}) as { released?: number; locked?: number; refunded?: number }
  const totalRevenue = Number(summary.released ?? 0)
  const totalLocked = Number(summary.locked ?? 0)
  const totalRefunded = Number(summary.refunded ?? 0)
  const total = count ?? 0

  return (
    <div className="space-y-6">

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
