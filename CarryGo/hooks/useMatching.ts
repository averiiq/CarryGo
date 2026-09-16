import { Trip, Parcel } from '@/types';
import { fetchTrips } from '@/services/trips.service';
import { fetchParcels } from '@/services/parcels.service';
import { useQuery } from '@tanstack/react-query';
import { captureException } from '@/lib/monitoring';
import {
  findBestMatches,
  findBestParcelsForTrip,
  diagnoseParcelTripMatching,
  diagnoseTripParcelMatching,
  MatchingDiagnostic,
} from '@/services/smart-matching.service';

export interface MatchingResult<T> {
  matches: T[];
  candidateCount: number;
  diagnostic: MatchingDiagnostic;
}

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
  const query = useQuery<MatchingResult<Trip>>({
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
      const emptyDiagnostic: MatchingDiagnostic = {
        reason: 'corridor_unserved',
        title: 'No Active Travellers on This Route',
        explanation: 'There are currently no registered trips scheduled on this route.',
        candidateCount: 0,
        actions: [
          {
            id: 'post_open_request',
            label: 'Post Open Request',
            hint: 'Keep your parcel visible to all community drivers along this corridor',
          },
        ],
      };

      if (!params) return { matches: [], candidateCount: 0, diagnostic: emptyDiagnostic };

      const [exact, fromNearby, toNearby] = await Promise.all([
        fetchTrips({ fromCity: params.fromCity, toCity: params.toCity, limit: 60, offset: 0, includeCount: false }),
        fetchTrips({ userCity: params.fromCity, limit: 60, offset: 0, includeCount: false }),
        fetchTrips({ userCity: params.toCity, limit: 60, offset: 0, includeCount: false }),
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

      const matches = findBestMatches(scoringParcel, dedupedTrips, { minScore: 20, limit: 50 }).map(
        match => match.trip,
      );
      const diagnostic = diagnoseParcelTripMatching(scoringParcel, dedupedTrips);

      return {
        matches,
        candidateCount: dedupedTrips.length,
        diagnostic,
      };
    },
    staleTime: 60_000,
  });

  if (query.error) {
    captureException(query.error, { context: 'useMatching.findMatchingTrips' });
  }

  return query;
}

export function useMatchingParcels(params: MatchParcelsParams | null) {
  const query = useQuery<MatchingResult<Parcel>>({
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
      const emptyDiagnostic: MatchingDiagnostic = {
        reason: 'corridor_unserved',
        title: 'No Senders Waiting on This Route',
        explanation: 'There are currently no parcels waiting for delivery on this corridor.',
        candidateCount: 0,
        actions: [],
      };

      if (!params) return { matches: [], candidateCount: 0, diagnostic: emptyDiagnostic };

      const [exact, fromNearby, toNearby] = await Promise.all([
        fetchParcels({ fromCity: params.fromCity, toCity: params.toCity, limit: 60, offset: 0, includeCount: false }),
        fetchParcels({ userCity: params.fromCity, limit: 60, offset: 0, includeCount: false }),
        fetchParcels({ userCity: params.toCity, limit: 60, offset: 0, includeCount: false }),
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

      const matches = findBestParcelsForTrip(scoringTrip, dedupedParcels, { minScore: 20, limit: 50 }).map(
        match => match.parcel,
      );
      const diagnostic = diagnoseTripParcelMatching(scoringTrip, dedupedParcels);

      return {
        matches,
        candidateCount: dedupedParcels.length,
        diagnostic,
      };
    },
    staleTime: 60_000,
  });

  if (query.error) {
    captureException(query.error, { context: 'useMatching.findMatchingParcels' });
  }

  return query;
}

export function useMatchingTripsOnRoute(params: MatchTripsOnRouteParams | null) {
  const query = useQuery<MatchingResult<Trip>>({
    queryKey: ['matching', 'tripsOnRoute', params?.fromCity, params?.toCity, params?.excludeUserId],
    enabled: Boolean(params),
    queryFn: async () => {
      const emptyDiagnostic: MatchingDiagnostic = {
        reason: 'corridor_unserved',
        title: 'No Active Travellers on This Route',
        explanation: 'There are currently no registered trips scheduled on this route.',
        candidateCount: 0,
        actions: [],
      };

      if (!params) return { matches: [], candidateCount: 0, diagnostic: emptyDiagnostic };

      const [exact, fromNearby, toNearby] = await Promise.all([
        fetchTrips({ fromCity: params.fromCity, toCity: params.toCity, limit: 60, offset: 0, includeCount: false }),
        fetchTrips({ userCity: params.fromCity, limit: 60, offset: 0, includeCount: false }),
        fetchTrips({ userCity: params.toCity, limit: 60, offset: 0, includeCount: false }),
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

      let rankedTrips = findBestMatches(scoringParcel, dedupedTrips, { minScore: 20, limit: 50 }).map(
        match => match.trip,
      );

      if (params.excludeUserId) {
        rankedTrips = rankedTrips.filter(trip => trip.userId !== params.excludeUserId);
      }

      const diagnostic = diagnoseParcelTripMatching(scoringParcel, dedupedTrips);

      return {
        matches: rankedTrips,
        candidateCount: dedupedTrips.length,
        diagnostic,
      };
    },
    staleTime: 60_000,
  });

  if (query.error) {
    captureException(query.error, { context: 'useMatching.findTripsOnRoute' });
  }

  return query;
}
