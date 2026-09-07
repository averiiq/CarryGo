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

export async function updateUserSystemRole(
  userId: string,
  newRole: 'user' | 'support_agent'
) {
  if (!isValidUuid(userId)) return { success: false, error: 'Invalid user ID' }
  if (!['user', 'support_agent'].includes(newRole)) {
    return { success: false, error: 'Invalid role assignment' }
  }

  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }

  const { data: target, error: targetError } = await auth.supabase
    .from('user_profiles')
    .select('system_role')
    .eq('id', userId)
    .single()

  if (targetError || !target) return { success: false, error: 'User not found' }
  if (target.system_role === 'admin') {
    return { success: false, error: 'Cannot modify administrator roles from this console.' }
  }

  const { error } = await auth.supabase
    .from('user_profiles')
    .update({ system_role: newRole })
    .eq('id', userId)

  if (error) return { success: false, error: error.message }

  await logAdminAction(auth.supabase, auth.userId, 'update_user_system_role', {
    target_user_id: userId,
    from_role: target.system_role,
    to_role: newRole,
  })

  revalidatePath('/dashboard/users')
  return { success: true }
}

export async function getUserDetails(userId: string) {
  if (!isValidUuid(userId)) return { data: null, error: 'Invalid user ID' }

  const auth = await requireAdmin()
  if ('error' in auth) return { data: null, error: auth.error }

  const supabase = auth.supabase

  const [
    { data: profile, error: profileError },
    { count: tripsCount },
    { count: parcelsCount },
    { count: requestsCount },
    { data: kycSession },
  ] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single(),
    supabase.from('trips').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('parcels').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase
      .from('requests')
      .select('*', { count: 'exact', head: true })
      .or(`sender_id.eq.${userId},traveller_id.eq.${userId}`),
    supabase
      .from('kyc_sessions')
      .select('id, status, id_type, submission_attempt, created_at, reviewed_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (profileError || !profile) {
    return { data: null, error: profileError?.message || 'User not found' }
  }

  return {
    data: {
      profile,
      tripsCount: tripsCount ?? 0,
      parcelsCount: parcelsCount ?? 0,
      requestsCount: requestsCount ?? 0,
      kycSession: kycSession ?? null,
    },
    error: null,
  }
}
