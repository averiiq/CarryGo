import { requireAdmin } from '@/utils/admin-guard'
import { redirect } from 'next/navigation'
import SupportTable from './SupportTable'

export default async function SupportPage() {
  const auth = await requireAdmin()
  if ('error' in auth) redirect('/login')
  const supabase = auth.supabase

  // Fetch support tickets and join with user_profiles to get reporter name
  // Note: the original migration doesn't have a foreign key for 'user_id' named properly if we didn't specify it,
  // but let's assume `reporter_id` references `user_profiles.id` or we just fetch and manually join.
  // Wait, let's look at the migration for support_tickets.
  // We added reporter_id. We'll do a simple select.
  const { data: ticketsData } = await supabase
    .from('support_tickets')
    .select(`
      id,
      subject,
      description,
      status,
      created_at,
      user_profiles ( full_name )
    `)
    .order('created_at', { ascending: false })

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

  return (
    <div className="space-y-6">
      <SupportTable initialTickets={mappedTickets} />
    </div>
  )
}
