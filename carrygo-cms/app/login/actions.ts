'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const email = formData.get('email')
  const password = formData.get('password')
  const next = formData.get('next') as string | null

  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    redirect('/login?error=auth_failed' + (next ? `&next=${encodeURIComponent(next)}` : ''))
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })

  if (error) {
    redirect('/login?error=auth_failed' + (next ? `&next=${encodeURIComponent(next)}` : ''))
  }

  // Check role
  let redirectTarget = next || '/dashboard'
  if (data.user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('system_role')
      .eq('id', data.user.id)
      .maybeSingle()

    if (profile?.system_role === 'admin') {
      redirectTarget = next || '/dashboard'
    }
  }

  revalidatePath('/', 'layout')
  redirect(redirectTarget)
}


export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
