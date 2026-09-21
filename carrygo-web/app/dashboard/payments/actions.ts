'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin, logAdminAction } from '@/utils/admin-guard'
import { isValidUuid, sanitizeText } from '@/lib/validation'

type ActionResult = { success: true } | { success: false; error: string }

export async function adminReleasePayment(paymentId: string): Promise<ActionResult> {
  if (!isValidUuid(paymentId)) {
    return { success: false, error: 'Invalid payment ID' }
  }

  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }

  const { data: payment, error: fetchError } = await auth.supabase
    .from('payments')
    .select('id, request_id, amount, status')
    .eq('id', paymentId)
    .single()

  if (fetchError || !payment) {
    return { success: false, error: 'Payment record not found' }
  }

  if (payment.status !== 'locked') {
    return { success: false, error: `Cannot release payment with status "${payment.status}". Only locked payments can be released.` }
  }

  // Update payment status to released
  const { error: updateError } = await auth.supabase
    .from('payments')
    .update({
      status: 'released',
      released_at: new Date().toISOString(),
    })
    .eq('id', paymentId)
    .eq('status', 'locked')

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Update linked request to completed if it was accepted
  if (payment.request_id) {
    await auth.supabase
      .from('requests')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.request_id)
      .in('status', ['accepted', 'pending'])
  }

  await logAdminAction(auth.supabase, auth.userId, 'admin_release_payment', {
    payment_id: paymentId,
    request_id: payment.request_id,
    amount: payment.amount,
  })

  revalidatePath('/dashboard/payments')
  revalidatePath('/dashboard/disputes')
  return { success: true }
}

export async function adminRefundPayment(
  paymentId: string,
  reason?: string
): Promise<ActionResult> {
  if (!isValidUuid(paymentId)) {
    return { success: false, error: 'Invalid payment ID' }
  }

  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }

  const sanitizedReason = reason ? sanitizeText(reason, 500) : 'Admin initiated refund'

  const { data: payment, error: fetchError } = await auth.supabase
    .from('payments')
    .select('id, request_id, amount, status')
    .eq('id', paymentId)
    .single()

  if (fetchError || !payment) {
    return { success: false, error: 'Payment record not found' }
  }

  if (payment.status !== 'locked') {
    return { success: false, error: `Cannot refund payment with status "${payment.status}". Only locked payments can be refunded.` }
  }

  // Update payment status to refunded
  const { error: updateError } = await auth.supabase
    .from('payments')
    .update({
      status: 'refunded',
    })
    .eq('id', paymentId)
    .eq('status', 'locked')

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Update linked request to cancelled with note
  if (payment.request_id) {
    await auth.supabase
      .from('requests')
      .update({
        status: 'cancelled',
        message: `[ADMIN REFUND: ${sanitizedReason}]`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.request_id)
  }

  await logAdminAction(auth.supabase, auth.userId, 'admin_refund_payment', {
    payment_id: paymentId,
    request_id: payment.request_id,
    amount: payment.amount,
    reason: sanitizedReason,
  })

  revalidatePath('/dashboard/payments')
  revalidatePath('/dashboard/disputes')
  return { success: true }
}
