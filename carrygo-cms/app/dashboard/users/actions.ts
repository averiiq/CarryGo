'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin, logAdminAction } from '@/utils/admin-guard'
import { isValidUuid } from '@/lib/validation'

export async function toggleUserStatus(userId: string) {
  if (!isValidUuid(userId)) return { success: false, error: 'Invalid user ID' }

  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }

  const { data: target, error: targetError } = await auth.supabase
    .from('user_profiles')
    .select('system_role, status')
    .eq('id', userId)
    .single()

  if (targetError || !target) return { success: false, error: 'User not found' }
  if (target.system_role === 'admin') {
    return { success: false, error: 'Cannot modify admin users' }
  }

  const newStatus = target.status === 'active' ? 'banned' : 'active'

  const { data: updated, error } = await auth.supabase
    .from('user_profiles')
    .update({ status: newStatus })
    .eq('id', userId)
    .eq('status', target.status)
    .select('id')
    .maybeSingle()

  if (error || !updated) {
    return { success: false, error: 'Failed to update user status' }
  }

  await logAdminAction(auth.supabase, auth.userId, 'toggle_user_status', {
    target_user_id: userId,
    from_status: target.status,
    to_status: newStatus,
  })

  revalidatePath('/dashboard/users')
  return { success: true, newStatus }
}
