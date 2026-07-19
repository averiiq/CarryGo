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

  type FormattedPayment = (typeof formattedPayments)[number]

  const totalRevenue = formattedPayments
    .filter((p: FormattedPayment) => p.status === 'released')
    .reduce((sum: number, p: FormattedPayment) => sum + p.amount, 0)

  const totalLocked = formattedPayments
    .filter((p: FormattedPayment) => p.status === 'locked')
    .reduce((sum: number, p: FormattedPayment) => sum + p.amount, 0)

  const totalRefunded = formattedPayments
    .filter((p: FormattedPayment) => p.status === 'refunded')
    .reduce((sum: number, p: FormattedPayment) => sum + p.amount, 0)

  return (
    <div className="space-y-6">

      <PaymentsTable
        payments={formattedPayments}
        totalRevenue={totalRevenue}
        totalLocked={totalLocked}
        totalRefunded={totalRefunded}
      />
    </div>
  )
}
