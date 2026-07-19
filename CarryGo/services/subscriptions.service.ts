import { getSupabaseClient } from '@/template';
import { RouteSubscription } from '@/types';
import { sanitizeTextInput } from '@/lib/sanitize';
import { enforceRateLimit } from '@/lib/server-rate-limit';

interface SubscriptionRow {
  id: string;
  user_id: string;
  from_city: string;
  to_city: string;
  active: boolean;
  created_at: string;
}

function mapRow(row: SubscriptionRow): RouteSubscription {
  return {
    id: row.id,
    userId: row.user_id,
    fromCity: row.from_city,
    toCity: row.to_city,
    active: row.active,
    createdAt: row.created_at,
  };
}

export async function fetchSubscriptions(userId: string) {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('route_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return { data: null, error: error.message };
  return { data: (data || []).map(mapRow), error: null };
}

export async function createSubscription(userId: string, fromCity: string, toCity: string) {
  const rateCheck = await enforceRateLimit(userId, 'create_request');
  if (!rateCheck.allowed) {
    return { data: null, error: rateCheck.error ?? 'Rate limit exceeded. Please try again later.' };
  }

  const sanitizedFrom = sanitizeTextInput(fromCity, 100);
  const sanitizedTo = sanitizeTextInput(toCity, 100);
  if (!sanitizedFrom || !sanitizedTo) return { data: null, error: 'City names are required' };

  const sb = getSupabaseClient();
  const { data, error } = await sb.from('route_subscriptions').upsert({
    user_id: userId,
    from_city: sanitizedFrom,
    to_city: sanitizedTo,
    active: true,
  }, { onConflict: 'user_id,from_city,to_city' }).select().single();
  if (error) return { data: null, error: error.message };
  return { data: mapRow(data), error: null };
}

export async function deleteSubscription(subId: string, userId: string) {
  const sb = getSupabaseClient();

  // Verify ownership before deleting
  const { data: sub, error: fetchError } = await sb.from('route_subscriptions').select('user_id').eq('id', subId).single();
  if (fetchError) return { error: fetchError.message };
  if (sub.user_id !== userId) return { error: 'Unauthorized' };

  const { error } = await sb.from('route_subscriptions').delete().eq('id', subId);
  if (error) return { error: error.message };
  return { error: null };
}

export async function toggleSubscription(subId: string, active: boolean, userId: string) {
  const sb = getSupabaseClient();

  // Verify ownership before toggling
  const { data: sub, error: fetchError } = await sb.from('route_subscriptions').select('user_id').eq('id', subId).single();
  if (fetchError) return { error: fetchError.message };
  if (sub.user_id !== userId) return { error: 'Unauthorized' };

  const { error } = await sb.from('route_subscriptions').update({ active }).eq('id', subId);
  if (error) return { error: error.message };
  return { error: null };
}

export async function checkRouteMatchSubscribers(fromCity: string, toCity: string) {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('route_subscriptions')
    .select('user_id')
    .eq('from_city', fromCity)
    .eq('to_city', toCity)
    .eq('active', true);
  if (error) return { data: [], error: error.message };
  return { data: (data || []).map(r => r.user_id), error: null };
}

export async function notifyRouteSubscribers(input: {
  listingType: 'trip' | 'parcel';
  listingId: string;
  fromCity: string;
  toCity: string;
  title: string;
  body: string;
}) {
  const sb = getSupabaseClient();
  const { data, error } = await sb.rpc('notify_route_subscribers', {
    p_listing_type: input.listingType,
    p_listing_id: input.listingId,
    p_from_city: input.fromCity,
    p_to_city: input.toCity,
    p_title: input.title,
    p_body: input.body,
  });
  return { data: Number(data || 0), error: error?.message || null };
}
