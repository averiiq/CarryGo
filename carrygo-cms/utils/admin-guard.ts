'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

/**
 * Logs an admin action for audit trail purposes.
 * Callers should invoke this after performing sensitive operations.
 * Throws when the event cannot be persisted so failures are never silent.
 */
export async function logAdminAction(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  action: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from('audit_events')
    .insert({
      actor_id: userId,
      entity_type: 'admin_action',
      entity_id: userId,
      event_type: action,
      payload: metadata ?? {},
      created_at: new Date().toISOString(),
    })

  if (error) throw new Error(`Failed to record admin audit event: ${error.message}`)
}

export async function requireAdmin(): Promise<
  { error: string } | { supabase: ReturnType<typeof createAdminClient>; userId: string }
> {
  const authClient = await createClient()
  const { data: { user }, error: authError } = await authClient.auth.getUser()

  if (!user || authError) {
    return { error: 'Authentication required' }
  }

  // Use service role to check system_role and account status (avoids RLS issues)
  const adminClient = createAdminClient()

  const { data: profile, error: profileError } = await adminClient
    .from('user_profiles')
    .select('system_role, status')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return { error: 'Admin access required' }
  }

  if (profile.system_role !== 'admin') {
    return { error: 'Admin access required' }
  }

  if (profile.status !== 'active') {
    return { error: 'Account is not active. Access denied.' }
  }

  return { supabase: adminClient, userId: user.id }
}
