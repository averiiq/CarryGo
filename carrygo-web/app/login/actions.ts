'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function sendOtp(email: string): Promise<{ success: boolean; error?: string }> {
  const cleanEmail = email.trim().toLowerCase()
  if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
    return { success: false, error: 'Please enter a valid email address.' }
  }

  // Reviewer account special handling: bypass sending actual email
  if (cleanEmail === 'carrygo.reviewer@gmail.com') {
    return { success: true }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email: cleanEmail,
    options: {
      shouldCreateUser: true,
    },
  })

  if (error) {
    if (error.message.toLowerCase().includes('rate limit')) {
      return { success: false, error: 'Too many attempts. Please wait a minute before requesting another code.' }
    }
    return { success: false, error: error.message || 'Failed to send verification code. Please try again.' }
  }

  return { success: true }
}

export async function verifyOtp(
  email: string,
  token: string,
  nextPath?: string
): Promise<{ success: boolean; error?: string; redirectUrl?: string }> {
  const cleanEmail = email.trim().toLowerCase()
  const cleanToken = token.trim()

  if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
    return { success: false, error: 'Invalid email address.' }
  }

  if (!cleanToken || cleanToken.length !== 6) {
    return { success: false, error: 'Please enter all 6 digits of your verification code.' }
  }

  const supabase = await createClient()

  // Reviewer test account bypass
  if (cleanEmail === 'carrygo.reviewer@gmail.com' && cleanToken === '202611') {
    const { data: revData, error: revError } = await supabase.auth.signInWithPassword({
      email: 'carrygo.reviewer@gmail.com',
      password: 'CarryGo@Review2026!',
    })

    if (revError || !revData.user) {
      return { success: false, error: 'Reviewer credentials verification failed.' }
    }

    revalidatePath('/', 'layout')
    return { success: true, redirectUrl: nextPath || '/activity' }
  }

  const { data, error } = await supabase.auth.verifyOtp({
    email: cleanEmail,
    token: cleanToken,
    type: 'email',
  })

  if (error || !data.user) {
    return { success: false, error: 'Invalid or expired verification code. Please check your inbox and try again.' }
  }

  // Ensure user profile exists in user_profiles
  try {
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id, system_role')
      .eq('id', data.user.id)
      .maybeSingle()

    if (!existingProfile) {
      const defaultName = cleanEmail.split('@')[0]
      await supabase.from('user_profiles').upsert(
        {
          id: data.user.id,
          email: cleanEmail,
          full_name: defaultName.charAt(0).toUpperCase() + defaultName.slice(1),
          system_role: 'user',
          status: 'active',
        },
        { onConflict: 'id', ignoreDuplicates: true }
      )
    }

    // Role-based target redirect
    let target = nextPath || '/activity'
    if (existingProfile?.system_role === 'admin') {
      const cmsUrl = process.env.NEXT_PUBLIC_CMS_URL || 'https://carrygo.averiq.in'
      target = `${cmsUrl}/dashboard`
    }

    revalidatePath('/', 'layout')
    return { success: true, redirectUrl: target }
  } catch (profileErr) {
    console.warn('Profile initialization note:', profileErr)
    revalidatePath('/', 'layout')
    return { success: true, redirectUrl: nextPath || '/activity' }
  }
}

export async function reviewerLogin(nextPath?: string) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: 'carrygo.reviewer@gmail.com',
    password: 'CarryGo@Review2026!',
  })

  if (error) {
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
