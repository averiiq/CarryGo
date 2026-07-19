import { Trip, Parcel } from '@/types';
import { fetchTrips } from '@/services/trips.service';
import { fetchParcels } from '@/services/parcels.service';
import { useQuery } from '@tanstack/react-query';
import { captureException } from '@/lib/monitoring';

interface MatchTripsParams {
  fromCity: string;
  toCity: string;
  userId: string;
  weight: number;
}

interface MatchParcelsParams {
  fromCity: string;
  toCity: string;
  userId: string;
  availableCapacity: number;
}

interface MatchTripsOnRouteParams {
  fromCity: string;
  toCity: string;
  excludeUserId?: string;
}

export function useMatchingTrips(params: MatchTripsParams | null) {
  const query = useQuery<Trip[]>({
    queryKey: ['matching', 'trips', params?.fromCity, params?.toCity, params?.userId, params?.weight],
    enabled: Boolean(params),
    queryFn: async () => {
      if (!params) return [];
      const { data, error } = await fetchTrips({ fromCity: params.fromCity, toCity: params.toCity });
      if (error) throw new Error(error);
      if (!data) return [];
      return data.filter(
        t =>
          t.status === 'active' &&
          t.userId !== params.userId &&
          t.availableCapacity >= params.weight
      );
    },
    staleTime: 60_000,
  });

  if (query.error) {
    captureException(query.error, { context: 'useMatching.findMatchingTrips' });
  }

  return query;
}

export function useMatchingParcels(params: MatchParcelsParams | null) {
  const query = useQuery<Parcel[]>({
    queryKey: ['matching', 'parcels', params?.fromCity, params?.toCity, params?.userId, params?.availableCapacity],
    enabled: Boolean(params),
    queryFn: async () => {
      if (!params) return [];
      const { data, error } = await fetchParcels({ fromCity: params.fromCity, toCity: params.toCity });
      if (error) throw new Error(error);
      if (!data) return [];
      return data.filter(
        p =>
          p.status === 'open' &&
          p.userId !== params.userId &&
          p.weight <= params.availableCapacity
      );
    },
    staleTime: 60_000,
  });

  if (query.error) {
    captureException(query.error, { context: 'useMatching.findMatchingParcels' });
  }

  return query;
}

export function useMatchingTripsOnRoute(params: MatchTripsOnRouteParams | null) {
  const query = useQuery<Trip[]>({
    queryKey: ['matching', 'tripsOnRoute', params?.fromCity, params?.toCity, params?.excludeUserId],
    enabled: Boolean(params),
    queryFn: async () => {
      if (!params) return [];
      const { data, error } = await fetchTrips({ fromCity: params.fromCity, toCity: params.toCity });
      if (error) throw new Error(error);
      if (!data) return [];
      return data.filter(t => t.status === 'active' && (!params.excludeUserId || t.userId !== params.excludeUserId));
    },
    staleTime: 60_000,
  });

  if (query.error) {
    captureException(query.error, { context: 'useMatching.findTripsOnRoute' });
  }

  return query;
}
