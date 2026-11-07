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

  // Update payment status to released. Use .select() so we can detect when
  // the status guard filtered the row out — meaning another admin released
  // this payment concurrently.
  const { data: updated, error: updateError } = await auth.supabase
    .from('payments')
    .update({
      status: 'released',
      released_at: new Date().toISOString(),
    })
    .eq('id', paymentId)
    .eq('status', 'locked')
    .select('id')

  if (updateError) {
    return { success: false, error: updateError.message }
  }
  if (!updated || updated.length === 0) {
    return { success: false, error: 'Payment was already released or modified by another admin. Refresh and try again.' }
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
    .select('id, request_id, amount, status, razorpay_payment_id')
    .eq('id', paymentId)
    .single()

  if (fetchError || !payment) {
    return { success: false, error: 'Payment record not found' }
  }

  if (payment.status !== 'locked') {
    return { success: false, error: `Cannot refund payment with status "${payment.status}". Only locked payments can be refunded.` }
  }

  // If payment was processed through Razorpay, issue refund via gateway API first
  if (payment.razorpay_payment_id) {
    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    if (!keyId || !keySecret) {
      if (process.env.NODE_ENV === 'production') {
        return {
          success: false,
          error: 'Razorpay API credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are missing. Cannot issue gateway refund in production.',
        }
      }
      console.warn('[CMS Admin] Razorpay credentials unset in non-production; skipping external gateway refund call.')
    } else {
      const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString('base64')
      try {
        const rzpRes = await fetch(
          `https://api.razorpay.com/v1/payments/${encodeURIComponent(payment.razorpay_payment_id)}/refund`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${basicAuth}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              notes: {
                admin_reason: sanitizedReason,
                refunded_by_admin: auth.userId,
              },
            }),
          }
        )

        if (!rzpRes.ok) {
          const errText = await rzpRes.text()
          return { success: false, error: `Razorpay refund failed (${rzpRes.status}): ${errText}` }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gateway connection error'
        return { success: false, error: `Unable to connect to payment provider: ${msg}` }
      }
    }
  }

  // Update payment status to refunded. Detect zero-row updates so we don't
  // follow up with a request cancellation after a losing concurrent write.
  const { data: refundedRows, error: updateError } = await auth.supabase
    .from('payments')
    .update({
      status: 'refunded',
    })
    .eq('id', paymentId)
    .eq('status', 'locked')
    .select('id')

  if (updateError) {
    return { success: false, error: updateError.message }
  }
  if (!refundedRows || refundedRows.length === 0) {
    return { success: false, error: 'Payment was already modified by another admin. Refresh and try again.' }
  }

  // Update linked request to cancelled only if it is in a state that still
  // reflects an active escrow — guards against overwriting a completed or
  // already-cancelled request.
  if (payment.request_id) {
    await auth.supabase
      .from('requests')
      .update({
        status: 'cancelled',
        message: `[ADMIN REFUND: ${sanitizedReason}]`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.request_id)
      .in('status', ['accepted', 'pending'])
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
