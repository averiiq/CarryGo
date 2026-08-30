'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/utils/admin-guard'
import { isValidUuid, sanitizeText } from '@/lib/validation'

type ActionResult = { success: true } | { success: false; error: string }

export async function approveKycSession(sessionId: string): Promise<ActionResult> {
  if (!isValidUuid(sessionId)) {
    return { success: false, error: 'Invalid session ID' }
  }

  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }

  const { error } = await auth.supabase.rpc('cms_review_kyc', {
    p_actor_id: auth.userId,
    p_session_id: sessionId,
    p_action: 'approved',
    p_reason: null,
    p_note: null,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/dashboard/kyc')
  revalidatePath(`/dashboard/kyc/${sessionId}`)
  return { success: true }
}

export async function rejectKycSession(sessionId: string, reason: string): Promise<ActionResult> {
  if (!isValidUuid(sessionId)) {
    return { success: false, error: 'Invalid session ID' }
  }

  const sanitizedReason = sanitizeText(reason, 1000)
  if (sanitizedReason.length < 10) {
    return { success: false, error: 'Rejection reason must be at least 10 characters' }
  }

  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }

  const { error } = await auth.supabase.rpc('cms_review_kyc', {
    p_actor_id: auth.userId,
    p_session_id: sessionId,
    p_action: 'rejected',
    p_reason: sanitizedReason,
    p_note: null,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/dashboard/kyc')
  revalidatePath(`/dashboard/kyc/${sessionId}`)
  return { success: true }
}

export async function requestResubmission(sessionId: string, reason: string): Promise<ActionResult> {
  if (!isValidUuid(sessionId)) {
    return { success: false, error: 'Invalid session ID' }
  }

  const sanitizedReason = sanitizeText(reason, 1000)
  if (sanitizedReason.length < 10) {
    return { success: false, error: 'Reason must be at least 10 characters' }
  }

  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }

  const { error } = await auth.supabase.rpc('cms_review_kyc', {
    p_actor_id: auth.userId,
    p_session_id: sessionId,
    p_action: 'requested_resubmission',
    p_reason: sanitizedReason,
    p_note: null,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/dashboard/kyc')
  revalidatePath(`/dashboard/kyc/${sessionId}`)
  return { success: true }
}

export async function addReviewerNote(sessionId: string, note: string): Promise<ActionResult> {
  if (!isValidUuid(sessionId)) {
    return { success: false, error: 'Invalid session ID' }
  }

  const sanitizedNote = sanitizeText(note, 2000)
  if (sanitizedNote.length === 0) {
    return { success: false, error: 'Note cannot be empty' }
  }

  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }

  const { error } = await auth.supabase.rpc('cms_review_kyc', {
    p_actor_id: auth.userId,
    p_session_id: sessionId,
    p_action: 'note_added',
    p_reason: null,
    p_note: sanitizedNote,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath(`/dashboard/kyc/${sessionId}`)
  return { success: true }
}
