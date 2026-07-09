import { Trip, Parcel } from '@/types';
import { fetchTrips } from '@/services/trips.service';
import { fetchParcels } from '@/services/parcels.service';
import { useState, useCallback } from 'react';

/**
 * useMatching — fetches fresh data from DB (bypassing DataContext filters)
 * and performs route-based matching excluding the given user.
 */
export function useMatching() {
  const [loading, setLoading] = useState(false);

  /**
   * Find trips matching a parcel's route (for senders looking for travellers).
   * Excludes trips owned by the parcel owner.
   */
  const findMatchingTrips = useCallback(async (parcel: Parcel): Promise<Trip[]> => {
    setLoading(true);
    const { data } = await fetchTrips({ fromCity: parcel.fromCity, toCity: parcel.toCity });
    setLoading(false);
    if (!data) return [];
    return data.filter(
      t =>
        t.status === 'active' &&
        t.userId !== parcel.userId &&
        t.availableCapacity >= parcel.weight
    );
  }, []);

  /**
   * Find parcels matching a trip's route (for travellers looking for parcels to carry).
   * Excludes parcels owned by the trip owner.
   */
  const findMatchingParcels = useCallback(async (trip: Trip): Promise<Parcel[]> => {
    setLoading(true);
    const { data } = await fetchParcels({ fromCity: trip.fromCity, toCity: trip.toCity });
    setLoading(false);
    if (!data) return [];
    return data.filter(
      p =>
        p.status === 'open' &&
        p.userId !== trip.userId &&
        p.weight <= trip.availableCapacity
    );
  }, []);

  /**
   * Find all trips on a given route (for senders who haven't created a parcel yet — browse mode).
   */
  const findTripsOnRoute = useCallback(async (fromCity: string, toCity: string, excludeUserId?: string): Promise<Trip[]> => {
    setLoading(true);
    const { data } = await fetchTrips({ fromCity, toCity });
    setLoading(false);
    if (!data) return [];
    return data.filter(t => t.status === 'active' && (!excludeUserId || t.userId !== excludeUserId));
  }, []);

  return { findMatchingTrips, findMatchingParcels, findTripsOnRoute, loading };
}
