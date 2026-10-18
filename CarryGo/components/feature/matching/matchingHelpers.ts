import type { Trip, Request } from '@/types';

export type MatchSortOption = 'match' | 'price' | 'rating' | 'capacity';

/**
 * Sorts matching trips based on the chosen sort option.
 */
export function sortMatchingTrips(trips: Trip[], sortBy: MatchSortOption): Trip[] {
  if (sortBy === 'match') {
    return [...trips];
  }
  return [...trips].sort((a, b) => {
    if (sortBy === 'price') return (a.pricePerKg || 0) - (b.pricePerKg || 0);
    if (sortBy === 'rating') return (b.userRating || 0) - (a.userRating || 0);
    if (sortBy === 'capacity') return (b.availableCapacity || 0) - (a.availableCapacity || 0);
    return 0;
  });
}

/**
 * Calculates delivery price for a matching trip, enforcing a minimum floor of ₹50.
 */
export function calculateMatchPrice(pricePerKg: number, weight: number): number {
  const safeRate = Number.isFinite(pricePerKg) && pricePerKg > 0 ? pricePerKg : 50;
  const safeWeight = Number.isFinite(weight) && weight > 0 ? weight : 1;
  return Math.max(50, Math.round(safeRate * safeWeight));
}

/**
 * Formats parcel summary metadata string with INR (₹) symbol.
 */
export function formatMatchSummary(category?: string, weight?: number, price?: number): string {
  const parts: string[] = [];
  if (category && category.trim()) {
    const capitalized = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
    parts.push(capitalized);
  }
  if (weight && weight > 0) {
    parts.push(`${weight}kg`);
  }
  if (price !== undefined && price !== null) {
    parts.push(`₹${price.toLocaleString('en-IN')} budget`);
  }
  return parts.length > 0 ? parts.join(' · ') : 'Route details';
}

/**
 * Builds a lookup map for existing requests indexed by tripId.
 * Prioritizes 'accepted' requests over 'pending' requests.
 */
export function buildRequestsByTripMap(requests: Request[] = []): Map<string, Request> {
  const map = new Map<string, Request>();
  requests.forEach((req) => {
    if (req.tripId) {
      const prev = map.get(req.tripId);
      if (!prev || req.status === 'accepted' || (req.status === 'pending' && prev.status !== 'accepted')) {
        map.set(req.tripId, req);
      }
    }
  });
  return map;
}

/**
 * Formats header route labels.
 */
export function formatMatchHeaderRoute(fromCity?: string, toCity?: string): { from: string; to: string } {
  return {
    from: fromCity?.trim() || 'Route',
    to: toCity?.trim() || 'Details',
  };
}
