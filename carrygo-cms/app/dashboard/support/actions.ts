'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin, logAdminAction } from '@/utils/admin-guard'
import { isValidUuid } from '@/lib/validation'

const VALID_TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const

export async function updateTicketStatus(ticketId: string, newStatus: string) {
  if (!isValidUuid(ticketId)) return { success: false, error: 'Invalid ticket ID' }
  if (!VALID_TICKET_STATUSES.includes(newStatus as typeof VALID_TICKET_STATUSES[number])) {
    return { success: false, error: 'Invalid ticket status' }
  }

  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }

  // Fetch ticket details for user notification and audit
  const { data: ticket, error: fetchError } = await auth.supabase
    .from('support_tickets')
    .select('id, user_id, subject, status')
    .eq('id', ticketId)
    .single()

  if (fetchError || !ticket) {
    return { success: false, error: 'Support ticket not found' }
  }

  const { error: updateError } = await auth.supabase
    .from('support_tickets')
    .update({ 
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', ticketId)

  if (updateError) {
    return { success: false, error: 'Failed to update ticket status in database' }
  }

  await logAdminAction(auth.supabase, auth.userId, 'update_ticket_status', {
    ticket_id: ticketId,
    previous_status: ticket.status,
    new_status: newStatus,
  })

  // Send an in-app notification to the ticket owner
  if (ticket.user_id) {
    const statusLabels: Record<string, string> = {
      open: 're-opened',
      in_progress: 'marked as in progress by customer support',
      resolved: 'resolved by customer support',
      closed: 'closed',
    }
    const label = statusLabels[newStatus] || newStatus

    try {
      await auth.supabase
        .from('notifications')
        .insert({
          user_id: ticket.user_id,
          title: '🎧 Support Ticket Update',
          body: `Your support request "${ticket.subject}" has been ${label}.`,
          type: 'general',
          category: 'general',
          priority: 'normal',
          deep_link: '/support',
          data: {
            ticket_id: ticketId,
            status: newStatus,
          },
        })
    } catch (notifErr) {
      console.warn('Failed to insert user notification for ticket update:', notifErr)
    }
  }

  revalidatePath('/dashboard/support')
  return { success: true }
}

export async function assignTicket(ticketId: string, assignToUserId: string | null) {
  if (!isValidUuid(ticketId)) return { success: false, error: 'Invalid ticket ID' }
  if (assignToUserId && !isValidUuid(assignToUserId)) {
    return { success: false, error: 'Invalid user ID for assignment' }
  }

  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }

  const targetUserId = assignToUserId === 'me' ? auth.userId : assignToUserId

  const { error: updateError } = await auth.supabase
    .from('support_tickets')
    .update({ 
      assigned_to: targetUserId,
      updated_at: new Date().toISOString()
    })
    .eq('id', ticketId)

  if (updateError) {
    return { success: false, error: 'Failed to assign ticket' }
  }

  await logAdminAction(auth.supabase, auth.userId, 'assign_ticket', {
    ticket_id: ticketId,
    assigned_to: targetUserId,
  })

  revalidatePath('/dashboard/support')
  return { success: true, assignedTo: targetUserId }
}
