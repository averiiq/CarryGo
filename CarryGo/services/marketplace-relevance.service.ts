import { Trip, Parcel } from '@/types';
import { areCitiesEquivalent, normalizeCityName } from './route-compatibility.service';

/**
 * Service to evaluate and fetch live marketplace listings relevant to a user's registered home city.
 */
export class MarketplaceRelevanceService {
  /**
   * Evaluates if a trip or parcel is relevant to a user's selected/current city.
   * Relevant if the journey originates in, terminates in, or passes through the city.
   * If userCity is not specified, returns false to enforce location-based marketplace display.
   */
  static isRelevantToCity(
    listing: { fromCity: string; toCity: string },
    userCity?: string | null
  ): boolean {
    if (!userCity || !userCity.trim()) {
      return false; // Live marketplace is strictly location-based
    }

    const city = userCity.trim().toLowerCase();
    const from = listing.fromCity.trim().toLowerCase();
    const to = listing.toCity.trim().toLowerCase();

    const fromMatches =
      areCitiesEquivalent(listing.fromCity, userCity) ||
      from === city ||
      from.includes(city) ||
      city.includes(from);

    const toMatches =
      areCitiesEquivalent(listing.toCity, userCity) ||
      to === city ||
      to.includes(city) ||
      city.includes(to);

    return fromMatches || toMatches;
  }

  /**
   * Evaluates if a trip is eligible for display in the live marketplace.
   * Hard requirements:
   * 1. Status must be 'active' (completed/cancelled trips NEVER shown).
   * 2. Available capacity must be > 0 (fully booked trips NEVER shown).
   * 3. Trip date must not be in the past.
   * 4. Must match active corridor filter or anchor location city.
   */
  static isTripEligibleForLiveMarketplace(
    trip: Trip,
    userCity?: string | null,
    corridorFilter?: { fromCity?: string; toCity?: string }
  ): boolean {
    if (trip.status !== 'active') return false;
    if (Number(trip.availableCapacity || 0) <= 0) return false;

    const todayStr = new Date().toISOString().slice(0, 10);
    if (trip.date && trip.date < todayStr) return false;

    if (corridorFilter?.fromCity && !trip.fromCity.toLowerCase().includes(corridorFilter.fromCity.toLowerCase().trim())) {
      return false;
    }
    if (corridorFilter?.toCity && !trip.toCity.toLowerCase().includes(corridorFilter.toCity.toLowerCase().trim())) {
      return false;
    }

    if (!corridorFilter?.fromCity && !corridorFilter?.toCity && userCity) {
      return MarketplaceRelevanceService.isRelevantToCity(trip, userCity);
    }

    return true;
  }

  /**
   * Evaluates if a parcel is eligible for display in the live marketplace.
   * Hard requirements:
   * 1. Status must be 'open' (delivered/completed/matched parcels NEVER shown).
   * 2. Delivery date must not be in the past.
   * 3. Must match active corridor filter or anchor location city.
   */
  static isParcelEligibleForLiveMarketplace(
    parcel: Parcel,
    userCity?: string | null,
    corridorFilter?: { fromCity?: string; toCity?: string }
  ): boolean {
    if (parcel.status !== 'open') return false;

    const todayStr = new Date().toISOString().slice(0, 10);
    if (parcel.deliveryDate && parcel.deliveryDate < todayStr) return false;

    if (corridorFilter?.fromCity && !parcel.fromCity.toLowerCase().includes(corridorFilter.fromCity.toLowerCase().trim())) {
      return false;
    }
    if (corridorFilter?.toCity && !parcel.toCity.toLowerCase().includes(corridorFilter.toCity.toLowerCase().trim())) {
      return false;
    }

    if (!corridorFilter?.fromCity && !corridorFilter?.toCity && userCity) {
      return MarketplaceRelevanceService.isRelevantToCity(parcel, userCity);
    }

    return true;
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
    const todayStr = new Date().toISOString().slice(0, 10);
    const { data, error } = await sb.rpc('fetch_city_marketplace_trips', {
      p_city: userCity || null,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      console.warn('fetch_city_marketplace_trips RPC error, falling back to direct table query:', error.message);
      let fallbackQuery = sb
        .from('trips')
        .select('*', { count: 'exact' })
        .eq('status', 'active')
        .gt('available_capacity', 0)
        .gte('date', todayStr)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (userCity?.trim()) {
        const { sanitizeLikeInput } = require('@/lib/sanitize');
        const city = sanitizeLikeInput(userCity.trim());
        fallbackQuery = fallbackQuery.or(`from_city.ilike.%${city}%,to_city.ilike.%${city}%`);
      }

      const fallbackRes = await fallbackQuery;
      if (fallbackRes.error) {
        return { data: null, total: 0, error: fallbackRes.error.message };
      }

      const fallbackTrips: Trip[] = (fallbackRes.data || [])
        .map((row: any) => ({
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
        }))
        .filter((t: Trip) => MarketplaceRelevanceService.isTripEligibleForLiveMarketplace(t, userCity));

      return { data: fallbackTrips, total: fallbackRes.count ?? fallbackTrips.length, error: null };
    }

    const items = data || [];
    const total = items.length > 0 ? Number(items[0].total_count || items.length) : 0;

    const trips: Trip[] = items
      .map((row: any) => ({
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
      }))
      .filter((t: Trip) => MarketplaceRelevanceService.isTripEligibleForLiveMarketplace(t, userCity));

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
      console.warn('fetch_city_marketplace_parcels RPC error, falling back to direct table query:', error.message);
      let fallbackQuery = sb
        .from('parcels')
        .select('*', { count: 'exact' })
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (userCity?.trim()) {
        const { sanitizeLikeInput } = require('@/lib/sanitize');
        const city = sanitizeLikeInput(userCity.trim());
        fallbackQuery = fallbackQuery.or(`from_city.ilike.%${city}%,to_city.ilike.%${city}%`);
      }

      const fallbackRes = await fallbackQuery;
      if (fallbackRes.error) {
        return { data: null, total: 0, error: fallbackRes.error.message };
      }

      const fallbackParcels: Parcel[] = (fallbackRes.data || [])
        .map((row: any) => ({
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
        }))
        .filter((p: Parcel) => MarketplaceRelevanceService.isParcelEligibleForLiveMarketplace(p, userCity));

      return { data: fallbackParcels, total: fallbackRes.count ?? fallbackParcels.length, error: null };
    }

    const items = data || [];
    const total = items.length > 0 ? Number(items[0].total_count || items.length) : 0;

    const parcels: Parcel[] = items
      .map((row: any) => ({
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
      }))
      .filter((p: Parcel) => MarketplaceRelevanceService.isParcelEligibleForLiveMarketplace(p, userCity));

    return { data: parcels, total, error: null };
  } catch (err: any) {
    console.warn('fetchCityMarketplaceParcels error:', err);
    return { data: null, total: 0, error: err?.message || 'Failed to fetch city marketplace parcels' };
  }
}
