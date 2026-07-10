import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTrips } from '@/services/trips.service';
import { fetchParcels } from '@/services/parcels.service';
import { Trip, Parcel, VehicleType } from '@/types';
import { INDIAN_CITIES } from '@/constants/indian-cities';
import { calculateRouteDistance } from '@/services/route-intelligence.service';
import { useDebounce } from './useDebounce';

export type SortOption =
  | 'price_low'
  | 'price_high'
  | 'date_nearest'
  | 'rating_best'
  | 'distance_shortest';

export interface SmartSearchFilters {
  fromCity: string;
  toCity: string;
  dateFrom: string;
  dateTo: string;
  vehicleType: VehicleType | '';
  weightMin: number;
  weightMax: number;
  priceMin: number;
  priceMax: number;
  ratingMin: number;
}

export interface SmartSearchResult {
  type: 'trip' | 'parcel';
  item: Trip | Parcel;
  distance: number | null;
}

interface SmartSearchReturn {
  results: SmartSearchResult[];
  totalCount: number;
  isLoading: boolean;
  suggestions: string[];
  filters: SmartSearchFilters;
  sortBy: SortOption;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<SmartSearchFilters>) => void;
  setSortBy: (sort: SortOption) => void;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  hasMore: boolean;
}

const DEFAULT_FILTERS: SmartSearchFilters = {
  fromCity: '',
  toCity: '',
  dateFrom: '',
  dateTo: '',
  vehicleType: '',
  weightMin: 0,
  weightMax: 50,
  priceMin: 0,
  priceMax: 10000,
  ratingMin: 0,
};

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 300;

export function useSmartSearch(enabled = true): SmartSearchReturn {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFiltersState] = useState<SmartSearchFilters>(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState<SortOption>('date_nearest');
  const [page, setPage] = useState(1);

  const debouncedQuery = useDebounce(searchQuery, DEBOUNCE_MS);

  const setFilters = useCallback((partial: Partial<SmartSearchFilters>) => {
    setFiltersState(prev => ({ ...prev, ...partial }));
    setPage(1);
  }, []);

  // Autocomplete suggestions based on search query
  const suggestions = useMemo(() => {
    if (debouncedQuery.length < 1) return [];
    const lower = debouncedQuery.toLowerCase();
    return INDIAN_CITIES
      .filter(c => c.name.toLowerCase().includes(lower))
      .map(c => c.name)
      .slice(0, 8);
  }, [debouncedQuery]);

  const fetchLimit = PAGE_SIZE * 5;

  // Fetch trips with server-side pagination
  const tripsQuery = useQuery<{ items: Trip[]; total: number }>({
    queryKey: ['smartSearch', 'trips', filters.fromCity, filters.toCity, page],
    enabled,
    queryFn: async () => {
      const { data, total } = await fetchTrips({
        fromCity: filters.fromCity || undefined,
        toCity: filters.toCity || undefined,
        limit: fetchLimit,
        offset: 0,
      });
      return { items: data ?? [], total };
    },
    staleTime: 60_000,
  });

  // Fetch parcels with server-side pagination
  const parcelsQuery = useQuery<{ items: Parcel[]; total: number }>({
    queryKey: ['smartSearch', 'parcels', filters.fromCity, filters.toCity, page],
    enabled,
    queryFn: async () => {
      const { data, total } = await fetchParcels({
        fromCity: filters.fromCity || undefined,
        toCity: filters.toCity || undefined,
        limit: fetchLimit,
        offset: 0,
      });
      return { items: data ?? [], total };
    },
    staleTime: 60_000,
  });

  const filteredAndSorted = useMemo(() => {
    const trips = (tripsQuery.data?.items ?? []).filter(t => t.status === 'active');
    const parcels = (parcelsQuery.data?.items ?? []).filter(p => p.status === 'open');

    // Apply filters to trips
    const filteredTrips: SmartSearchResult[] = trips
      .filter(t => {
        if (filters.vehicleType && t.vehicleType !== filters.vehicleType) return false;
        if (filters.dateFrom && t.date < filters.dateFrom) return false;
        if (filters.dateTo && t.date > filters.dateTo) return false;
        if (filters.priceMin && t.pricePerKg < filters.priceMin) return false;
        if (filters.priceMax && t.pricePerKg > filters.priceMax) return false;
        if (filters.ratingMin && t.userRating < filters.ratingMin) return false;
        return true;
      })
      .map(t => ({
        type: 'trip' as const,
        item: t,
        distance: calculateRouteDistance(t.fromCity, t.toCity),
      }));

    // Apply filters to parcels
    const filteredParcels: SmartSearchResult[] = parcels
      .filter(p => {
        if (filters.priceMin && p.priceOffer < filters.priceMin) return false;
        if (filters.priceMax && p.priceOffer > filters.priceMax) return false;
        if (filters.weightMin && p.weight < filters.weightMin) return false;
        if (filters.weightMax && p.weight > filters.weightMax) return false;
        return true;
      })
      .map(p => ({
        type: 'parcel' as const,
        item: p,
        distance: calculateRouteDistance(p.fromCity, p.toCity),
      }));

    const combined = [...filteredTrips, ...filteredParcels];

    // Sort
    combined.sort((a, b) => {
      switch (sortBy) {
        case 'price_low': {
          const priceA = a.type === 'trip' ? (a.item as Trip).pricePerKg : (a.item as Parcel).priceOffer;
          const priceB = b.type === 'trip' ? (b.item as Trip).pricePerKg : (b.item as Parcel).priceOffer;
          return priceA - priceB;
        }
        case 'price_high': {
          const priceA = a.type === 'trip' ? (a.item as Trip).pricePerKg : (a.item as Parcel).priceOffer;
          const priceB = b.type === 'trip' ? (b.item as Trip).pricePerKg : (b.item as Parcel).priceOffer;
          return priceB - priceA;
        }
        case 'date_nearest': {
          const dateA = a.type === 'trip' ? (a.item as Trip).date : a.item.createdAt;
          const dateB = b.type === 'trip' ? (b.item as Trip).date : b.item.createdAt;
          return new Date(dateA).getTime() - new Date(dateB).getTime();
        }
        case 'rating_best': {
          const ratingA = a.type === 'trip' ? (a.item as Trip).userRating : 0;
          const ratingB = b.type === 'trip' ? (b.item as Trip).userRating : 0;
          return ratingB - ratingA;
        }
        case 'distance_shortest': {
          return (a.distance ?? Infinity) - (b.distance ?? Infinity);
        }
        default:
          return 0;
      }
    });

    return combined;
  }, [tripsQuery.data, parcelsQuery.data, filters, sortBy]);

  // Paginate
  const totalCount = filteredAndSorted.length;
  const startIdx = (page - 1) * PAGE_SIZE;
  const results = filteredAndSorted.slice(startIdx, startIdx + PAGE_SIZE);
  const hasMore = startIdx + PAGE_SIZE < totalCount;

  return {
    results,
    totalCount,
    isLoading: tripsQuery.isLoading || parcelsQuery.isLoading,
    suggestions,
    filters,
    sortBy,
    searchQuery,
    setSearchQuery,
    setFilters,
    setSortBy,
    page,
    setPage,
    pageSize: PAGE_SIZE,
    hasMore,
  };
}
