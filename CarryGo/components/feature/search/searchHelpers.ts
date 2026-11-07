import { Trip, Parcel } from '@/types';
import { SortOption } from '@/hooks/useSmartSearch';

export type SearchItem =
  | { type: 'trip'; data: Trip }
  | { type: 'parcel'; data: Parcel };

export interface SearchFilterOptions {
  fromCity?: string;
  toCity?: string;
  vehicleType?: string;
  vehicleTypes?: string[];
  minCapacityKg?: number;
  dateWindow?: 'all' | 'today' | 'tomorrow' | 'week';
  verifiedOnly?: boolean;
  maxPrice?: number;
  excludeUserId?: string;
}

export function isDateInWindow(
  dateStr: string | undefined | null,
  window: 'all' | 'today' | 'tomorrow' | 'week' = 'all'
): boolean {
  if (window === 'all' || !dateStr) return true;
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return true;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfToday = startOfToday + 24 * 60 * 60 * 1000 - 1;
  const endOfTomorrow = endOfToday + 24 * 60 * 60 * 1000;
  const endOfWeek = startOfToday + 7 * 24 * 60 * 60 * 1000;
  const targetTime = target.getTime();

  if (window === 'today') {
    return targetTime >= startOfToday && targetTime <= endOfToday;
  }
  if (window === 'tomorrow') {
    return targetTime > endOfToday && targetTime <= endOfTomorrow;
  }
  if (window === 'week') {
    return targetTime >= startOfToday && targetTime <= endOfWeek;
  }
  return true;
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
  const singleVehicle = (options.vehicleType || '').trim().toLowerCase();
  const vehicles = (options.vehicleTypes || []).map((v) => v.trim().toLowerCase());
  const excludeUserId = options.excludeUserId;
  const minCap = options.minCapacityKg || 0;
  const dateWindow = options.dateWindow || 'all';
  const verifiedOnly = Boolean(options.verifiedOnly);
  const maxPrice = options.maxPrice;

  const matchedTrips = trips.filter((t) => {
    if (t.status !== 'active') return false;
    if (excludeUserId && t.userId === excludeUserId) return false;
    if (from && !t.fromCity.toLowerCase().includes(from)) return false;
    if (to && !t.toCity.toLowerCase().includes(to)) return false;

    // Vehicle check (support both single vehicle filter and multi vehicleTypes filter)
    if (singleVehicle && t.vehicleType.toLowerCase() !== singleVehicle) return false;
    if (vehicles.length > 0 && !vehicles.includes(t.vehicleType.toLowerCase())) return false;

    // Minimum capacity check
    if (minCap > 0 && (t.availableCapacity || 0) < minCap) return false;

    // Date window check
    if (!isDateInWindow(t.date, dateWindow)) return false;

    // Verified check
    if (verifiedOnly && !(t as any).isKycVerified && !(t as any).userIsKycVerified) return false;

    // Max price per kg
    if (maxPrice !== undefined && (t.pricePerKg || 0) > maxPrice) return false;

    return true;
  });

  const matchedParcels = parcels.filter((p) => {
    if (p.status !== 'open') return false;
    if (excludeUserId && p.userId === excludeUserId) return false;
    if (from && !p.fromCity.toLowerCase().includes(from)) return false;
    if (to && !p.toCity.toLowerCase().includes(to)) return false;

    // Minimum capacity / weight check: for parcels, parcel weight must not exceed minCap if minCap is set
    if (minCap > 0 && (p.weight || 0) > minCap) return false;

    // Date window check
    if (!isDateInWindow(p.deliveryDate || p.createdAt, dateWindow)) return false;

    // Max delivery fee offer
    if (maxPrice !== undefined && (p.priceOffer || 0) > maxPrice) return false;

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
