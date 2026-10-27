import { Trip, Parcel } from '@/types';
import { SortOption } from '@/hooks/useSmartSearch';

export type SearchItem =
  | { type: 'trip'; data: Trip }
  | { type: 'parcel'; data: Parcel };

export interface SearchFilterOptions {
  fromCity?: string;
  toCity?: string;
  vehicleType?: string;
  excludeUserId?: string;
}

export function filterSearchResults(
  trips: Trip[],
  parcels: Parcel[],
  options: SearchFilterOptions = {}
): {
  matchedTrips: Trip[];
  matchedParcels: Parcel[];
} {
  const from = (options.fromCity || '').trim().toLowerCase();
  const to = (options.toCity || '').trim().toLowerCase();
  const vehicle = (options.vehicleType || '').trim().toLowerCase();
  const excludeUserId = options.excludeUserId;

  const matchedTrips = trips.filter((t) => {
    if (t.status !== 'active') return false;
    if (excludeUserId && t.userId === excludeUserId) return false;
    if (from && !t.fromCity.toLowerCase().includes(from)) return false;
    if (to && !t.toCity.toLowerCase().includes(to)) return false;
    if (vehicle && t.vehicleType.toLowerCase() !== vehicle) return false;
    return true;
  });

  const matchedParcels = parcels.filter((p) => {
    if (p.status !== 'open') return false;
    if (excludeUserId && p.userId === excludeUserId) return false;
    if (from && !p.fromCity.toLowerCase().includes(from)) return false;
    if (to && !p.toCity.toLowerCase().includes(to)) return false;
    return true;
  });

  return { matchedTrips, matchedParcels };
}

export function sortSearchResults(
  items: SearchItem[],
  sortBy: SortOption
): SearchItem[] {
  return [...items].sort((a, b) => {
    switch (sortBy) {
      case 'price_low': {
        const priceA = a.type === 'trip' ? a.data.pricePerKg : a.data.priceOffer;
        const priceB = b.type === 'trip' ? b.data.pricePerKg : b.data.priceOffer;
        return priceA - priceB;
      }
      case 'price_high': {
        const priceA = a.type === 'trip' ? a.data.pricePerKg : a.data.priceOffer;
        const priceB = b.type === 'trip' ? b.data.pricePerKg : b.data.priceOffer;
        return priceB - priceA;
      }
      case 'rating_best': {
        const ratingA = a.type === 'trip' ? a.data.userRating || 0 : 0;
        const ratingB = b.type === 'trip' ? b.data.userRating || 0 : 0;
        return ratingB - ratingA;
      }
      case 'date_nearest': {
        const getDateMs = (item: SearchItem): number => {
          if (item.type === 'trip') {
            const d = new Date(item.data.date).getTime();
            return isNaN(d) ? new Date(item.data.createdAt).getTime() : d;
          } else {
            const d = item.data.deliveryDate ? new Date(item.data.deliveryDate).getTime() : NaN;
            return isNaN(d) ? new Date(item.data.createdAt).getTime() : d;
          }
        };
        const timeA = getDateMs(a);
        const timeB = getDateMs(b);
        return timeA - timeB;
      }
      default:
        return new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime();
    }
  });
}

export function formatRouteSubscriptionMessage(fromCity: string, toCity: string): {
  createdMessage: string;
  alreadySubscribedMessage: string;
} {
  const route = fromCity && toCity ? `${fromCity} → ${toCity}` : 'this corridor';
  return {
    createdMessage: `You'll be notified when trips or parcels appear on ${route}.`,
    alreadySubscribedMessage: `You already have an active alert for ${route}.`,
  };
}

export type WeightFilterRange = 'all' | 'under_2' | '2_5' | '5_10' | 'over_10';
export type TravelerSortOption = 'offer_high' | 'offer_low' | 'date_nearest' | 'weight_low';

export interface TravelerParcelFilterOptions {
  fromCity?: string;
  toCity?: string;
  travelDate?: string;
  weightRange?: WeightFilterRange;
  category?: string;
  excludeUserId?: string;
}

export function filterTravelerParcels(
  parcels: Parcel[],
  options: TravelerParcelFilterOptions = {}
): Parcel[] {
  const from = (options.fromCity || '').trim().toLowerCase();
  const to = (options.toCity || '').trim().toLowerCase();
  const travelDate = (options.travelDate || '').trim();
  const weightRange = options.weightRange || 'all';
  const category = (options.category || 'all').trim().toLowerCase();
  const excludeUserId = options.excludeUserId;

  return parcels.filter((p) => {
    // Only open parcels from senders
    if (p.status !== 'open') return false;

    // Exclude own parcels
    if (excludeUserId && p.userId === excludeUserId) return false;

    // City route matching (substring or case-insensitive)
    if (from && !p.fromCity.toLowerCase().includes(from)) return false;
    if (to && !p.toCity.toLowerCase().includes(to)) return false;

    // Weight range filter
    if (weightRange === 'under_2' && p.weight > 2) return false;
    if (weightRange === '2_5' && (p.weight <= 2 || p.weight > 5)) return false;
    if (weightRange === '5_10' && (p.weight <= 5 || p.weight > 10)) return false;
    if (weightRange === 'over_10' && p.weight <= 10) return false;

    // Category filter
    if (category !== 'all' && p.category.toLowerCase() !== category) return false;

    // Date of travel filter:
    // If the traveler travels on travelDate, parcel's delivery deadline should be on or after travelDate,
    // or same day, or flexible (no deliveryDate).
    if (travelDate && p.deliveryDate) {
      const pDate = p.deliveryDate.split('T')[0];
      const tDate = travelDate.split('T')[0];
      if (pDate < tDate) {
        return false;
      }
    }

    return true;
  });
}

export function sortTravelerParcels(
  parcels: Parcel[],
  sortBy: TravelerSortOption = 'offer_high'
): Parcel[] {
  return [...parcels].sort((a, b) => {
    switch (sortBy) {
      case 'offer_high':
        return b.priceOffer - a.priceOffer;
      case 'offer_low':
        return a.priceOffer - b.priceOffer;
      case 'weight_low':
        return a.weight - b.weight;
      case 'date_nearest': {
        const dateA = a.deliveryDate ? new Date(a.deliveryDate).getTime() : Infinity;
        const dateB = b.deliveryDate ? new Date(b.deliveryDate).getTime() : Infinity;
        if (dateA !== dateB) return dateA - dateB;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });
}

