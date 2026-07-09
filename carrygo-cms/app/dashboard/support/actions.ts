'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/utils/admin-guard'
import { isValidUuid } from '@/lib/validation'

const VALID_TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const

export async function updateTicketStatus(ticketId: string, newStatus: string) {
  if (!isValidUuid(ticketId)) return { success: false, error: 'Invalid ticket ID' }
  if (!VALID_TICKET_STATUSES.includes(newStatus as typeof VALID_TICKET_STATUSES[number])) {
    return { success: false, error: 'Invalid ticket status' }
  }

  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }

  const { error } = await auth.supabase
    .from('support_tickets')
    .update({ status: newStatus })
    .eq('id', ticketId)

  if (error) {
    return { success: false, error: 'Failed to update ticket status' }
  }

  revalidatePath('/dashboard/support')
  return { success: true }
}
