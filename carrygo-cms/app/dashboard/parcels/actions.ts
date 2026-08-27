'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin, logAdminAction } from '@/utils/admin-guard'
import { isValidUuid } from '@/lib/validation'
import { isAwsCmsBackendEnabled } from '@/utils/backend/provider'
import { awsCmsRequest } from '@/utils/aws/api'

export async function cancelParcel(parcelId: string) {
  if (!isValidUuid(parcelId)) return { error: 'Invalid parcel ID' }

  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  if (isAwsCmsBackendEnabled()) {
    try {
      await awsCmsRequest(`/parcels/${parcelId}/status`, {
        method: 'PATCH',
        body: {
          status: 'failed',
          userId: auth.userId,
        },
      })
      revalidatePath('/dashboard/parcels')
      return { success: true }
    } catch {
      return { error: 'Failed to cancel parcel' }
    }
  }

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
