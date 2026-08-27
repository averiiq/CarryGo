import { Trip, Parcel } from '@/types';
import { fetchTrips } from '@/services/trips.service';
import { fetchParcels } from '@/services/parcels.service';
import { useQuery } from '@tanstack/react-query';
import { captureException } from '@/lib/monitoring';
import { findBestMatches, findBestParcelsForTrip } from '@/services/smart-matching.service';

interface MatchTripsParams {
  fromCity: string;
  toCity: string;
  userId: string;
  weight: number;
  priceOffer?: number;
  createdAt?: string;
  deliveryDate?: string;
  category?: Parcel['category'];
  description?: string;
}

interface MatchParcelsParams {
  fromCity: string;
  toCity: string;
  userId: string;
  availableCapacity: number;
  pricePerKg: number;
  date: string;
  time: string;
  userName: string;
  userRating: number;
  vehicleType: Trip['vehicleType'];
}

interface MatchTripsOnRouteParams {
  fromCity: string;
  toCity: string;
  excludeUserId?: string;
}

export function useMatchingTrips(params: MatchTripsParams | null) {
  const query = useQuery<Trip[]>({
    queryKey: [
      'matching',
      'trips',
      params?.fromCity,
      params?.toCity,
      params?.userId,
      params?.weight,
      params?.priceOffer,
      params?.createdAt,
      params?.deliveryDate,
    ],
    enabled: Boolean(params),
    queryFn: async () => {
      if (!params) return [];

      const [exact, fromNearby, toNearby] = await Promise.all([
        fetchTrips({ fromCity: params.fromCity, toCity: params.toCity, limit: 120, offset: 0 }),
        fetchTrips({ userCity: params.fromCity, limit: 120, offset: 0 }),
        fetchTrips({ userCity: params.toCity, limit: 120, offset: 0 }),
      ]);

      const firstError = exact.error || fromNearby.error || toNearby.error;
      if (firstError) throw new Error(firstError);

      const allTrips = [...(exact.data ?? []), ...(fromNearby.data ?? []), ...(toNearby.data ?? [])];
      const dedupedTrips = Array.from(new Map(allTrips.map(trip => [trip.id, trip])).values());

      const scoringParcel: Parcel = {
        id: 'matching-source-parcel',
        userId: params.userId,
        userName: 'Current User',
        fromCity: params.fromCity,
        toCity: params.toCity,
        category: params.category ?? 'other',
        description: params.description ?? 'Route match request',
        deliveryDate: params.deliveryDate,
        weight: params.weight,
        priceOffer: params.priceOffer ?? 0,
        status: 'open',
        createdAt: params.createdAt ?? new Date().toISOString(),
      };

      return findBestMatches(scoringParcel, dedupedTrips, { minScore: 20, limit: 50 }).map(
        match => match.trip,
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
    queryKey: [
      'matching',
      'parcels',
      params?.fromCity,
      params?.toCity,
      params?.userId,
      params?.availableCapacity,
      params?.pricePerKg,
      params?.date,
    ],
    enabled: Boolean(params),
    queryFn: async () => {
      if (!params) return [];

      const [exact, fromNearby, toNearby] = await Promise.all([
        fetchParcels({ fromCity: params.fromCity, toCity: params.toCity, limit: 120, offset: 0 }),
        fetchParcels({ userCity: params.fromCity, limit: 120, offset: 0 }),
        fetchParcels({ userCity: params.toCity, limit: 120, offset: 0 }),
      ]);

      const firstError = exact.error || fromNearby.error || toNearby.error;
      if (firstError) throw new Error(firstError);

      const allParcels = [...(exact.data ?? []), ...(fromNearby.data ?? []), ...(toNearby.data ?? [])];
      const dedupedParcels = Array.from(new Map(allParcels.map(parcel => [parcel.id, parcel])).values());

      const scoringTrip: Trip = {
        id: 'matching-source-trip',
        userId: params.userId,
        userName: params.userName,
        userRating: params.userRating,
        fromCity: params.fromCity,
        toCity: params.toCity,
        date: params.date,
        time: params.time,
        vehicleType: params.vehicleType,
        availableCapacity: params.availableCapacity,
        pricePerKg: params.pricePerKg,
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      return findBestParcelsForTrip(scoringTrip, dedupedParcels, { minScore: 20, limit: 50 }).map(
        match => match.parcel,
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
      const [exact, fromNearby, toNearby] = await Promise.all([
        fetchTrips({ fromCity: params.fromCity, toCity: params.toCity, limit: 120, offset: 0 }),
        fetchTrips({ userCity: params.fromCity, limit: 120, offset: 0 }),
        fetchTrips({ userCity: params.toCity, limit: 120, offset: 0 }),
      ]);

      const firstError = exact.error || fromNearby.error || toNearby.error;
      if (firstError) throw new Error(firstError);

      const allTrips = [...(exact.data ?? []), ...(fromNearby.data ?? []), ...(toNearby.data ?? [])];
      const dedupedTrips = Array.from(new Map(allTrips.map(trip => [trip.id, trip])).values());

      const scoringParcel: Parcel = {
        id: 'matching-route-browser',
        userId: params.excludeUserId ?? 'route-browser',
        userName: 'Route Browser',
        fromCity: params.fromCity,
        toCity: params.toCity,
        category: 'other',
        description: 'Browse route matches',
        weight: 1,
        priceOffer: 100000,
        status: 'open',
        createdAt: new Date().toISOString(),
      };

      const rankedTrips = findBestMatches(scoringParcel, dedupedTrips, { minScore: 20, limit: 50 }).map(
        match => match.trip,
      );

      if (!params.excludeUserId) return rankedTrips;
      return rankedTrips.filter(trip => trip.userId !== params.excludeUserId);
    },
    staleTime: 60_000,
  });

  if (query.error) {
    captureException(query.error, { context: 'useMatching.findTripsOnRoute' });
  }

  return query;
}
