import { requireAdmin } from '@/utils/admin-guard'
import { redirect } from 'next/navigation'
import SupportTable from './SupportTable'
import Pagination from '@/components/Pagination'
import { parsePositiveInt } from '@/lib/validation'

const PAGE_SIZE = 100

export default async function SupportPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const auth = await requireAdmin()
  if ('error' in auth) redirect(auth.error === 'Authentication required' ? '/login' : '/unauthorized')
  const supabase = auth.supabase

  const params = await searchParams
  const page = parsePositiveInt(params.page, 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data: ticketsData, count, error } = await supabase
    .from('support_tickets')
    .select(`
      id,
      subject,
      description,
      status,
      created_at,
      user_profiles ( full_name )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw new Error(`Unable to load support tickets: ${error.message}`)

  const mappedTickets = ticketsData?.map(ticket => ({
    id: ticket.id,
    user: Array.isArray(ticket.user_profiles)
      ? (ticket.user_profiles[0] as { full_name?: string })?.full_name ?? 'Unknown User'
      : (ticket.user_profiles as { full_name?: string } | null)?.full_name ?? 'Unknown User',
    subject: ticket.subject,
    description: ticket.description,
    status: ticket.status,
    time: new Date(ticket.created_at).toLocaleDateString()
  })) || []

  const totalPages = Math.ceil((count || 0) / PAGE_SIZE)

  return (
    <div className="space-y-6">
      <SupportTable initialTickets={mappedTickets} />
      <Pagination page={page} totalPages={totalPages} totalItems={count ?? 0} pageSize={PAGE_SIZE} itemLabel="tickets" />
    </div>
  )
}
