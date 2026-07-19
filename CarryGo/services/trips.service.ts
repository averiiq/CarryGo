import { getSupabaseClient } from '@/template';
import { Trip } from '@/types';
import type { Database } from '@/types/database';
import { sanitizeLikeInput } from '@/lib/sanitize';
import { enforceRateLimit } from '@/lib/server-rate-limit';

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

export async function fetchTrips(filters?: { fromCity?: string; toCity?: string; limit?: number; offset?: number }) {
  const sb = getSupabaseClient();
  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;
  let query = sb.from('trips').select('*', { count: 'exact' }).eq('status', 'active').order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  if (filters?.fromCity) query = query.ilike('from_city', `%${sanitizeLikeInput(filters.fromCity)}%`);
  if (filters?.toCity) query = query.ilike('to_city', `%${sanitizeLikeInput(filters.toCity)}%`);
  const { data, error, count } = await query;
  if (error) return { data: null, error: error.message, total: 0 };
  return { data: (data || []).map(mapRow), error: null, total: count ?? 0 };
}

export async function fetchTripById(tripId: string) {
  const sb = getSupabaseClient();
  const { data, error } = await sb.from('trips').select('*').eq('id', tripId).single();
  if (error) return { data: null, error: error.message };
  return { data: mapRow(data), error: null };
}

export async function createTrip(trip: Omit<Trip, 'id' | 'createdAt'>) {
  if (!trip.userId) return { data: null, error: 'User ID is required.' };

  const rateCheck = await enforceRateLimit(trip.userId, 'create_trip');
  if (!rateCheck.allowed) {
    return { data: null, error: rateCheck.error ?? 'Rate limit exceeded. Please try again later.' };
  }

  if (!trip.fromCity || !trip.toCity) return { data: null, error: 'Origin and destination cities are required.' };
  if (!trip.date) return { data: null, error: 'Travel date is required.' };
  if (trip.availableCapacity <= 0) return { data: null, error: 'Available capacity must be greater than zero.' };
  if (trip.pricePerKg < 0) return { data: null, error: 'Price per kg cannot be negative.' };

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
  const sb = getSupabaseClient();

  // Verify ownership before updating
  const { data: trip, error: fetchError } = await sb.from('trips').select('user_id').eq('id', tripId).single();
  if (fetchError) return { error: fetchError.message };
  if (trip.user_id !== userId) return { error: 'Unauthorized' };

  const { error } = await sb.from('trips').update({ status }).eq('id', tripId);
  if (error) return { error: error.message };
  return { error: null };
}
