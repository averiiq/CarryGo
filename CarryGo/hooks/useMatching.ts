import { Trip, Parcel } from '@/types';
import { fetchTrips } from '@/services/trips.service';
import { fetchParcels } from '@/services/parcels.service';
import { useMutation } from '@tanstack/react-query';
import { captureException } from '@/lib/monitoring';

export function useMatching() {
  const matchTrips = useMutation({
    mutationFn: async (parcel: Parcel): Promise<Trip[]> => {
      const { data, error } = await fetchTrips({ fromCity: parcel.fromCity, toCity: parcel.toCity });
      if (error) throw new Error(error);
      if (!data) return [];
      return data.filter(
        t =>
          t.status === 'active' &&
          t.userId !== parcel.userId &&
          t.availableCapacity >= parcel.weight
      );
    },
    onError: (err) => { captureException(err, { context: 'useMatching.findMatchingTrips' }); },
  });

  const matchParcels = useMutation({
    mutationFn: async (trip: Trip): Promise<Parcel[]> => {
      const { data, error } = await fetchParcels({ fromCity: trip.fromCity, toCity: trip.toCity });
      if (error) throw new Error(error);
      if (!data) return [];
      return data.filter(
        p =>
          p.status === 'open' &&
          p.userId !== trip.userId &&
          p.weight <= trip.availableCapacity
      );
    },
    onError: (err) => { captureException(err, { context: 'useMatching.findMatchingParcels' }); },
  });

  const matchTripsOnRoute = useMutation({
    mutationFn: async ({ fromCity, toCity, excludeUserId }: { fromCity: string; toCity: string; excludeUserId?: string }): Promise<Trip[]> => {
      const { data, error } = await fetchTrips({ fromCity, toCity });
      if (error) throw new Error(error);
      if (!data) return [];
      return data.filter(t => t.status === 'active' && (!excludeUserId || t.userId !== excludeUserId));
    },
    onError: (err) => { captureException(err, { context: 'useMatching.findTripsOnRoute' }); },
  });

  const findMatchingTrips = (parcel: Parcel) => matchTrips.mutateAsync(parcel);
  const findMatchingParcels = (trip: Trip) => matchParcels.mutateAsync(trip);
  const findTripsOnRoute = (fromCity: string, toCity: string, excludeUserId?: string) =>
    matchTripsOnRoute.mutateAsync({ fromCity, toCity, excludeUserId });

  const loading = matchTrips.isPending || matchParcels.isPending || matchTripsOnRoute.isPending;
  const error = matchTrips.error?.message ?? matchParcels.error?.message ?? matchTripsOnRoute.error?.message ?? null;

  return { findMatchingTrips, findMatchingParcels, findTripsOnRoute, loading, error };
}
