'use server'

import { requireAdmin } from '@/utils/admin-guard'

export async function fetchRevenueData(period: 'week' | 'month' | 'quarter') {
  const auth = await requireAdmin()
  if ('error' in auth) return { data: null, error: auth.error }

  const daysMap = { week: 7, month: 30, quarter: 90 }
  const days = daysMap[period]

  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await auth.supabase
    .from('payments')
    .select('amount, created_at, status')
    .gte('created_at', since.toISOString())
    .eq('status', 'released')
    .order('created_at', { ascending: true })

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function fetchUserGrowth(weeks: number = 12) {
  const auth = await requireAdmin()
  if ('error' in auth) return { data: null, error: auth.error }

  const clampedWeeks = Math.min(Math.max(weeks, 1), 52)
  const since = new Date()
  since.setDate(since.getDate() - clampedWeeks * 7)

  const { data, error } = await auth.supabase
    .from('user_profiles')
    .select('created_at')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true })

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function exportAnalyticsCSV(type: 'users' | 'trips' | 'parcels' | 'payments') {
  const auth = await requireAdmin()
  if ('error' in auth) return { data: null, error: auth.error }

  let data: Record<string, unknown>[] | null = null
  let error: string | null = null

  switch (type) {
    case 'users': {
      const res = await auth.supabase.from('user_profiles').select('id, full_name, email, rating, total_deliveries, total_trips, kyc_status, created_at').order('created_at', { ascending: false }).limit(1000)
      data = res.data
      error = res.error?.message ?? null
      break
    }
    case 'trips': {
      const res = await auth.supabase.from('trips').select('id, user_name, from_city, to_city, date, vehicle_type, available_capacity, price_per_kg, status, created_at').order('created_at', { ascending: false }).limit(1000)
      data = res.data
      error = res.error?.message ?? null
      break
    }
    case 'parcels': {
      const res = await auth.supabase.from('parcels').select('id, user_name, from_city, to_city, category, weight, price_offer, status, created_at').order('created_at', { ascending: false }).limit(1000)
      data = res.data
      error = res.error?.message ?? null
      break
    }
    case 'payments': {
      const res = await auth.supabase.from('payments').select('id, request_id, sender_id, traveller_id, amount, status, created_at').order('created_at', { ascending: false }).limit(1000)
      data = res.data
      error = res.error?.message ?? null
      break
    }
  }

  if (error) return { data: null, error }
  return { data: data ?? [], error: null }
}
