'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function requireAdmin(): Promise<
  { error: string } | { supabase: ReturnType<typeof createAdminClient>; userId: string }
> {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return { error: 'Authentication required' }
  }

  // Use service role to check system_role (avoids RLS issues on profile check too)
  const adminClient = createAdminClient()

  const { data: profile } = await adminClient
    .from('user_profiles')
    .select('system_role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.system_role === 'user') {
    return { error: 'Admin access required' }
  }

  // Return the service-role client for all subsequent queries
  return { supabase: adminClient, userId: user.id }
}
