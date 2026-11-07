/**
 * Route-match subscriptions (web). Ports the fetch/create/toggle/delete
 * surface from mobile. Users save city-pair alerts; `notify_route_subscribers`
 * is invoked server-side when new trips/parcels appear on the corridor.
 */

import { createClient } from '@/utils/supabase/client'

export type ServiceResult<T> = { data: T; error: null } | { data: null; error: string }

export interface RouteSubscription {
  id: string
  userId: string
  fromCity: string
  toCity: string
  active: boolean
  createdAt: string
}

interface Row {
  id: string
  user_id: string
  from_city: string
  to_city: string
  active: boolean
  created_at: string
}

function mapRow(r: Row): RouteSubscription {
  return {
    id: r.id,
    userId: r.user_id,
    fromCity: r.from_city,
    toCity: r.to_city,
    active: r.active,
    createdAt: r.created_at,
  }
}

function sanitizeCity(value: string): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, 100)
}

export async function fetchSubscriptions(
  userId: string,
): Promise<ServiceResult<RouteSubscription[]>> {
  const sb = createClient()
  const { data, error } = await sb
    .from('route_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return { data: null, error: error.message }
  return { data: (data ?? []).map((r) => mapRow(r as Row)), error: null }
}

export async function createSubscription(
  fromCity: string,
  toCity: string,
): Promise<ServiceResult<RouteSubscription>> {
  const from = sanitizeCity(fromCity)
  const to = sanitizeCity(toCity)
  if (!from || !to) return { data: null, error: 'Both cities are required.' }
  if (from.toLowerCase() === to.toLowerCase())
    return { data: null, error: 'From and To cities must differ.' }

  const sb = createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return { data: null, error: 'Please sign in to save a route alert.' }

  const { data, error } = await sb
    .from('route_subscriptions')
    .upsert(
      {
        user_id: user.id,
        from_city: from,
        to_city: to,
        active: true,
      },
      { onConflict: 'user_id,from_city,to_city' },
    )
    .select('*')
    .single()

  if (error) return { data: null, error: error.message }
  return { data: mapRow(data as Row), error: null }
}

export async function toggleSubscription(
  id: string,
  active: boolean,
): Promise<{ error: string | null }> {
  const sb = createClient()
  const { error } = await sb.from('route_subscriptions').update({ active }).eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}

export async function deleteSubscription(id: string): Promise<{ error: string | null }> {
  const sb = createClient()
  const { error } = await sb.from('route_subscriptions').delete().eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}
