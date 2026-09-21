'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin, logAdminAction } from '@/utils/admin-guard'
import { isValidUuid } from '@/lib/validation'

function sanitizeCsvCell(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const dangerousChars = ['=', '+', '-', '@', '\t', '\r']
  if (dangerousChars.some((ch) => value.startsWith(ch))) {
    return `'${value}`
  }
  return value
}

function sanitizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    sanitized[key] = sanitizeCsvCell(value)
  }
  return sanitized
}

export async function bulkVerifyUsers(userIds: string[]) {
  if (userIds.length === 0) return { error: 'No users selected', count: 0 }
  if (userIds.length > 100) return { error: 'Maximum 100 users per batch', count: 0 }
  if (!userIds.every(isValidUuid)) return { error: 'Invalid user ID in batch', count: 0 }

  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error, count: 0 }

  const { data, error } = await auth.supabase.rpc('cms_bulk_approve_kyc', {
    p_actor_id: auth.userId,
    p_user_ids: userIds,
  })

  if (error) return { error: error.message, count: 0 }

  revalidatePath('/dashboard/bulk')
  revalidatePath('/dashboard/users')
  return { error: null, count: Number(data ?? 0) }
}

export async function bulkCancelExpiredTrips() {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error, count: 0 }

  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await auth.supabase
    .from('trips')
    .update({ status: 'cancelled' })
    .eq('status', 'active')
    .lt('date', today)
    .select('id')

  if (error) return { error: error.message, count: 0 }

  const count = data?.length ?? 0

  await logAdminAction(auth.supabase, auth.userId, 'bulk_cancel_expired_trips', {
    count,
    cutoff_date: today,
  })

  revalidatePath('/dashboard/bulk')
  revalidatePath('/dashboard/trips')
  return { error: null, count }
}

export async function bulkExportUsers() {
  const auth = await requireAdmin()
  if ('error' in auth) return { data: null, error: auth.error }

  const { data, error } = await auth.supabase
    .from('user_profiles')
    .select('id, full_name, email, phone, rating, total_deliveries, total_trips, kyc_status, verified, created_at')
    .order('created_at', { ascending: false })
    .limit(2000)

  if (error) return { data: null, error: error.message }

  await logAdminAction(auth.supabase, auth.userId, 'bulk_export_users', {
    count: data?.length ?? 0,
  })

  const sanitizedData = (data ?? []).map((row) => sanitizeRow(row as Record<string, unknown>))
  return { data: sanitizedData, error: null }
}

export async function bulkExportTrips(filters?: { status?: string; fromDate?: string; toDate?: string }) {
  const auth = await requireAdmin()
  if ('error' in auth) return { data: null, error: auth.error }

  let query = auth.supabase
    .from('trips')
    .select('id, user_name, from_city, to_city, date, time, vehicle_type, available_capacity, price_per_kg, status, created_at')
    .order('created_at', { ascending: false })
    .limit(2000)

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.fromDate) query = query.gte('date', filters.fromDate)
  if (filters?.toDate) query = query.lte('date', filters.toDate)

  const { data, error } = await query

  if (error) return { data: null, error: error.message }

  await logAdminAction(auth.supabase, auth.userId, 'bulk_export_trips', {
    count: data?.length ?? 0,
    filters,
  })

  const sanitizedData = (data ?? []).map((row) => sanitizeRow(row as Record<string, unknown>))
  return { data: sanitizedData, error: null }
}
