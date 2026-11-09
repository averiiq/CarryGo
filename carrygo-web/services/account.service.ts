/**
 * Account service (web) — ports the deletion/recreation calls from
 * `CarryGo/services/account.service.ts` so account deletion works
 * the same way on both platforms (via security-definer RPCs).
 */

import { createClient } from '@/utils/supabase/client'

export async function requestAccountDeletion(): Promise<{ error: string | null }> {
  const sb = createClient()
  const { data, error } = await sb.rpc('soft_delete_user_account')
  if (error) return { error: error.message ?? 'Unable to delete account right now.' }
  if (data && typeof data === 'object' && 'error' in data && (data as { error?: string }).error) {
    return { error: String((data as { error?: string }).error) }
  }
  return { error: null }
}

export async function recreateUserAccount(
  userId?: string,
): Promise<{ error: string | null }> {
  try {
    const sb = createClient()
    const { data, error } = userId
      ? await sb.rpc('recreate_user_account', { p_user_id: userId })
      : await sb.rpc('recreate_user_account')
    if (error) return { error: error.message ?? 'Unable to re-create account right now.' }
    if (data && typeof data === 'object' && 'error' in data && (data as { error?: string }).error) {
      return { error: String((data as { error?: string }).error) }
    }
    return { error: null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error re-creating account'
    return { error: message }
  }
}
