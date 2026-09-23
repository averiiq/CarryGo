import { Trip, Parcel } from '@/types';
import { areCitiesEquivalent, normalizeCityName } from './route-compatibility.service';

/**
 * Service to evaluate and fetch live marketplace listings relevant to a user's registered home city.
 */
export class MarketplaceRelevanceService {
  /**
   * Evaluates if a trip or parcel is relevant to a user's home city.
   * Relevant if the journey originates in, terminates in, or passes through the city.
   */
  static isRelevantToCity(
    listing: { fromCity: string; toCity: string },
    userCity?: string | null
  ): boolean {
    if (!userCity || !userCity.trim()) {
      return true; // No filter configured, show general active listings
    }

    const city = userCity.trim();
    const fromMatches = areCitiesEquivalent(listing.fromCity, city);
    const toMatches = areCitiesEquivalent(listing.toCity, city);

    return fromMatches || toMatches;
  }
}

/**
 * Calls server-side PostgreSQL RPC `fetch_city_marketplace_trips`
 * Fetches only city-relevant active trips with database-level filtering and pagination.
 */
export async function fetchCityMarketplaceTrips(
  userCity?: string | null,
  limit: number = 20,
  offset: number = 0
): Promise<{ data: Trip[] | null; total: number; error: string | null }> {
  try {
    const { getSupabaseClient } = require('@/template');
    const sb = getSupabaseClient();
    const { data, error } = await sb.rpc('fetch_city_marketplace_trips', {
      p_city: userCity || null,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      console.warn('fetch_city_marketplace_trips RPC error:', error.message);
      return { data: null, total: 0, error: error.message };
    }

    const items = data || [];
    const total = items.length > 0 ? Number(items[0].total_count || items.length) : 0;

    const trips: Trip[] = items.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userRating: parseFloat(String(row.user_rating || 4.5)),
      fromCity: row.from_city,
      toCity: row.to_city,
      date: row.date,
      time: row.time,
      vehicleType: row.vehicle_type,
      availableCapacity: parseFloat(String(row.available_capacity)),
      pricePerKg: parseFloat(String(row.price_per_kg)),
      status: row.status,
      createdAt: row.created_at,
    }));

    return { data: trips, total, error: null };
  } catch (err: any) {
    console.warn('fetchCityMarketplaceTrips error:', err);
    return { data: null, total: 0, error: err?.message || 'Failed to fetch city marketplace trips' };
  }
}

/**
 * Calls server-side PostgreSQL RPC `fetch_city_marketplace_parcels`
 * Fetches only city-relevant open parcels with database-level filtering and pagination.
 */
export async function fetchCityMarketplaceParcels(
  userCity?: string | null,
  limit: number = 20,
  offset: number = 0
): Promise<{ data: Parcel[] | null; total: number; error: string | null }> {
  try {
    const { getSupabaseClient } = require('@/template');
    const sb = getSupabaseClient();
    const { data, error } = await sb.rpc('fetch_city_marketplace_parcels', {
      p_city: userCity || null,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      console.warn('fetch_city_marketplace_parcels RPC error:', error.message);
      return { data: null, total: 0, error: error.message };
    }

    const items = data || [];
    const total = items.length > 0 ? Number(items[0].total_count || items.length) : 0;

    const parcels: Parcel[] = items.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      fromCity: row.from_city,
      toCity: row.to_city,
      category: row.category,
      description: row.description,
      weight: parseFloat(String(row.weight)),
      priceOffer: parseFloat(String(row.price_offer)),
      imageUrl: row.image_url,
      status: row.status,
      deliveryDate: row.delivery_date,
      createdAt: row.created_at,
    }));

    return { data: parcels, total, error: null };
  } catch (err: any) {
    console.warn('fetchCityMarketplaceParcels error:', err);
    return { data: null, total: 0, error: err?.message || 'Failed to fetch city marketplace parcels' };
  }
}
