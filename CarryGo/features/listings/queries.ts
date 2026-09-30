import { useEffect } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryKeys';
import { getSupabaseClient } from '@/template';
import {
  createParcel,
  fetchParcelById,
  fetchParcels,
  fetchParcelsByIds,
  fetchUserParcels,
  updateParcelStatus,
} from '@/services/parcels.service';
import {
  createTrip,
  fetchTripById,
  fetchTrips,
  fetchUserTrips,
  updateTripStatus,
} from '@/services/trips.service';
import { fetchActivePromotionalBanners } from '@/services/promotional-banners.service';
import { FilterOptions, Parcel, PromotionalBanner, Trip } from '@/types';
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

export function useTripsQuery(enabled = true, userCity?: string) {
  return useInfiniteQuery<PaginatedResult<Trip>>({
    queryKey: queryKeys.listings.trips(userCity ? { userCity } : undefined),
    enabled,
    initialPageParam: 0,
    staleTime: 30_000, // 30s — short enough to catch newly posted trips quickly
    queryFn: async ({ pageParam }) => {
      const offset = pageParam as number;
      const { data, error, total } = await fetchTrips({ userCity, limit: PAGE_SIZE, offset });
      if (error) throw serviceError(error, 'Failed to load trips');
      const items = data ?? [];
      const nextOffset = offset + items.length < total ? offset + items.length : null;
      return { items, total, nextOffset };
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset,
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

export function useUserTripsQuery(userId?: string, enabled = true) {
  return useQuery<Trip[]>({
    queryKey: queryKeys.listings.userTrips(userId ?? 'missing'),
    enabled: Boolean(userId) && enabled,
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await fetchUserTrips(userId);
      if (error) throw serviceError(error, 'Failed to load user trips');
      return data ?? [];
    },
    staleTime: 30_000,
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

export function useParcelsQuery(enabled = true, userCity?: string) {
  return useInfiniteQuery<PaginatedResult<Parcel>>({
    queryKey: queryKeys.listings.parcels(userCity ? { userCity } : undefined),
    enabled,
    initialPageParam: 0,
    staleTime: 30_000, // 30s — short enough to catch newly posted parcels quickly
    queryFn: async ({ pageParam }) => {
      const offset = pageParam as number;
      const { data, error, total } = await fetchParcels({ userCity, limit: PAGE_SIZE, offset });
      if (error) throw serviceError(error, 'Failed to load parcels');
      const items = data ?? [];
      const nextOffset = offset + items.length < total ? offset + items.length : null;
      return { items, total, nextOffset };
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset,
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

export function useUserParcelsQuery(userId?: string, enabled = true) {
  return useQuery<Parcel[]>({
    queryKey: queryKeys.listings.userParcels(userId ?? 'missing'),
    enabled: Boolean(userId) && enabled,
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await fetchUserParcels(userId);
      if (error) throw serviceError(error, 'Failed to load user parcels');
      return data ?? [];
    },
    staleTime: 30_000,
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
    onSuccess: (newTrip) => {
      if (newTrip?.id) {
        queryClient.setQueryData(queryKeys.listings.trip(newTrip.id), newTrip);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.listings.trips() });
      if (newTrip?.userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.listings.userTrips(newTrip.userId) });
      }
    },
  });
}

export function useUpdateTripStatusMutation(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, status }: { tripId: string; status: Trip['status'] }) => {
      if (!userId) throw new Error('User session required');
      const { error } = await updateTripStatus(tripId, status, userId);
      if (error) throw serviceError(error, 'Failed to update trip');
      return { tripId, status };
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Trip | null>(queryKeys.listings.trip(updated.tripId), current =>
        current ? { ...current, status: updated.status } : current
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.listings.trips() });
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.listings.userTrips(userId) });
      }
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
    onSuccess: (newParcel) => {
      // Seed the detail cache immediately so the parcel page loads without a round-trip
      if (newParcel?.id) {
        queryClient.setQueryData(queryKeys.listings.parcel(newParcel.id), newParcel);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.listings.parcels() });
      if (newParcel?.userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.listings.userParcels(newParcel.userId) });
      }
    },
  });
}

export function useUpdateParcelStatusMutation(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ parcelId, status }: { parcelId: string; status: Parcel['status'] }) => {
      if (!userId) throw new Error('User session required');
      const { error } = await updateParcelStatus(parcelId, status, userId);
      if (error) throw serviceError(error, 'Failed to update parcel');
      return { parcelId, status };
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Parcel | null>(queryKeys.listings.parcel(updated.parcelId), current =>
        current ? { ...current, status: updated.status } : current
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.listings.parcels() });
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.listings.userParcels(userId) });
      }
    },
  });
}

let listingsChannelInstance = 0;

export function useListingsRealtime(enabled = true, cityFilter?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;
    const sb = getSupabaseClient();
    const instance = ++listingsChannelInstance;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const invalidateAll = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      // 600ms debounce: batches rapid successive inserts/updates into a single cache invalidation
      debounceTimer = setTimeout(() => {
        if (!mounted) return;
        queryClient.invalidateQueries({ queryKey: queryKeys.listings.trips() });
        queryClient.invalidateQueries({ queryKey: queryKeys.listings.parcels() });
      }, 600);
    };

    const suffix = cityFilter || 'all';
    let combinedChannel: ReturnType<typeof sb.channel> | null = null;

    try {
      // Single combined channel for both tables with unique instance ID
      combinedChannel = sb.channel(`listings-combined:${suffix}:${instance}_${Date.now()}`);

      if (cityFilter) {
        const fromFilter = `from_city=eq.${cityFilter}`;
        const toFilter = `to_city=eq.${cityFilter}`;
        combinedChannel = combinedChannel
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trips', filter: fromFilter }, invalidateAll)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trips', filter: toFilter }, invalidateAll)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trips', filter: fromFilter }, invalidateAll)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trips', filter: toFilter }, invalidateAll)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'parcels', filter: fromFilter }, invalidateAll)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'parcels', filter: toFilter }, invalidateAll)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'parcels', filter: fromFilter }, invalidateAll)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'parcels', filter: toFilter }, invalidateAll);
      } else {
        combinedChannel = combinedChannel
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trips' }, invalidateAll)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trips' }, invalidateAll)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'parcels' }, invalidateAll)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'parcels' }, invalidateAll);
      }

      combinedChannel.subscribe((status) => {
        if (!mounted && combinedChannel) {
          try {
            void sb.removeChannel(combinedChannel);
          } catch {}
        }
      });
    } catch {}

    return () => {
      mounted = false;
      if (debounceTimer) clearTimeout(debounceTimer);
      if (combinedChannel) {
        try {
          void sb.removeChannel(combinedChannel);
        } catch {}
      }
    };
  }, [enabled, queryClient, cityFilter]);
}

export function filterTrips(trips: Trip[], filters: FilterOptions, userCity?: string) {
  return trips.filter(trip => {
    // 1. NEVER show non-active (completed, cancelled) trips in live marketplace
    if (trip.status !== 'active') return false;

    // 2. Specific search filter matches
    if (filters.fromCity && !trip.fromCity.toLowerCase().includes(filters.fromCity.toLowerCase())) return false;
    if (filters.toCity && !trip.toCity.toLowerCase().includes(filters.toCity.toLowerCase())) return false;

    // 3. Location filter applied to live marketplace when no specific corridor search is active
    if (userCity && !filters.fromCity && !filters.toCity) {
      const city = userCity.toLowerCase().trim();
      const originMatch = trip.fromCity.toLowerCase().includes(city);
      const destMatch = trip.toCity.toLowerCase().includes(city);
      if (!originMatch && !destMatch) return false;
    }

    if (filters.vehicleType && trip.vehicleType !== filters.vehicleType) return false;
    if (filters.dateFrom && trip.date < filters.dateFrom) return false;
    if (filters.dateTo && trip.date > filters.dateTo) return false;
    return true;
  });
}

export function filterParcels(parcels: Parcel[], filters: FilterOptions, userCity?: string) {
  return parcels.filter(parcel => {
    // 1. NEVER show non-open (delivered, matched, in_transit, failed) parcels in live marketplace
    if (parcel.status !== 'open') return false;

    // 2. Specific search filter matches
    if (filters.fromCity && !parcel.fromCity.toLowerCase().includes(filters.fromCity.toLowerCase())) return false;
    if (filters.toCity && !parcel.toCity.toLowerCase().includes(filters.toCity.toLowerCase())) return false;

    // 3. Location filter applied to live marketplace when no specific corridor search is active
    if (userCity && !filters.fromCity && !filters.toCity) {
      const city = userCity.toLowerCase().trim();
      const originMatch = parcel.fromCity.toLowerCase().includes(city);
      const destMatch = parcel.toCity.toLowerCase().includes(city);
      if (!originMatch && !destMatch) return false;
    }

    return true;
  });
}

export function flattenInfiniteData<T>(data: { pages: PaginatedResult<T>[] } | undefined): T[] {
  if (!data) return [];
  return data.pages.flatMap(page => page.items);
}

export function usePromotionalBannersQuery(enabled = true) {
  return useQuery<PromotionalBanner[]>({
    queryKey: queryKeys.promotionalBanners,
    enabled,
    queryFn: async () => {
      const { data, error } = await fetchActivePromotionalBanners();
      if (error) {
        // Return empty so carousel gracefully uses high-res bundled fallback slides
        return [];
      }
      return data ?? [];
    },
    staleTime: 5 * 60_000, // 5 minutes cache
  });
}
