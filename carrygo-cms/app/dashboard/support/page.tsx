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
      user_id,
      assigned_to,
      subject,
      description,
      status,
      created_at,
      user_profiles!user_id ( full_name, email, phone ),
      assignee:user_profiles!assigned_to ( full_name, email )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('Failed to load support tickets:', error)
  }

  const mappedTickets = (ticketsData as any[])?.map((ticket) => {
    const profile = Array.isArray(ticket.user_profiles)
      ? ticket.user_profiles[0]
      : ticket.user_profiles

    const assignee = Array.isArray(ticket.assignee)
      ? ticket.assignee[0]
      : ticket.assignee

    return {
      id: ticket.id,
      userId: ticket.user_id,
      assignedTo: ticket.assigned_to ?? null,
      assigneeName: assignee?.full_name ?? null,
      user: profile?.full_name ?? 'Unknown User',
      email: profile?.email ?? null,
      phone: profile?.phone ?? null,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      time: new Date(ticket.created_at).toLocaleDateString(),
    }
  }) || []

  const totalPages = Math.ceil((count || 0) / PAGE_SIZE)

  return (
    <div className="space-y-6">
      <SupportTable initialTickets={mappedTickets} currentAdminId={auth.userId} />
      <Pagination page={page} totalPages={totalPages} totalItems={count ?? 0} pageSize={PAGE_SIZE} itemLabel="tickets" />
    </div>
  )
}
