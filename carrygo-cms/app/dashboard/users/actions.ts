'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/utils/admin-guard'
import { isValidUuid } from '@/lib/validation'

export async function toggleUserStatus(userId: string, currentStatus: string) {
  if (!isValidUuid(userId)) return { success: false, error: 'Invalid user ID' }
  if (!['active', 'banned'].includes(currentStatus)) return { success: false, error: 'Invalid current status' }

  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }

  const { data: target } = await auth.supabase
    .from('user_profiles')
    .select('system_role')
    .eq('id', userId)
    .single()

  if (target?.system_role === 'admin') {
    return { success: false, error: 'Cannot modify admin users' }
  }

  const newStatus = currentStatus === 'active' ? 'banned' : 'active'

  const { error } = await auth.supabase
    .from('user_profiles')
    .update({ status: newStatus })
    .eq('id', userId)

  if (error) {
    return { success: false, error: 'Failed to update user status' }
  }

  revalidatePath('/dashboard/users')
  return { success: true, newStatus }
}
