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
    .select('id, user_id, from_city, to_city, active, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return { data: null, error: error.message };
  return { data: (data || []).map(mapRow), error: null };
}

export async function isUserSubscribedToRoute(
  userId: string | undefined,
  fromCity: string,
  toCity: string
): Promise<boolean> {
  if (!userId || !fromCity || !toCity) return false;
  try {
    const sb = getSupabaseClient();
    const sanitizedFrom = sanitizeTextInput(fromCity, 100);
    const sanitizedTo = sanitizeTextInput(toCity, 100);
    if (!sanitizedFrom || !sanitizedTo) return false;

    const { data, error } = await sb
      .from('route_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .ilike('from_city', sanitizedFrom)
      .ilike('to_city', sanitizedTo)
      .eq('active', true)
      .limit(1);

    if (error || !data) return false;
    return data.length > 0;
  } catch {
    return false;
  }
}

export async function createSubscription(userId: string, fromCity: string, toCity: string) {
  const sanitizedFrom = sanitizeTextInput(fromCity, 100);
  const sanitizedTo = sanitizeTextInput(toCity, 100);
  if (!sanitizedFrom || !sanitizedTo) return { data: null, error: 'Origin and destination cities are required' };
  if (sanitizedFrom.trim().toLowerCase() === sanitizedTo.trim().toLowerCase()) {
    return { data: null, error: 'Origin and destination cities cannot be identical' };
  }

  try {
    const rateCheck = await enforceRateLimit(userId, 'search');
    if (!rateCheck.allowed) {
      return { data: null, error: rateCheck.error ?? 'Too many alert requests. Please wait a moment.' };
    }
  } catch {
    // Fail open on rate check RPC
  }

  const sb = getSupabaseClient();
  try {
    // 1. Look for existing subscription record for this user and route
    const { data: existing } = await sb
      .from('route_subscriptions')
      .select('id, user_id, from_city, to_city, active, created_at')
      .eq('user_id', userId)
      .ilike('from_city', sanitizedFrom)
      .ilike('to_city', sanitizedTo)
      .maybeSingle();

    if (existing) {
      if (!existing.active) {
        const { data: updated, error: updateErr } = await sb
          .from('route_subscriptions')
          .update({ active: true })
          .eq('id', existing.id)
          .select()
          .single();
        if (updateErr) {
          console.warn('[subscriptions] Failed to reactivate route subscription:', updateErr.message);
          return { data: { ...mapRow(existing), active: true }, error: null };
        }
        return { data: mapRow(updated), error: null };
      }
      return { data: mapRow(existing), error: null };
    }

    // 2. Insert new record
    const { data: inserted, error: insertErr } = await sb
      .from('route_subscriptions')
      .insert({
        user_id: userId,
        from_city: sanitizedFrom,
        to_city: sanitizedTo,
        active: true,
      })
      .select()
      .single();

    if (insertErr) {
      // If unique violation occurred concurrently, refetch and return
      if (
        insertErr.code === '23505' ||
        insertErr.message?.includes('duplicate key') ||
        insertErr.message?.includes('unique')
      ) {
        const { data: refetched } = await sb
          .from('route_subscriptions')
          .select('id, user_id, from_city, to_city, active, created_at')
          .eq('user_id', userId)
          .ilike('from_city', sanitizedFrom)
          .ilike('to_city', sanitizedTo)
          .maybeSingle();
        if (refetched) {
          return { data: mapRow(refetched), error: null };
        }
      }
      return { data: null, error: insertErr.message };
    }

    return { data: mapRow(inserted), error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to create route alert' };
  }
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
