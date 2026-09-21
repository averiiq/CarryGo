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
  let redirectTarget = next || '/activity'
  if (data.user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('system_role')
      .eq('id', data.user.id)
      .maybeSingle()

    if (profile?.system_role === 'admin') {
      const cmsUrl = process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001'
      redirectTarget = next || `${cmsUrl}/dashboard`
    }
  }

  revalidatePath('/', 'layout')
  redirect(redirectTarget)
}

export async function signup(formData: FormData) {
  const email = formData.get('email')
  const password = formData.get('password')
  const fullName = formData.get('fullName') as string | null
  const phone = formData.get('phone') as string | null
  const next = formData.get('next') as string | null

  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    redirect('/login?mode=signup&error=invalid_inputs')
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        full_name: fullName || 'CarryGo User',
        phone: phone || '',
      },
    },
  })

  if (error) {
    redirect('/login?mode=signup&error=' + encodeURIComponent(error.message))
  }

  // Auto create or update profile if user was created
  if (data.user) {
    await supabase.from('user_profiles').upsert({
      id: data.user.id,
      email: data.user.email,
      full_name: fullName || 'CarryGo User',
      system_role: 'user',
      phone: phone || null,
    })
  }

  revalidatePath('/', 'layout')
  redirect(next || '/activity')
}

export async function reviewerLogin(nextPath?: string) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: 'carrygo.reviewer@gmail.com',
    password: 'CarryGo@Review2026!',
  })

  if (error) {
    // If reviewer user password wasn't set, fallback to creating session or redirect with message
    redirect('/login?error=reviewer_failed')
  }

  revalidatePath('/', 'layout')
  redirect(nextPath || '/activity')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
