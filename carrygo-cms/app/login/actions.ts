'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'

const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 60_000 * 5

function checkRateLimit(identifier: string): boolean {
  const now = Date.now()
  const entry = loginAttempts.get(identifier)
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(identifier, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (entry.count >= MAX_ATTEMPTS) return false
  entry.count++
  return true
}

export async function login(formData: FormData) {
  const email = formData.get('email')
  const password = formData.get('password')

  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    redirect('/login?error=Authentication failed')
  }

  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for') ?? 'unknown'
  const rateLimitKey = `${ip}:${email.toLowerCase()}`

  if (!checkRateLimit(rateLimitKey)) {
    redirect('/login?error=Too many attempts. Please try again later.')
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect('/login?error=Authentication failed')
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
