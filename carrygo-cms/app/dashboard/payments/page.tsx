import { requireAdmin } from '@/utils/admin-guard'
import { redirect } from 'next/navigation'
import PaymentsTable from '@/components/PaymentsTable'

export default async function PaymentsPage() {
  const auth = await requireAdmin()
  if ('error' in auth) redirect('/login')
  const supabase = auth.supabase

  const { data: payments } = await supabase
    .from('payments')
    .select(`
      id,
      amount,
      status,
      razorpay_order_id,
      razorpay_payment_id,
      locked_at,
      released_at,
      sender:sender_id(full_name),
      traveller:traveller_id(full_name)
    `)
    .order('locked_at', { ascending: false })
    .limit(200)

  const formattedPayments = (payments || []).map((p: any) => ({
    id: p.id,
    sender_name: p.sender?.full_name || 'Unknown',
    traveller_name: p.traveller?.full_name || 'Unknown',
    amount: Number(p.amount),
    status: p.status,
    razorpay_order_id: p.razorpay_order_id,
    razorpay_payment_id: p.razorpay_payment_id,
    locked_at: p.locked_at || p.created_at,
    released_at: p.released_at,
    request_id: p.request_id || '',
  }))

  const totalRevenue = formattedPayments
    .filter((p: any) => p.status === 'released')
    .reduce((sum: number, p: any) => sum + p.amount, 0)

  const totalLocked = formattedPayments
    .filter((p: any) => p.status === 'locked')
    .reduce((sum: number, p: any) => sum + p.amount, 0)

  const totalRefunded = formattedPayments
    .filter((p: any) => p.status === 'refunded')
    .reduce((sum: number, p: any) => sum + p.amount, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground tracking-tight">Payments</h1>
        <p className="text-sm text-muted mt-1">Monitor all payment transactions, escrow status, and gateway records.</p>
      </div>

      <PaymentsTable
        payments={formattedPayments}
        totalRevenue={totalRevenue}
        totalLocked={totalLocked}
        totalRefunded={totalRefunded}
      />
    </div>
  )
}
