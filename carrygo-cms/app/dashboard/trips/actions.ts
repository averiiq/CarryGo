'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/utils/admin-guard'
import { isValidUuid } from '@/lib/validation'

export async function cancelTrip(tripId: string) {
  if (!isValidUuid(tripId)) return { error: 'Invalid trip ID' }

  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const { error } = await auth.supabase
    .from('trips')
    .update({ status: 'cancelled' })
    .eq('id', tripId)

  if (error) {
    return { error: 'Failed to cancel trip' }
  }

  revalidatePath('/dashboard/trips')
  return { success: true }
}
