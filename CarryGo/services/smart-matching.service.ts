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

export interface RankedTripMatch {
  trip: Trip;
  score: MatchScore;
}

export interface RankedParcelMatch {
  parcel: Parcel;
  score: MatchScore;
}

const ROUTE_SUFFIXES = [' ncr', ' city', ' district'];

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function distanceDecayScore(distanceKm: number, decayKm: number): number {
  return clampScore(100 * Math.exp(-(Math.max(distanceKm, 0) / Math.max(decayKm, 1))));
}

function detourScore(detourRatio: number): number {
  if (detourRatio <= 0.10) return 100;
  if (detourRatio <= 0.20) return 85;
  if (detourRatio <= 0.35) return 70;
  if (detourRatio <= 0.50) return 50;
  if (detourRatio <= 0.75) return 30;
  return 10;
}

function calculateBearing(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLng = toRad(to.lng - from.lng);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  const bearing = toDeg(Math.atan2(y, x));
  return (bearing + 360) % 360;
}

function directionAlignmentScore(
  tripFrom: { lat: number; lng: number },
  tripTo: { lat: number; lng: number },
  parcelFrom: { lat: number; lng: number },
  parcelTo: { lat: number; lng: number },
): number {
  const tripBearing = calculateBearing(tripFrom, tripTo);
  const parcelBearing = calculateBearing(parcelFrom, parcelTo);
  const rawDiff = Math.abs(tripBearing - parcelBearing);
  const bearingDiff = Math.min(rawDiff, 360 - rawDiff);

  if (bearingDiff <= 20) return 100;
  if (bearingDiff <= 45) return 85;
  if (bearingDiff <= 70) return 65;
  if (bearingDiff <= 100) return 40;
  return 15;
}

function normalizeCityName(value: string): string {
  let normalized = value
    .toLowerCase()
    .replace(/[._]/g, ' ')
    .replace(/[()]/g, ' ')
    .replace(/[^a-z0-9,\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (normalized.includes(',')) {
    normalized = normalized.split(',')[0].trim();
  }

  for (const suffix of ROUTE_SUFFIXES) {
    if (normalized.endsWith(suffix)) {
      normalized = normalized.slice(0, -suffix.length).trim();
      break;
    }
  }

  return normalized;
}

function areCitiesEquivalent(left: string, right: string): boolean {
  const leftKey = normalizeCityName(left);
  const rightKey = normalizeCityName(right);

  if (!leftKey || !rightKey) return false;
  if (leftKey === rightKey) return true;

  const leftCity = findCity(leftKey);
  const rightCity = findCity(rightKey);
  const leftCanonical = leftCity ? normalizeCityName(leftCity.name) : leftKey;
  const rightCanonical = rightCity ? normalizeCityName(rightCity.name) : rightKey;

  return leftCanonical === rightCanonical;
}

function routeCompatibility(trip: Trip, parcel: Parcel): number {
  const fromExact = areCitiesEquivalent(trip.fromCity, parcel.fromCity);
  const toExact = areCitiesEquivalent(trip.toCity, parcel.toCity);

  if (fromExact && toExact) {
    return 100;
  }

  const tripFrom = findCity(normalizeCityName(trip.fromCity));
  const tripTo = findCity(normalizeCityName(trip.toCity));
  const parcelFrom = findCity(normalizeCityName(parcel.fromCity));
  const parcelTo = findCity(normalizeCityName(parcel.toCity));

  if (!tripFrom || !tripTo || !parcelFrom || !parcelTo) {
    return fromExact || toExact ? 40 : 0;
  }

  const fromDistance = getDistance(tripFrom, parcelFrom);
  const toDistance = getDistance(tripTo, parcelTo);

  const legacyBandScore =
    fromDistance <= 50 && toDistance <= 50 ? 80 :
    fromDistance <= 100 && toDistance <= 100 ? 60 :
    fromDistance <= 200 && toDistance <= 200 ? 30 : 0;

  const pickupProximityScore = distanceDecayScore(fromDistance, 80);
  const dropoffProximityScore = distanceDecayScore(toDistance, 80);

  const baseRouteDistance = Math.max(getDistance(tripFrom, tripTo), 1);
  const routeWithParcel =
    getDistance(tripFrom, parcelFrom) +
    getDistance(parcelFrom, parcelTo) +
    getDistance(parcelTo, tripTo);
  const extraDetour = Math.max(routeWithParcel - baseRouteDistance, 0);
  const detourRatio = extraDetour / baseRouteDistance;

  const dispatchScore = clampScore(
    pickupProximityScore * 0.30 +
    dropoffProximityScore * 0.30 +
    detourScore(detourRatio) * 0.25 +
    directionAlignmentScore(tripFrom, tripTo, parcelFrom, parcelTo) * 0.15,
  );

  const finalRouteScore = clampScore(legacyBandScore * 0.55 + dispatchScore * 0.45);

  if (finalRouteScore === 0 && (fromExact || toExact)) {
    return 40;
  }

  return finalRouteScore;
}

function dateAlignment(tripDate: string, parcelCreatedAt: string, parcelDeliveryDate?: string): number {
  const trip = new Date(tripDate).getTime();
  const parcelReference = new Date(parcelCreatedAt).getTime();
  const daysDiff = Math.abs(trip - parcelReference) / (1000 * 60 * 60 * 24);

  if (parcelDeliveryDate) {
    const deadline = new Date(parcelDeliveryDate).getTime();
    const daysAfterDeadline = (trip - deadline) / (1000 * 60 * 60 * 24);
    if (daysAfterDeadline > 1) return 0;
    if (daysAfterDeadline > 0) return 30;
    if (daysAfterDeadline >= -1) return 100;
  }

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
    dateScore: dateAlignment(trip.date, parcel.createdAt, parcel.deliveryDate),
    capacityScore: capacityFit(trip.availableCapacity, parcel.weight),
    priceScore: priceCompatibility(trip.pricePerKg, parcel.priceOffer, parcel.weight),
    ratingScore: ratingScore(trip.userRating),
    reliabilityScore: 70,
  };

  const deadlineGapDays = parcel.deliveryDate
    ? (new Date(parcel.deliveryDate).getTime() - new Date(trip.date).getTime()) / (1000 * 60 * 60 * 24)
    : null;

  const isUrgentDispatch = deadlineGapDays !== null && deadlineGapDays <= 1;

  const weights = isUrgentDispatch ? {
    routeScore: 0.35,
    dateScore: 0.27,
    capacityScore: 0.14,
    priceScore: 0.09,
    ratingScore: 0.08,
    reliabilityScore: 0.07,
  } : {
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
): RankedTripMatch[] {
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

export function findBestParcelsForTrip(
  trip: Trip,
  parcels: Parcel[],
  options?: { minScore?: number; limit?: number }
): RankedParcelMatch[] {
  const minScore = options?.minScore ?? 20;
  const limit = options?.limit ?? 20;

  const scored = parcels
    .filter(parcel => parcel.userId !== trip.userId && parcel.status === 'open' && parcel.weight <= trip.availableCapacity)
    .map(parcel => ({ parcel, score: scoreMatch(trip, parcel) }))
    .filter(match => match.score.total >= minScore)
    .sort((left, right) => right.score.total - left.score.total)
    .slice(0, limit);

  return scored;
}
