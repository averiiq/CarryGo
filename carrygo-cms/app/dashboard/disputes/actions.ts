'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin, logAdminAction } from '@/utils/admin-guard'
import { isValidUuid, sanitizeText } from '@/lib/validation'

export async function resolveDispute(
  requestId: string,
  resolution: 'refund_sender' | 'pay_traveller' | 'split',
  note?: string
) {
  if (!isValidUuid(requestId)) return { error: 'Invalid request ID' }

  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const sanitizedNote = note ? sanitizeText(note, 1000) : undefined
  const newStatus = resolution === 'refund_sender' ? 'cancelled' : 'completed'

  const { error } = await auth.supabase
    .from('requests')
    .update({
      status: newStatus,
      message: sanitizedNote ? `[RESOLVED: ${resolution}] ${sanitizedNote}` : `[RESOLVED: ${resolution}]`,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  if (error) return { error: error.message }

  if (resolution === 'refund_sender') {
    const { error: payErr } = await auth.supabase
      .from('payments')
      .update({ status: 'refunded' })
      .eq('request_id', requestId)
      .eq('status', 'locked')
    if (payErr) return { error: `Request resolved but payment refund failed: ${payErr.message}` }
  } else if (resolution === 'pay_traveller') {
    const { error: payErr } = await auth.supabase
      .from('payments')
      .update({ status: 'released', released_at: new Date().toISOString() })
      .eq('request_id', requestId)
      .eq('status', 'locked')
    if (payErr) return { error: `Request resolved but payment release failed: ${payErr.message}` }
  } else if (resolution === 'split') {
    // For split: refund the sender (partial refund logic would go here in production).
    // Currently marks as refunded since split payment isn't implemented at the DB level.
    const { error: payErr } = await auth.supabase
      .from('payments')
      .update({ status: 'refunded' })
      .eq('request_id', requestId)
      .eq('status', 'locked')
    if (payErr) return { error: `Request resolved but split payment failed: ${payErr.message}` }
  }

  await logAdminAction(auth.supabase, auth.userId, 'resolve_dispute', {
    request_id: requestId,
    resolution,
    note: sanitizedNote,
  })

  revalidatePath('/dashboard/disputes')
  return { error: null }
}

export async function addDisputeNote(requestId: string, note: string) {
  if (!isValidUuid(requestId)) return { error: 'Invalid request ID' }

  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const sanitizedNote = sanitizeText(note, 1000)
  if (!sanitizedNote) return { error: 'Note cannot be empty' }

  const { data: existing } = await auth.supabase
    .from('requests')
    .select('message')
    .eq('id', requestId)
    .single()

  const updatedMessage = existing?.message
    ? `${existing.message}\n[NOTE ${new Date().toISOString()}] ${sanitizedNote}`
    : `[NOTE ${new Date().toISOString()}] ${sanitizedNote}`

  const { error } = await auth.supabase
    .from('requests')
    .update({ message: updatedMessage, updated_at: new Date().toISOString() })
    .eq('id', requestId)

  if (error) return { error: error.message }

  await logAdminAction(auth.supabase, auth.userId, 'add_dispute_note', {
    request_id: requestId,
  })

  revalidatePath('/dashboard/disputes')
  return { error: null }
}
