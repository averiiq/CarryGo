'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin, logAdminAction } from '@/utils/admin-guard'
import { isValidUuid, sanitizeText } from '@/lib/validation'
import { isAwsCmsBackendEnabled } from '@/utils/backend/provider'
import { awsCmsRequest } from '@/utils/aws/api'

export async function resolveDispute(
  requestId: string,
  resolution: 'refund_sender' | 'pay_traveller',
  note?: string
) {
  if (!isValidUuid(requestId)) return { error: 'Invalid request ID' }

  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const sanitizedNote = note ? sanitizeText(note, 1000) : undefined
  const newStatus = resolution === 'refund_sender' ? 'cancelled' : 'completed'

  if (isAwsCmsBackendEnabled()) {
    try {
      const message = sanitizedNote
        ? `[RESOLVED: ${resolution}] ${sanitizedNote}`
        : `[RESOLVED: ${resolution}]`

      await awsCmsRequest(`/requests/${requestId}/status`, {
        method: 'PATCH',
        body: {
          status: newStatus,
          userId: auth.userId,
          message,
        },
      })

      revalidatePath('/dashboard/disputes')
      return { error: null }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to resolve dispute'
      return { error: message }
    }
  }

  const { error } = await auth.supabase.rpc('cms_resolve_dispute', {
    p_actor_id: auth.userId,
    p_request_id: requestId,
    p_resolution: resolution,
    p_note: sanitizedNote ?? null,
  })

  if (error) {
    // If no locked escrow payment is active, still allow admin to conclude the dispute on the request record
    if (error.message.includes('Locked payment not found')) {
      const formattedMessage = sanitizedNote
        ? `[RESOLVED: ${resolution}] ${sanitizedNote}`
        : `[RESOLVED: ${resolution}]`

      const { error: fallbackError } = await auth.supabase
        .from('requests')
        .update({
          status: newStatus,
          message: formattedMessage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId)

      if (fallbackError) return { error: fallbackError.message }

      await logAdminAction(auth.supabase, auth.userId, 'resolve_dispute_unpaid', {
        request_id: requestId,
        resolution,
        note: sanitizedNote,
      })

      revalidatePath('/dashboard/disputes')
      return { error: null }
    }

    return { error: error.message }
  }

  revalidatePath('/dashboard/disputes')
  return { error: null }
}

export async function addDisputeNote(requestId: string, note: string) {
  if (!isValidUuid(requestId)) return { error: 'Invalid request ID' }

  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const sanitizedNote = sanitizeText(note, 1000)
  if (!sanitizedNote) return { error: 'Note cannot be empty' }

  if (isAwsCmsBackendEnabled()) {
    try {
      const response = (await awsCmsRequest(`/requests/${requestId}`)) as {
        data: {
          status?: string
          message?: string
        }
      }
      const existingMessage = response.data?.message
      const updatedMessage = existingMessage
        ? `${existingMessage}\n[NOTE ${new Date().toISOString()}] ${sanitizedNote}`
        : `[NOTE ${new Date().toISOString()}] ${sanitizedNote}`

      await awsCmsRequest(`/requests/${requestId}/status`, {
        method: 'PATCH',
        body: {
          status: response.data?.status ?? 'failed',
          userId: auth.userId,
          message: updatedMessage,
        },
      })

      revalidatePath('/dashboard/disputes')
      return { error: null }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add note'
      return { error: message }
    }
  }

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
