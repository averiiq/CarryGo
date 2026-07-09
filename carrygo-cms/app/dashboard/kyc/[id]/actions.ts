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

  const { supabase, userId } = auth

  // Fetch the session to get user_id
  const { data: session, error: fetchError } = await supabase
    .from('kyc_sessions')
    .select('user_id, status')
    .eq('id', sessionId)
    .single()

  if (fetchError || !session) {
    return { success: false, error: 'KYC session not found' }
  }

  if (session.status === 'approved') {
    return { success: false, error: 'Session is already approved' }
  }

  // Update kyc_sessions status
  const { error: sessionError } = await supabase
    .from('kyc_sessions')
    .update({
      status: 'approved',
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  if (sessionError) {
    return { success: false, error: 'Failed to approve KYC session' }
  }

  // Update user_profiles kyc_status
  const { error: profileError } = await supabase
    .from('user_profiles')
    .update({ kyc_status: 'approved' })
    .eq('id', session.user_id)

  if (profileError) {
    return { success: false, error: 'Failed to update user profile' }
  }

  // Insert review history
  await supabase.from('kyc_review_history').insert({
    session_id: sessionId,
    reviewer_id: userId,
    action: 'approved',
    reason: null,
    notes: null,
  })

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

  const { supabase, userId } = auth

  // Fetch the session to get user_id
  const { data: session, error: fetchError } = await supabase
    .from('kyc_sessions')
    .select('user_id, status')
    .eq('id', sessionId)
    .single()

  if (fetchError || !session) {
    return { success: false, error: 'KYC session not found' }
  }

  if (session.status === 'rejected') {
    return { success: false, error: 'Session is already rejected' }
  }

  // Update kyc_sessions status
  const { error: sessionError } = await supabase
    .from('kyc_sessions')
    .update({
      status: 'rejected',
      rejection_reason: sanitizedReason,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  if (sessionError) {
    return { success: false, error: 'Failed to reject KYC session' }
  }

  // Update user_profiles kyc_status
  const { error: profileError } = await supabase
    .from('user_profiles')
    .update({ kyc_status: 'rejected' })
    .eq('id', session.user_id)

  if (profileError) {
    return { success: false, error: 'Failed to update user profile' }
  }

  // Insert review history
  await supabase.from('kyc_review_history').insert({
    session_id: sessionId,
    reviewer_id: userId,
    action: 'rejected',
    reason: sanitizedReason,
    notes: null,
  })

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

  const { supabase, userId } = auth

  // Fetch the session
  const { data: session, error: fetchError } = await supabase
    .from('kyc_sessions')
    .select('user_id, submission_attempt')
    .eq('id', sessionId)
    .single()

  if (fetchError || !session) {
    return { success: false, error: 'KYC session not found' }
  }

  // Update kyc_sessions: reset status, increment attempt
  const { error: sessionError } = await supabase
    .from('kyc_sessions')
    .update({
      status: 'pending',
      rejection_reason: sanitizedReason,
      submission_attempt: (session.submission_attempt || 1) + 1,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  if (sessionError) {
    return { success: false, error: 'Failed to request resubmission' }
  }

  // Update user_profiles kyc_status
  await supabase
    .from('user_profiles')
    .update({ kyc_status: 'pending' })
    .eq('id', session.user_id)

  // Insert review history
  await supabase.from('kyc_review_history').insert({
    session_id: sessionId,
    reviewer_id: userId,
    action: 'resubmission_requested',
    reason: sanitizedReason,
    notes: null,
  })

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

  const { supabase, userId } = auth

  // Verify session exists
  const { data: session, error: fetchError } = await supabase
    .from('kyc_sessions')
    .select('id')
    .eq('id', sessionId)
    .single()

  if (fetchError || !session) {
    return { success: false, error: 'KYC session not found' }
  }

  // Update reviewer_notes on the session
  const { error: updateError } = await supabase
    .from('kyc_sessions')
    .update({ reviewer_notes: sanitizedNote })
    .eq('id', sessionId)

  if (updateError) {
    return { success: false, error: 'Failed to save note' }
  }

  // Insert into review history
  await supabase.from('kyc_review_history').insert({
    session_id: sessionId,
    reviewer_id: userId,
    action: 'note_added',
    reason: null,
    notes: sanitizedNote,
  })

  revalidatePath(`/dashboard/kyc/${sessionId}`)
  return { success: true }
}
