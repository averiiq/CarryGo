import { Trip, Parcel } from '@/types';
import { getDistance, findCity } from '@/constants/indian-cities';

export interface MatchScore {
  total: number;
  breakdown: {
    routeScore: number;
    dateScore: number;
    capacityScore: number;
    priceScore: number;
    ratingScore: number;
    reliabilityScore: number;
  };
  grade: 'excellent' | 'good' | 'fair' | 'poor';
}

function routeCompatibility(trip: Trip, parcel: Parcel): number {
  if (trip.fromCity.toLowerCase() === parcel.fromCity.toLowerCase() &&
      trip.toCity.toLowerCase() === parcel.toCity.toLowerCase()) {
    return 100;
  }

  const tripFrom = findCity(trip.fromCity);
  const tripTo = findCity(trip.toCity);
  const parcelFrom = findCity(parcel.fromCity);
  const parcelTo = findCity(parcel.toCity);

  if (!tripFrom || !tripTo || !parcelFrom || !parcelTo) return 0;

  const fromDistance = getDistance(tripFrom, parcelFrom);
  const toDistance = getDistance(tripTo, parcelTo);

  if (fromDistance <= 50 && toDistance <= 50) return 80;
  if (fromDistance <= 100 && toDistance <= 100) return 60;
  if (fromDistance <= 200 && toDistance <= 200) return 30;
  return 0;
}

function dateAlignment(tripDate: string, parcelCreatedAt: string): number {
  const trip = new Date(tripDate).getTime();
  const parcel = new Date(parcelCreatedAt).getTime();
  const daysDiff = Math.abs(trip - parcel) / (1000 * 60 * 60 * 24);

  if (daysDiff <= 0) return 100;
  if (daysDiff <= 1) return 90;
  if (daysDiff <= 2) return 75;
  if (daysDiff <= 3) return 60;
  if (daysDiff <= 5) return 40;
  if (daysDiff <= 7) return 20;
  return 0;
}

function capacityFit(tripCapacity: number, parcelWeight: number): number {
  if (parcelWeight > tripCapacity) return 0;
  const utilizationRatio = parcelWeight / tripCapacity;
  if (utilizationRatio >= 0.5 && utilizationRatio <= 0.9) return 100;
  if (utilizationRatio >= 0.3) return 80;
  if (utilizationRatio >= 0.1) return 60;
  return 40;
}

function priceCompatibility(tripPricePerKg: number, parcelOffer: number, parcelWeight: number): number {
  const tripTotal = tripPricePerKg * parcelWeight;
  if (parcelOffer >= tripTotal) return 100;
  const ratio = parcelOffer / tripTotal;
  if (ratio >= 0.9) return 85;
  if (ratio >= 0.75) return 65;
  if (ratio >= 0.5) return 40;
  return 15;
}

function ratingScore(rating: number): number {
  if (rating >= 4.5) return 100;
  if (rating >= 4.0) return 80;
  if (rating >= 3.5) return 60;
  if (rating >= 3.0) return 40;
  return 20;
}

export function scoreMatch(trip: Trip, parcel: Parcel): MatchScore {
  const breakdown = {
    routeScore: routeCompatibility(trip, parcel),
    dateScore: dateAlignment(trip.date, parcel.createdAt),
    capacityScore: capacityFit(trip.availableCapacity, parcel.weight),
    priceScore: priceCompatibility(trip.pricePerKg, parcel.priceOffer, parcel.weight),
    ratingScore: ratingScore(trip.userRating),
    reliabilityScore: 70,
  };

  const weights = {
    routeScore: 0.30,
    dateScore: 0.20,
    capacityScore: 0.15,
    priceScore: 0.15,
    ratingScore: 0.10,
    reliabilityScore: 0.10,
  };

  const total = Math.round(
    breakdown.routeScore * weights.routeScore +
    breakdown.dateScore * weights.dateScore +
    breakdown.capacityScore * weights.capacityScore +
    breakdown.priceScore * weights.priceScore +
    breakdown.ratingScore * weights.ratingScore +
    breakdown.reliabilityScore * weights.reliabilityScore
  );

  const grade: MatchScore['grade'] =
    total >= 80 ? 'excellent' :
    total >= 60 ? 'good' :
    total >= 40 ? 'fair' : 'poor';

  return { total, breakdown, grade };
}

export function findBestMatches(
  parcel: Parcel,
  trips: Trip[],
  options?: { minScore?: number; limit?: number }
): Array<{ trip: Trip; score: MatchScore }> {
  const minScore = options?.minScore ?? 20;
  const limit = options?.limit ?? 20;

  const scored = trips
    .filter(t => t.userId !== parcel.userId && t.status === 'active')
    .map(trip => ({ trip, score: scoreMatch(trip, parcel) }))
    .filter(m => m.score.total >= minScore)
    .sort((a, b) => b.score.total - a.score.total)
    .slice(0, limit);

  return scored;
}
