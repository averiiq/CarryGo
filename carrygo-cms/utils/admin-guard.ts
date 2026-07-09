'use server'

import { createClient } from '@/utils/supabase/server'

export async function requireAdmin(): Promise<{ error: string } | { supabase: Awaited<ReturnType<typeof createClient>>; userId: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Authentication required' }
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('system_role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.system_role === 'user') {
    return { error: 'Admin access required' }
  }

  return { supabase, userId: user.id }
}
