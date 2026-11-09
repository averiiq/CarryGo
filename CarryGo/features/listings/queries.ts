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
import { MarketplaceRelevanceService } from '@/services/marketplace-relevance.service';

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
  const queryClient = useQueryClient();
  const normalizedId = Array.isArray(tripId) ? tripId[0] : tripId;

  return useQuery<Trip | null>({
    queryKey: queryKeys.listings.trip(normalizedId ?? 'missing'),
    enabled: Boolean(normalizedId),
    initialData: () => {
      if (!normalizedId) return undefined;
      // 1. Check direct cache
      const direct = queryClient.getQueryData<Trip | null>(queryKeys.listings.trip(normalizedId));
      if (direct) return direct;

      // 2. Search active listings.trips caches
      const tripsCaches = queryClient.getQueriesData<any>({
        queryKey: ['listings', 'trips'],
      });
      for (const [, cacheData] of tripsCaches) {
        if (!cacheData) continue;
        if (Array.isArray(cacheData.pages)) {
          for (const page of cacheData.pages) {
            const found = page.items?.find((t: Trip) => t.id === normalizedId);
            if (found) return found;
          }
        }
        if (Array.isArray(cacheData.items)) {
          const found = cacheData.items.find((t: Trip) => t.id === normalizedId);
          if (found) return found;
        }
      }
      return undefined;
    },
    queryFn: async () => {
      if (!normalizedId) return null;
      try {
        const { data, error } = await fetchTripById(normalizedId);
        if (error || !data) {
          // Check queryClient cache before returning null
          const tripsCaches = queryClient.getQueriesData<any>({
            queryKey: ['listings', 'trips'],
          });
          for (const [, cacheData] of tripsCaches) {
            if (!cacheData) continue;
            if (Array.isArray(cacheData.pages)) {
              for (const page of cacheData.pages) {
                const found = page.items?.find((t: Trip) => t.id === normalizedId);
                if (found) return found;
              }
            }
            if (Array.isArray(cacheData.items)) {
              const found = cacheData.items.find((t: Trip) => t.id === normalizedId);
              if (found) return found;
            }
          }
          if (error) {
            console.warn(`[useTripQuery] fetchTripById info for ${normalizedId}:`, error);
          }
          return null;
        }
        return data;
      } catch (err) {
        console.warn(`[useTripQuery] Exception fetching trip ${normalizedId}:`, err);
        return null;
      }
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
  const queryClient = useQueryClient();
  const normalizedId = Array.isArray(parcelId) ? parcelId[0] : parcelId;

  return useQuery<Parcel | null>({
    queryKey: queryKeys.listings.parcel(normalizedId ?? 'missing'),
    enabled: Boolean(normalizedId),
    initialData: () => {
      if (!normalizedId) return undefined;
      const direct = queryClient.getQueryData<Parcel | null>(queryKeys.listings.parcel(normalizedId));
      if (direct) return direct;

      const parcelsCaches = queryClient.getQueriesData<any>({
        queryKey: ['listings', 'parcels'],
      });
      for (const [, cacheData] of parcelsCaches) {
        if (!cacheData) continue;
        if (Array.isArray(cacheData.pages)) {
          for (const page of cacheData.pages) {
            const found = page.items?.find((p: Parcel) => p.id === normalizedId);
            if (found) return found;
          }
        }
        if (Array.isArray(cacheData.items)) {
          const found = cacheData.items.find((p: Parcel) => p.id === normalizedId);
          if (found) return found;
        }
      }
      return undefined;
    },
    queryFn: async () => {
      if (!normalizedId) return null;
      try {
        const { data, error } = await fetchParcelById(normalizedId);
        if (error || !data) {
          const parcelsCaches = queryClient.getQueriesData<any>({
            queryKey: ['listings', 'parcels'],
          });
          for (const [, cacheData] of parcelsCaches) {
            if (!cacheData) continue;
            if (Array.isArray(cacheData.pages)) {
              for (const page of cacheData.pages) {
                const found = page.items?.find((p: Parcel) => p.id === normalizedId);
                if (found) return found;
              }
            }
            if (Array.isArray(cacheData.items)) {
              const found = cacheData.items.find((p: Parcel) => p.id === normalizedId);
              if (found) return found;
            }
          }
          if (error) {
            console.warn(`[useParcelQuery] fetchParcelById info for ${normalizedId}:`, error);
          }
          return null;
        }
        return data;
      } catch (err) {
        console.warn(`[useParcelQuery] Exception fetching parcel ${normalizedId}:`, err);
        return null;
      }
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

    // 2. Capacity must be > 0 (completed / fully booked trips NEVER show)
    if (Number(trip.availableCapacity || 0) <= 0) return false;

    // 3. Date must not be in past (expired / departed trips NEVER show)
    const todayStr = new Date().toISOString().slice(0, 10);
    if (trip.date && trip.date < todayStr) return false;

    // 4. Specific search filter matches
    if (filters.fromCity && !trip.fromCity.toLowerCase().includes(filters.fromCity.toLowerCase())) return false;
    if (filters.toCity && !trip.toCity.toLowerCase().includes(filters.toCity.toLowerCase())) return false;

    // 5. Strict location filter applied to live marketplace when no specific corridor search is active
    if (!filters.fromCity && !filters.toCity && userCity) {
      if (!MarketplaceRelevanceService.isRelevantToCity(trip, userCity)) return false;
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

    // 2. Delivery date must not be in the past
    const todayStr = new Date().toISOString().slice(0, 10);
    if (parcel.deliveryDate && parcel.deliveryDate < todayStr) return false;

    // 3. Specific search filter matches
    if (filters.fromCity && !parcel.fromCity.toLowerCase().includes(filters.fromCity.toLowerCase())) return false;
    if (filters.toCity && !parcel.toCity.toLowerCase().includes(filters.toCity.toLowerCase())) return false;

    // 4. Strict location filter applied to live marketplace when no specific corridor search is active
    if (!filters.fromCity && !filters.toCity && userCity) {
      if (!MarketplaceRelevanceService.isRelevantToCity(parcel, userCity)) return false;
    }

    return true;
  });
}

export function flattenInfiniteData<T>(data: { pages: PaginatedResult<T>[] } | undefined): T[] {
  if (!data || !Array.isArray(data.pages)) return [];
  return data.pages.flatMap(page => Array.isArray(page?.items) ? page.items : []);
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

// Realtime: invalidate the banners cache whenever an admin publishes, toggles,
// or deletes a banner. Without this, mobile keeps the cached list for up to
// 5 minutes after a CMS change.
export function usePromotionalBannersRealtime(enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;
    const sb = getSupabaseClient();
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const invalidate = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (!mounted) return;
        queryClient.invalidateQueries({ queryKey: queryKeys.promotionalBanners });
      }, 400);
    };

    const channel = sb
      .channel(`promotional-banners:${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'promotional_banners' }, invalidate)
      .subscribe();

    return () => {
      mounted = false;
      if (debounceTimer) clearTimeout(debounceTimer);
      try {
        void sb.removeChannel(channel);
      } catch {}
    };
  }, [enabled, queryClient]);
}
