import { getSupabaseClient } from '@/template';
import { Trip, ParcelCategory } from '@/types';
import type { Database } from '@/types/database';
import { sanitizeLikeInput } from '@/lib/sanitize';
import { validateUUID } from '@/lib/validation';
import { enforceRateLimit } from '@/lib/server-rate-limit';
import { isAwsBackendEnabled } from '@/lib/backend/provider';
import { awsApiRequest, AwsApiError } from '@/lib/aws/api';
import { getUnmatchedListingCutoffIso } from '@/constants/listingFlow';
import { expireStaleUnmatchedListings } from '@/services/listing-expiry.service';
import { enrichMissingUserAvatars } from './avatar-enrichment.service';

type TripRow = Database['public']['Tables']['trips']['Row'];

export const MAX_PAGE_SIZE = 100;

export function parseAllowedCategories(raw: any): ParcelCategory[] | undefined {
  if (!raw) return undefined;
  if (Array.isArray(raw)) {
    const cleaned = raw
      .map((s) => String(s || '').trim().replace(/^[{"']+|[}"']+$/g, '').toLowerCase())
      .filter(Boolean);
    return cleaned.length > 0 ? (cleaned as ParcelCategory[]) : undefined;
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed
          .map((s) => String(s || '').trim().replace(/^[{"']+|[}"']+$/g, '').toLowerCase())
          .filter(Boolean);
        return cleaned.length > 0 ? (cleaned as ParcelCategory[]) : undefined;
      }
    } catch {
      const items = raw
        .replace(/^\{|\}$/g, '')
        .split(',')
        .map((s: string) => s.trim().replace(/^["']|["']$/g, '').toLowerCase())
        .filter(Boolean);
      if (items.length > 0) return items as ParcelCategory[];
    }
  }
  return undefined;
}

export function parseStopovers(raw: any): string[] | undefined {
  if (!raw) return undefined;
  if (Array.isArray(raw)) {
    const cleaned = raw.map((s) => String(s || '').trim().replace(/^[{"']+|[}"']+$/g, '')).filter(Boolean);
    return cleaned.length > 0 ? cleaned : undefined;
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.map((s: unknown) => String(s || '').trim().replace(/^[{"']+|[}"']+$/g, '')).filter(Boolean);
        return cleaned.length > 0 ? cleaned : undefined;
      }
    } catch {
      const items = raw.replace(/^\{|\}$/g, '').split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
      if (items.length > 0) return items;
    }
  }
  return undefined;
}

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
    stopovers: parseStopovers(row.stopovers),
    date: row.date,
    time: row.time,
    vehicleType: row.vehicle_type as Trip['vehicleType'],
    availableCapacity: Number(row.available_capacity),
    pricePerKg: Number(row.price_per_kg),
    status: row.status as Trip['status'],
    createdAt: row.created_at,
    allowedCategories: parseAllowedCategories(row.allowed_categories),
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
    .select('id, user_id, user_name, user_avatar, user_rating, from_city, to_city, stopovers, date, time, vehicle_type, available_capacity, price_per_kg, status, created_at, allowed_categories', shouldCount ? { count: 'exact' } : undefined)
    .eq('status', 'active')
    .gt('available_capacity', 0)
    .gte('date', todayStr)
    .gte('created_at', getUnmatchedListingCutoffIso())
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (filters?.fromCity) {
    const safeOr = sanitizeLikeInput(filters.fromCity).replace(/,/g, '');
    const safeStopovers = filters.fromCity.trim().replace(/[{},\\.]/g, '');
    query = query.or(`from_city.ilike.%${safeOr}%,stopovers.cs.{${safeStopovers}}`);
  }
  if (filters?.toCity) {
    const safeOr = sanitizeLikeInput(filters.toCity).replace(/,/g, '');
    const safeStopovers = filters.toCity.trim().replace(/[{},\\.]/g, '');
    query = query.or(`to_city.ilike.%${safeOr}%,stopovers.cs.{${safeStopovers}}`);
  }
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
  const enriched = await enrichMissingUserAvatars(filtered);
  return { data: enriched, error: null, total: count ?? enriched.length };
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
  let { data, error } = await sb.from('trips').select('id, user_id, user_name, user_avatar, user_rating, from_city, to_city, stopovers, date, time, vehicle_type, available_capacity, price_per_kg, status, created_at, allowed_categories').eq('id', tripId).single();
  if (error && error.message?.includes('allowed_categories')) {
    const retry = await sb.from('trips').select('id, user_id, user_name, user_avatar, user_rating, from_city, to_city, stopovers, date, time, vehicle_type, available_capacity, price_per_kg, status, created_at').eq('id', tripId).single();
    if (!retry.error && retry.data) {
      data = { ...retry.data, allowed_categories: null } as any;
      error = null;
    }
  }
  if (error) return { data: null, error: error.message };
  const mapped = mapRow(data);
  const [enriched] = await enrichMissingUserAvatars([mapped]);
  return { data: enriched || mapped, error: null };
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
  if (trip.stopovers && Array.isArray(trip.stopovers) && trip.stopovers.length > 0) {
    insertPayload.stopovers = trip.stopovers;
  }

  let { data, error } = await sb.from('trips').insert(insertPayload).select().single();

  // If remote database schema has not added allowed_categories column yet, retry cleanly without it
  if (error && error.message?.includes('allowed_categories')) {
    const fallbackPayload = { ...insertPayload };
    delete fallbackPayload.allowed_categories;
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
  if (trip.stopovers && trip.stopovers.length > 0 && !mapped.stopovers) {
    mapped.stopovers = trip.stopovers;
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

export async function fetchUserTrips(
  userId: string,
  options?: { limit?: number; offset?: number },
): Promise<{ data: Trip[] | null; error: string | null; total: number }> {
  if (!userId) return { data: [], error: null, total: 0 };
  const sb = getSupabaseClient();
  const limit = Math.min(options?.limit ?? 50, MAX_PAGE_SIZE);
  const offset = options?.offset ?? 0;
  const { data, error, count } = await sb
    .from('trips')
    .select('id, user_id, user_name, user_avatar, user_rating, from_city, to_city, stopovers, date, time, vehicle_type, available_capacity, price_per_kg, status, created_at, allowed_categories', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) return { data: null, error: error.message, total: 0 };
  const mapped = (data || []).map(mapRow);
  return { data: mapped, error: null, total: count ?? mapped.length };
}

