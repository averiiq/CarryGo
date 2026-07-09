'use server'

import { createClient } from '@/utils/supabase/server'

export async function fetchRevenueData(period: 'week' | 'month' | 'quarter') {
  const supabase = await createClient()
  const daysMap = { week: 7, month: 30, quarter: 90 }
  const days = daysMap[period]

  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from('payments')
    .select('amount, created_at, status')
    .gte('created_at', since.toISOString())
    .eq('status', 'released')
    .order('created_at', { ascending: true })

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function fetchUserGrowth(weeks: number = 12) {
  const supabase = await createClient()
  const since = new Date()
  since.setDate(since.getDate() - weeks * 7)

  const { data, error } = await supabase
    .from('user_profiles')
    .select('created_at')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true })

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function exportAnalyticsCSV(type: 'users' | 'trips' | 'parcels' | 'payments') {
  const supabase = await createClient()

  let data: Record<string, unknown>[] | null = null
  let error: string | null = null

  switch (type) {
    case 'users': {
      const res = await supabase.from('user_profiles').select('id, full_name, email, rating, total_deliveries, total_trips, kyc_status, created_at').order('created_at', { ascending: false }).limit(1000)
      data = res.data
      error = res.error?.message ?? null
      break
    }
    case 'trips': {
      const res = await supabase.from('trips').select('id, user_name, from_city, to_city, date, vehicle_type, available_capacity, price_per_kg, status, created_at').order('created_at', { ascending: false }).limit(1000)
      data = res.data
      error = res.error?.message ?? null
      break
    }
    case 'parcels': {
      const res = await supabase.from('parcels').select('id, user_name, from_city, to_city, category, weight, price_offer, status, created_at').order('created_at', { ascending: false }).limit(1000)
      data = res.data
      error = res.error?.message ?? null
      break
    }
    case 'payments': {
      const res = await supabase.from('payments').select('id, request_id, sender_id, traveller_id, amount, status, created_at').order('created_at', { ascending: false }).limit(1000)
      data = res.data
      error = res.error?.message ?? null
      break
    }
  }

  if (error) return { data: null, error }
  return { data: data ?? [], error: null }
}
