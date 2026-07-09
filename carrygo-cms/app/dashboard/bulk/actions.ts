'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function bulkVerifyUsers(userIds: string[]) {
  if (userIds.length === 0) return { error: 'No users selected', count: 0 }
  if (userIds.length > 100) return { error: 'Maximum 100 users per batch', count: 0 }

  const supabase = await createClient()

  const { error } = await supabase
    .from('user_profiles')
    .update({ kyc_status: 'approved', verified: true })
    .in('id', userIds)

  if (error) return { error: error.message, count: 0 }

  revalidatePath('/dashboard/bulk')
  revalidatePath('/dashboard/users')
  return { error: null, count: userIds.length }
}

export async function bulkCancelExpiredTrips() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('trips')
    .update({ status: 'cancelled' })
    .eq('status', 'active')
    .lt('date', today)
    .select('id')

  if (error) return { error: error.message, count: 0 }

  revalidatePath('/dashboard/bulk')
  revalidatePath('/dashboard/trips')
  return { error: null, count: data?.length ?? 0 }
}

export async function bulkExportUsers() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, full_name, email, phone, rating, total_deliveries, total_trips, kyc_status, verified, created_at')
    .order('created_at', { ascending: false })
    .limit(5000)

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function bulkExportTrips(filters?: { status?: string; fromDate?: string; toDate?: string }) {
  const supabase = await createClient()

  let query = supabase
    .from('trips')
    .select('id, user_name, from_city, to_city, date, time, vehicle_type, available_capacity, price_per_kg, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5000)

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.fromDate) query = query.gte('date', filters.fromDate)
  if (filters?.toDate) query = query.lte('date', filters.toDate)

  const { data, error } = await query

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}
