'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

/**
 * Logs an admin action for audit trail purposes.
 * Callers should invoke this after performing sensitive operations.
 */
export async function logAdminAction(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  action: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  // Best-effort audit log - don't block the caller on failure
  await supabase
    .from('admin_audit_log')
    .insert({
      admin_user_id: userId,
      action,
      metadata: metadata ?? {},
      created_at: new Date().toISOString(),
    })
    .then(() => {})
    .catch(() => {
      // If the audit table doesn't exist yet, silently skip.
      // In production, ensure admin_audit_log table is created.
    })
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
