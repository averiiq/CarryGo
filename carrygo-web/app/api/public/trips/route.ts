import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get('limit') || 20), 100)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const today = new Date().toISOString().split('T')[0]
    const supabase = createAdminClient()
    let query = supabase
      .from('trips')
      .select('id, from_city, to_city, date, time, vehicle_type, available_capacity, price_per_kg, status, user_id, user_name, user_rating, created_at')
      .eq('status', 'active')
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(limit)

    if (from) query = query.ilike('from_city', `%${from}%`)
    if (to) query = query.ilike('to_city', `%${to}%`)

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ trips: data || [] })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch trips' },
      { status: 500 }
    )
  }
}
