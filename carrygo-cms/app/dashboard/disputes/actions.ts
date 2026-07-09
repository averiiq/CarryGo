'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function resolveDispute(
  requestId: string,
  resolution: 'refund_sender' | 'pay_traveller' | 'split',
  note?: string
) {
  const supabase = await createClient()

  const newStatus = resolution === 'refund_sender' ? 'cancelled' : 'completed'

  const { error } = await supabase
    .from('requests')
    .update({
      status: newStatus,
      message: note ? `[RESOLVED: ${resolution}] ${note}` : `[RESOLVED: ${resolution}]`,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  if (error) return { error: error.message }

  if (resolution === 'refund_sender' || resolution === 'split') {
    await supabase
      .from('payments')
      .update({ status: 'refunded' })
      .eq('request_id', requestId)
      .eq('status', 'locked')
  }

  if (resolution === 'pay_traveller' || resolution === 'split') {
    await supabase
      .from('payments')
      .update({ status: 'released', released_at: new Date().toISOString() })
      .eq('request_id', requestId)
      .eq('status', 'locked')
  }

  revalidatePath('/dashboard/disputes')
  return { error: null }
}

export async function addDisputeNote(requestId: string, note: string) {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('requests')
    .select('message')
    .eq('id', requestId)
    .single()

  const updatedMessage = existing?.message
    ? `${existing.message}\n[NOTE ${new Date().toISOString()}] ${note}`
    : `[NOTE ${new Date().toISOString()}] ${note}`

  const { error } = await supabase
    .from('requests')
    .update({ message: updatedMessage, updated_at: new Date().toISOString() })
    .eq('id', requestId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/disputes')
  return { error: null }
}
