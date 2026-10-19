import { getSupabaseClient } from '@/template';
import { Trip } from '@/types';
import type { Database } from '@/types/database';
import { sanitizeLikeInput } from '@/lib/sanitize';
import { validateUUID } from '@/lib/validation';
import { enforceRateLimit } from '@/lib/server-rate-limit';
import { isAwsBackendEnabled } from '@/lib/backend/provider';
import { awsApiRequest, AwsApiError } from '@/lib/aws/api';
import { getUnmatchedListingCutoffIso } from '@/constants/listingFlow';
import { expireStaleUnmatchedListings } from '@/services/listing-expiry.service';

type TripRow = Database['public']['Tables']['trips']['Row'];

function mapRow(row: any): Trip {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userAvatar:
      row.user_avatar ||
      row.avatar_url ||
      row.selfie_url ||
      row.users?.avatar ||
      row.users?.avatar_url ||
      row.users?.selfie_url ||
      undefined,
    userRating: row.user_rating ?? 0,
    fromCity: row.from_city,
    toCity: row.to_city,
    date: row.date,
    time: row.time,
    vehicleType: row.vehicle_type as Trip['vehicleType'],
    availableCapacity: Number(row.available_capacity),
    pricePerKg: Number(row.price_per_kg),
    status: row.status as Trip['status'],
    createdAt: row.created_at,
    allowedCategories: Array.isArray(row.allowed_categories) ? row.allowed_categories : undefined,
  };
}

export async function fetchTrips(filters?: {
  fromCity?: string;
  toCity?: string;
  userCity?: string;
  limit?: number;
  offset?: number;
  includeCount?: boolean;
}) {
  if (isAwsBackendEnabled()) {
    try {
      const limit = filters?.limit ?? 50;
      const offset = filters?.offset ?? 0;
      const query = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });

      if (filters?.fromCity) query.set('fromCity', filters.fromCity);
      if (filters?.toCity) query.set('toCity', filters.toCity);
      if (filters?.userCity) query.set('userCity', filters.userCity);

      const response = await awsApiRequest<{ data: Trip[]; total: number }>(`/trips?${query.toString()}`);
      return { data: response.data, error: null, total: response.total };
    } catch (error) {
      const message = error instanceof AwsApiError ? error.message : 'Failed to fetch trips';
      return { data: null, error: message, total: 0 };
    }
  }

  const sb = getSupabaseClient();
  // Non-blocking background expiry check
  void expireStaleUnmatchedListings().catch(() => {});

  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;
  const shouldCount = filters?.includeCount === true || (filters?.includeCount !== false && offset === 0);

  const todayStr = new Date().toISOString().slice(0, 10);

  let query = sb
    .from('trips')
    .select('*', shouldCount ? { count: 'exact' } : undefined)
    .eq('status', 'active')
    .gt('available_capacity', 0)
    .gte('date', todayStr)
    .gte('created_at', getUnmatchedListingCutoffIso())
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (filters?.fromCity) query = query.ilike('from_city', `%${sanitizeLikeInput(filters.fromCity)}%`);
  if (filters?.toCity) query = query.ilike('to_city', `%${sanitizeLikeInput(filters.toCity)}%`);
  if (filters?.userCity && !filters.fromCity && !filters.toCity) {
    try {
      const { fetchCityMarketplaceTrips } = require('@/services/marketplace-relevance.service');
      const cityRes = await fetchCityMarketplaceTrips(filters.userCity, limit, offset);
      if (!cityRes.error && cityRes.data) {
        return { data: cityRes.data, error: null, total: cityRes.total };
      }
    } catch {
      // Fallback to table query if RPC is temporarily unavailable
    }
    const city = sanitizeLikeInput(filters.userCity);
    query = query.or(`from_city.ilike.%${city}%,to_city.ilike.%${city}%`);
  }
  const { data, error, count } = await query;
  if (error) return { data: null, error: error.message, total: 0 };
  const filtered = (data || []).map(mapRow).filter((t: Trip) => {
    if (t.status !== 'active') return false;
    if (Number(t.availableCapacity || 0) <= 0) return false;
    if (t.date && t.date < todayStr) return false;
    return true;
  });
  return { data: filtered, error: null, total: count ?? filtered.length };
}

export async function fetchTripById(tripId: string) {
  const idValidation = validateUUID(tripId);
  if (!idValidation.valid) {
    return { data: null, error: idValidation.error || 'Invalid trip ID' };
  }

  if (isAwsBackendEnabled()) {
    try {
      const response = await awsApiRequest<{ data: Trip }>(`/trips/${tripId}`);
      return { data: response.data, error: null };
    } catch (error) {
      const message = error instanceof AwsApiError ? error.message : 'Failed to fetch trip';
      return { data: null, error: message };
    }
  }

  const sb = getSupabaseClient();
  const { data, error } = await sb.from('trips').select('*').eq('id', tripId).single();
  if (error) return { data: null, error: error.message };
  return { data: mapRow(data), error: null };
}

export async function createTrip(trip: Omit<Trip, 'id' | 'createdAt'>) {
  if (!trip.userId) return { data: null, error: 'User ID is required.' };

  if (!trip.fromCity || !trip.toCity) return { data: null, error: 'Origin and destination cities are required.' };
  if (!trip.date) return { data: null, error: 'Travel date is required.' };
  if (trip.availableCapacity <= 0) return { data: null, error: 'Available capacity must be greater than zero.' };
  if (trip.pricePerKg < 0) return { data: null, error: 'Price per kg cannot be negative.' };

  if (isAwsBackendEnabled()) {
    try {
      const response = await awsApiRequest<{ data: Trip }>('/trips', {
        method: 'POST',
        body: trip,
      });
      return { data: response.data, error: null };
    } catch (error) {
      const message = error instanceof AwsApiError ? error.message : 'Failed to create trip';
      return { data: null, error: message };
    }
  }

  const rateCheck = await enforceRateLimit(trip.userId, 'create_trip');
  if (!rateCheck.allowed) {
    return { data: null, error: rateCheck.error ?? 'Rate limit exceeded. Please try again later.' };
  }

  const sb = getSupabaseClient();
  const avatarValue = trip.userAvatar || (trip as any).selfieUrl || (trip as any).avatar || (trip as any).avatar_url;
  const insertPayload: any = {
    user_id: trip.userId,
    user_name: trip.userName,
    user_avatar: avatarValue || null,
    user_rating: trip.userRating,
    from_city: trip.fromCity,
    to_city: trip.toCity,
    date: trip.date,
    time: trip.time,
    vehicle_type: trip.vehicleType,
    available_capacity: trip.availableCapacity,
    price_per_kg: trip.pricePerKg,
    status: trip.status,
  };
  if (trip.allowedCategories && Array.isArray(trip.allowedCategories)) {
    insertPayload.allowed_categories = trip.allowedCategories;
  }

  let { data, error } = await sb.from('trips').insert(insertPayload).select().single();
  if (error && (insertPayload.allowed_categories || insertPayload.user_avatar)) {
    // Retry without columns that might not exist in an older schema
    const fallbackPayload: any = { ...insertPayload };
    delete fallbackPayload.allowed_categories;
    delete fallbackPayload.user_avatar;
    const retry = await sb.from('trips').insert(fallbackPayload).select().single();
    if (!retry.error) {
      data = retry.data;
      error = null;
    }
  }

  if (error) return { data: null, error: error.message };
  const mapped = mapRow(data);
  if (avatarValue && !mapped.userAvatar) {
    mapped.userAvatar = avatarValue;
  }
  if (trip.allowedCategories) {
    mapped.allowedCategories = trip.allowedCategories;
  }
  return { data: mapped, error: null };
}

export async function updateTripStatus(tripId: string, status: Trip['status'], userId: string) {
  if (isAwsBackendEnabled()) {
    try {
      await awsApiRequest<{ error: null }>(`/trips/${tripId}/status`, {
        method: 'PATCH',
        body: { status, userId },
      });
      return { error: null };
    } catch (error) {
      const message = error instanceof AwsApiError ? error.message : 'Failed to update trip status';
      return { error: message };
    }
  }

  const sb = getSupabaseClient();

  const { data: { user } } = await sb.auth.getUser();
  if (!user || user.id !== userId) return { error: 'Unauthorized' };
  const { error } = await sb.rpc('set_trip_status', { p_trip_id: tripId, p_status: status });
  if (error) return { error: error.message };
  return { error: null };
}

export async function fetchUserTrips(userId: string): Promise<{ data: Trip[] | null; error: string | null }> {
  if (!userId) return { data: [], error: null };
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('trips')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) return { data: null, error: error.message };
  return { data: (data || []).map(mapRow), error: null };
}

