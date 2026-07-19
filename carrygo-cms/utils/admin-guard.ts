'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

/**
 * Logs an admin action for audit trail purposes.
 * Callers should invoke this after performing sensitive operations.
 * Falls back to audit_events table if admin_audit_log doesn't exist.
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

  if (error) {
    console.error(`[AUDIT] Failed to log admin action "${action}":`, error.message)
  }
}

export async function requireAdmin(): Promise<
  { error: string } | { supabase: ReturnType<typeof createAdminClient>; userId: string }
> {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return { error: 'Authentication required' }
  }

  // Use service role to check system_role and account status (avoids RLS issues)
  const adminClient = createAdminClient()

  const { data: profile } = await adminClient
    .from('user_profiles')
    .select('system_role, account_status')
    .eq('id', user.id)
    .single()

  if (!profile || profile.system_role === 'user') {
    return { error: 'Admin access required' }
  }

  // Block banned or suspended accounts from admin access
  if (profile.account_status && profile.account_status !== 'active') {
    return { error: 'Account is not active. Access denied.' }
  }

  // Return the service-role client and userId for subsequent queries and audit logging
  return { supabase: adminClient, userId: user.id }
}
