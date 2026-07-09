import { useEffect } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryKeys';
import { getSupabaseClient } from '@/template';
import {
  createParcel,
  fetchParcelById,
  fetchParcels,
  fetchParcelsByIds,
  updateParcelStatus,
} from '@/services/parcels.service';
import {
  createTrip,
  fetchTripById,
  fetchTrips,
  updateTripStatus,
} from '@/services/trips.service';
import { FilterOptions, Parcel, Trip } from '@/types';
import { enforceRateLimit } from '@/lib/server-rate-limit';

const PAGE_SIZE = 20;

function serviceError(message: string | null | undefined, fallback: string) {
  return new Error(message || fallback);
}

type PaginatedResult<T> = {
  items: T[];
  total: number;
  nextOffset: number | null;
};

export function useTripsInfiniteQuery(filters?: { fromCity?: string; toCity?: string }, enabled = true) {
  return useInfiniteQuery<PaginatedResult<Trip>>({
    queryKey: queryKeys.listings.trips(filters),
    enabled,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const offset = pageParam as number;
      const { data, error, total } = await fetchTrips({
        fromCity: filters?.fromCity,
        toCity: filters?.toCity,
        limit: PAGE_SIZE,
        offset,
      });
      if (error) throw serviceError(error, 'Failed to load trips');
      const items = data ?? [];
      const nextOffset = offset + items.length < total ? offset + items.length : null;
      return { items, total, nextOffset };
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    staleTime: 60_000,
  });
}

export function useTripsQuery(enabled = true) {
  return useInfiniteQuery<PaginatedResult<Trip>>({
    queryKey: queryKeys.listings.trips(),
    enabled,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const offset = pageParam as number;
      const { data, error, total } = await fetchTrips({ limit: PAGE_SIZE, offset });
      if (error) throw serviceError(error, 'Failed to load trips');
      const items = data ?? [];
      const nextOffset = offset + items.length < total ? offset + items.length : null;
      return { items, total, nextOffset };
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    staleTime: 60_000,
  });
}

export function useTripQuery(tripId?: string) {
  return useQuery<Trip | null>({
    queryKey: queryKeys.listings.trip(tripId ?? 'missing'),
    enabled: Boolean(tripId),
    queryFn: async () => {
      if (!tripId) return null;
      const { data, error } = await fetchTripById(tripId);
      if (error) throw serviceError(error, 'Failed to load trip');
      return data;
    },
    staleTime: 2 * 60_000,
  });
}

export function useParcelsInfiniteQuery(filters?: { fromCity?: string; toCity?: string }, enabled = true) {
  return useInfiniteQuery<PaginatedResult<Parcel>>({
    queryKey: queryKeys.listings.parcels(filters),
    enabled,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const offset = pageParam as number;
      const { data, error, total } = await fetchParcels({
        fromCity: filters?.fromCity,
        toCity: filters?.toCity,
        limit: PAGE_SIZE,
        offset,
      });
      if (error) throw serviceError(error, 'Failed to load parcels');
      const items = data ?? [];
      const nextOffset = offset + items.length < total ? offset + items.length : null;
      return { items, total, nextOffset };
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    staleTime: 60_000,
  });
}

export function useParcelsQuery(enabled = true) {
  return useInfiniteQuery<PaginatedResult<Parcel>>({
    queryKey: queryKeys.listings.parcels(),
    enabled,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const offset = pageParam as number;
      const { data, error, total } = await fetchParcels({ limit: PAGE_SIZE, offset });
      if (error) throw serviceError(error, 'Failed to load parcels');
      const items = data ?? [];
      const nextOffset = offset + items.length < total ? offset + items.length : null;
      return { items, total, nextOffset };
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    staleTime: 60_000,
  });
}

export function useParcelQuery(parcelId?: string) {
  return useQuery<Parcel | null>({
    queryKey: queryKeys.listings.parcel(parcelId ?? 'missing'),
    enabled: Boolean(parcelId),
    queryFn: async () => {
      if (!parcelId) return null;
      const { data, error } = await fetchParcelById(parcelId);
      if (error) throw serviceError(error, 'Failed to load parcel');
      return data;
    },
    staleTime: 2 * 60_000,
  });
}

export function useParcelsByIdsQuery(parcelIds: string[]) {
  const stableIds = [...parcelIds].sort();

  return useQuery<Parcel[]>({
    queryKey: queryKeys.listings.parcelsByIds(stableIds),
    enabled: stableIds.length > 0,
    queryFn: async () => {
      const { data, error } = await fetchParcelsByIds(stableIds);
      if (error) throw serviceError(error, 'Failed to load parcels');
      return data ?? [];
    },
  });
}

export function useCreateTripMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (trip: Omit<Trip, 'id' | 'createdAt'>) => {
      const rateCheck = await enforceRateLimit(trip.userId, 'create_trip');
      if (!rateCheck.allowed) throw new Error(rateCheck.error);
      const { data, error } = await createTrip(trip);
      if (error || !data) throw serviceError(error, 'Failed to create trip');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.listings.trips() });
    },
  });
}

export function useUpdateTripStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, status }: { tripId: string; status: Trip['status'] }) => {
      const { error } = await updateTripStatus(tripId, status);
      if (error) throw serviceError(error, 'Failed to update trip');
      return { tripId, status };
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Trip | null>(queryKeys.listings.trip(updated.tripId), current =>
        current ? { ...current, status: updated.status } : current
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.listings.trips() });
    },
  });
}

export function useCreateParcelMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (parcel: Omit<Parcel, 'id' | 'createdAt'>) => {
      const rateCheck = await enforceRateLimit(parcel.userId, 'create_parcel');
      if (!rateCheck.allowed) throw new Error(rateCheck.error);
      const { data, error } = await createParcel(parcel);
      if (error || !data) throw serviceError(error, 'Failed to create parcel');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.listings.parcels() });
    },
  });
}

export function useUpdateParcelStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ parcelId, status }: { parcelId: string; status: Parcel['status'] }) => {
      const { error } = await updateParcelStatus(parcelId, status);
      if (error) throw serviceError(error, 'Failed to update parcel');
      return { parcelId, status };
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Parcel | null>(queryKeys.listings.parcel(updated.parcelId), current =>
        current ? { ...current, status: updated.status } : current
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.listings.parcels() });
    },
  });
}

export function useListingsRealtime(enabled = true, cityFilter?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const sb = getSupabaseClient();

    const channelName = cityFilter
      ? `realtime:listings:${cityFilter}`
      : 'realtime:listings';

    const tripsFilter = cityFilter
      ? `from_city=eq.${cityFilter}`
      : undefined;

    const parcelsFilter = cityFilter
      ? `from_city=eq.${cityFilter}`
      : undefined;

    let channel = sb.channel(channelName);

    if (tripsFilter) {
      channel = channel
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trips', filter: tripsFilter }, () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.listings.trips() });
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trips', filter: tripsFilter }, () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.listings.trips() });
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'parcels', filter: parcelsFilter }, () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.listings.parcels() });
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'parcels', filter: parcelsFilter }, () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.listings.parcels() });
        });
    } else {
      channel = channel
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trips' }, () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.listings.trips() });
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trips' }, () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.listings.trips() });
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'parcels' }, () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.listings.parcels() });
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'parcels' }, () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.listings.parcels() });
        });
    }

    channel.subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [enabled, queryClient, cityFilter]);
}

export function filterTrips(trips: Trip[], filters: FilterOptions) {
  return trips.filter(trip => {
    if (filters.fromCity && !trip.fromCity.toLowerCase().includes(filters.fromCity.toLowerCase())) return false;
    if (filters.toCity && !trip.toCity.toLowerCase().includes(filters.toCity.toLowerCase())) return false;
    if (filters.vehicleType && trip.vehicleType !== filters.vehicleType) return false;
    if (filters.dateFrom && trip.date < filters.dateFrom) return false;
    if (filters.dateTo && trip.date > filters.dateTo) return false;
    return true;
  });
}

export function filterParcels(parcels: Parcel[], filters: FilterOptions) {
  return parcels.filter(parcel => {
    if (filters.fromCity && !parcel.fromCity.toLowerCase().includes(filters.fromCity.toLowerCase())) return false;
    if (filters.toCity && !parcel.toCity.toLowerCase().includes(filters.toCity.toLowerCase())) return false;
    return true;
  });
}

export function flattenInfiniteData<T>(data: { pages: PaginatedResult<T>[] } | undefined): T[] {
  if (!data) return [];
  return data.pages.flatMap(page => page.items);
}
