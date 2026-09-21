import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get('limit') || 20), 100)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const supabase = createAdminClient()
    let query = supabase
      .from('parcels')
      .select('id, from_city, to_city, category, description, weight, price_offer, delivery_date, status, user_id, user_name, image_url, created_at')
      .in('status', ['open', 'matched'])
      .order('created_at', { ascending: false })
      .limit(limit)

    if (from) query = query.ilike('from_city', `%${from}%`)
    if (to) query = query.ilike('to_city', `%${to}%`)

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ parcels: data || [] })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch parcels' },
      { status: 500 }
    )
  }
}
