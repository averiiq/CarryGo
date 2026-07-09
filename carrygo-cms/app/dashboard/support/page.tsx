import { requireAdmin } from '@/utils/admin-guard'
import { redirect } from 'next/navigation'
import SupportTable from './SupportTable'

const PAGE_SIZE = 100

export default async function SupportPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const auth = await requireAdmin()
  if ('error' in auth) redirect('/login')
  const supabase = auth.supabase

  const params = await searchParams
  const page = Math.max(1, parseInt(params.page || '1', 10))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data: ticketsData, count } = await supabase
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
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <p className="text-sm text-gray-500">
            Showing {from + 1}–{Math.min(to + 1, count || 0)} of {count} tickets
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <a href={`?page=${page - 1}`} className="px-3 py-1.5 text-sm rounded-md bg-white border border-gray-300 hover:bg-gray-50">Previous</a>
            )}
            {page < totalPages && (
              <a href={`?page=${page + 1}`} className="px-3 py-1.5 text-sm rounded-md bg-white border border-gray-300 hover:bg-gray-50">Next</a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
