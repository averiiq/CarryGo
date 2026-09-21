'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin, logAdminAction } from '@/utils/admin-guard'
import { isValidUuid } from '@/lib/validation'

export type BulkKycResult =
  | { success: true; approvedCount: number }
  | { success: false; error: string }

export async function bulkApproveKycSessions(sessionIds: string[]): Promise<BulkKycResult> {
  if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
    return { success: false, error: 'No sessions selected' }
  }

  if (sessionIds.length > 100) {
    return { success: false, error: 'Maximum batch size is 100' }
  }

  for (const id of sessionIds) {
    if (!isValidUuid(id)) {
      return { success: false, error: `Invalid session ID: ${id}` }
    }
  }

  const auth = await requireAdmin()
  if ('error' in auth) {
    return { success: false, error: auth.error }
  }

  // Retrieve user_ids for the given sessionIds
  const { data: sessions, error: fetchError } = await auth.supabase
    .from('kyc_sessions')
    .select('id, user_id, status')
    .in('id', sessionIds)

  if (fetchError || !sessions || sessions.length === 0) {
    return { success: false, error: fetchError ? fetchError.message : 'No matching sessions found' }
  }

  // Get distinct user IDs
  const userIds = Array.from(new Set(sessions.map((s) => s.user_id)))

  // Invoke atomic RPC cms_bulk_approve_kyc
  const { data: approvedCount, error: rpcError } = await auth.supabase.rpc('cms_bulk_approve_kyc', {
    p_actor_id: auth.userId,
    p_user_ids: userIds,
  })

  if (rpcError) {
    return { success: false, error: rpcError.message }
  }

  const count = typeof approvedCount === 'number' ? approvedCount : userIds.length

  await logAdminAction(auth.supabase, auth.userId, 'bulk_approve_kyc', {
    session_count: sessionIds.length,
    user_count: userIds.length,
    approved_count: count,
  })

  revalidatePath('/dashboard/kyc')
  revalidatePath('/dashboard/users')

  return { success: true, approvedCount: count }
}
