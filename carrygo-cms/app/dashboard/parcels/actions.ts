'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin, logAdminAction } from '@/utils/admin-guard'
import { isValidUuid } from '@/lib/validation'

export async function cancelParcel(parcelId: string) {
  if (!isValidUuid(parcelId)) return { error: 'Invalid parcel ID' }

  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const { error } = await auth.supabase
    .from('parcels')
    .update({ status: 'failed' })
    .eq('id', parcelId)

  if (error) {
    return { error: 'Failed to cancel parcel' }
  }

  await logAdminAction(auth.supabase, auth.userId, 'cancel_parcel', { parcel_id: parcelId })

  revalidatePath('/dashboard/parcels')
  return { success: true }
}
