import { getSupabaseClient } from '@/template';
import { Trip } from '@/types';
import type { Database } from '@/types/database';
import { sanitizeLikeInput } from '@/lib/sanitize';
import { enforceRateLimit } from '@/lib/server-rate-limit';
import { isAwsBackendEnabled } from '@/lib/backend/provider';
import { awsApiRequest, AwsApiError } from '@/lib/aws/api';

type TripRow = Database['public']['Tables']['trips']['Row'];

function mapRow(row: TripRow): Trip {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userRating: row.user_rating ?? 4.5,
    fromCity: row.from_city,
    toCity: row.to_city,
    date: row.date,
    time: row.time,
    vehicleType: row.vehicle_type as Trip['vehicleType'],
    availableCapacity: Number(row.available_capacity),
    pricePerKg: Number(row.price_per_kg),
    status: row.status as Trip['status'],
    createdAt: row.created_at,
  };
}

export async function fetchTrips(filters?: { fromCity?: string; toCity?: string; userCity?: string; limit?: number; offset?: number }) {
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
  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;
  let query = sb.from('trips').select('*', { count: 'exact' }).eq('status', 'active').order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  if (filters?.fromCity) query = query.ilike('from_city', `%${sanitizeLikeInput(filters.fromCity)}%`);
  if (filters?.toCity) query = query.ilike('to_city', `%${sanitizeLikeInput(filters.toCity)}%`);
  if (filters?.userCity && !filters.fromCity && !filters.toCity) {
    const city = sanitizeLikeInput(filters.userCity);
    query = query.or(`from_city.ilike.%${city}%,to_city.ilike.%${city}%`);
  }
  const { data, error, count } = await query;
  if (error) return { data: null, error: error.message, total: 0 };
  return { data: (data || []).map(mapRow), error: null, total: count ?? 0 };
}

export async function fetchTripById(tripId: string) {
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
  const { data, error } = await sb.from('trips').insert({
    user_id: trip.userId,
    user_name: trip.userName,
    user_rating: trip.userRating,
    from_city: trip.fromCity,
    to_city: trip.toCity,
    date: trip.date,
    time: trip.time,
    vehicle_type: trip.vehicleType,
    available_capacity: trip.availableCapacity,
    price_per_kg: trip.pricePerKg,
    status: trip.status,
  }).select().single();
  if (error) return { data: null, error: error.message };
  return { data: mapRow(data), error: null };
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

  // Verify ownership before updating
  const { data: trip, error: fetchError } = await sb.from('trips').select('user_id').eq('id', tripId).single();
  if (fetchError) return { error: fetchError.message };
  if (trip.user_id !== userId) return { error: 'Unauthorized' };

  const { error } = await sb.from('trips').update({ status }).eq('id', tripId);
  if (error) return { error: error.message };
  return { error: null };
}
