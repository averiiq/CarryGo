import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get('limit') || 20), 100)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const supabase = await createClient()
    let query = supabase
      .from('parcels')
      .select(
        'id, from_city, to_city, category, description, weight, price_offer, delivery_date, status, user_name, image_url, created_at'
      )
      .in('status', ['open', 'matched'])
      .order('created_at', { ascending: false })
      .limit(limit)

    if (from) query = query.ilike('from_city', `%${from}%`)
    if (to) query = query.ilike('to_city', `%${to}%`)

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(
      { parcels: data || [] },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } }
    )
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch parcels' },
      { status: 500 }
    )
  }
}
