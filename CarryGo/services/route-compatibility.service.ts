import { Trip, Parcel } from '@/types';
import { findCity, getDistance, IndianCity } from '@/constants/indian-cities';

export interface RouteEndpoint {
  cityName: string;
  lat?: number;
  lng?: number;
}

export interface RouteDescriptor {
  origin: RouteEndpoint;
  destination: RouteEndpoint;
}

export type RejectionReasonCode =
  | 'ORIGIN_TOO_FAR'
  | 'DESTINATION_TOO_FAR'
  | 'DETOUR_TOO_LARGE'
  | 'DIRECTION_MISALIGNED'
  | 'CITY_NOT_FOUND'
  | 'REVERSE_DIRECTION'
  | 'IDENTICAL_ENDPOINTS';

export interface RouteCompatibilityResult {
  isCompatible: boolean;
  rejectionCode?: RejectionReasonCode;
  rejectionReason?: string;
  confidence: number; // 0 to 1
  originMatch: {
    isCompatible: boolean;
    distanceKm: number;
    isExact: boolean;
    score: number; // 0 - 100
  };
  destinationMatch: {
    isCompatible: boolean;
    distanceKm: number;
    isExact: boolean;
    score: number; // 0 - 100
  };
  routeOverlap: {
    isCompatible: boolean;
    detourKm: number;
    detourPercentage: number;
    directionCosine: number;
    isIntermediateDropoff: boolean;
    isIntermediatePickup: boolean;
    score: number; // 0 - 100
  };
  overallRouteScore: number; // 0 - 100 (0 if isCompatible === false)
}

// ── Threshold Constants ──────────────────────────────────────────────────────
export const MAX_PICKUP_DISTANCE_KM = 35;
export const MAX_DROPOFF_DISTANCE_KM = 35;
export const MAX_ALLOWED_DETOUR_RATIO = 0.35; // 35% max detour for corridor fits
export const MIN_DIRECTION_COSINE = 0.40;     // ~66 degree max deviation

const ROUTE_SUFFIX_REGEX = /(,| ncr| city| district| cantt| rural| urban).*/i;

export function normalizeCityName(city: string): string {
  if (!city) return '';
  return city.trim().toLowerCase().replace(ROUTE_SUFFIX_REGEX, '').trim();
}

export function areCitiesEquivalent(cityA: string, cityB: string): boolean {
  if (!cityA || !cityB) return false;
  const aNorm = normalizeCityName(cityA);
  const bNorm = normalizeCityName(cityB);
  if (aNorm === bNorm) return true;

  const cityObjA = findCity(aNorm);
  const cityObjB = findCity(bNorm);

  if (cityObjA && cityObjB) {
    if (normalizeCityName(cityObjA.name) === normalizeCityName(cityObjB.name)) return true;
    // Check distance between them — if within 12km (like Delhi/New Delhi or twin towns)
    return getDistance(cityObjA, cityObjB) <= 12;
  }

  return false;
}

/**
 * Calculates vector dot product cosine similarity between two routes.
 * Direction 1: Traveler (X -> Y)
 * Direction 2: Parcel (A -> B)
 * Cosine = 1.0 (exact same direction), 0.0 (perpendicular), -1.0 (opposite/reverse).
 */
export function calculateDirectionCosine(
  origin1: IndianCity,
  dest1: IndianCity,
  origin2: IndianCity,
  dest2: IndianCity
): number {
  const dLat1 = dest1.lat - origin1.lat;
  const dLng1 = dest1.lng - origin1.lng;
  const dLat2 = dest2.lat - origin2.lat;
  const dLng2 = dest2.lng - origin2.lng;

  const mag1 = Math.sqrt(dLat1 * dLat1 + dLng1 * dLng1);
  const mag2 = Math.sqrt(dLat2 * dLat2 + dLng2 * dLng2);

  if (mag1 === 0 || mag2 === 0) return 0;
  const dot = dLat1 * dLat2 + dLng1 * dLng2;
  return Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
}

/**
 * Checks if point P lies roughly along the segment between Start and End.
 * Returns true if detour required to visit P is within tolerance.
 */
function isPointAlongPath(
  start: IndianCity,
  end: IndianCity,
  point: IndianCity,
  maxDetourKm: number = 20,
  maxCrossTrackKm: number = 25
): boolean {
  const c = getDistance(start, end);
  if (c <= 0) return false;
  const a = getDistance(start, point);
  const b = getDistance(point, end);

  // Point must strictly lie between start and end (cannot be past endpoints)
  if (a >= c || b >= c) return false;

  // Absolute detour cannot exceed maxDetourKm
  const detourKm = a + b - c;
  if (detourKm > maxDetourKm) return false;

  // Cross-track distance (perpendicular offset from segment)
  const s = (a + b + c) / 2;
  const areaSq = Math.max(0, s * (s - a) * (s - b) * (s - c));
  const crossTrackKm = (2 * Math.sqrt(areaSq)) / c;

  return crossTrackKm <= maxCrossTrackKm;
}

/**
 * Core Route Compatibility Engine:
 * Compares a Traveler's route (X -> Y) with a Parcel's delivery journey (A -> B).
 *
 * Enforces hard eligibility:
 * 1. Must satisfy Pickup (near origin A or on-route pickup)
 * 2. Must satisfy Dropoff (near destination B or on-route dropoff)
 * 3. Must not exceed maximum allowed detour
 * 4. Must not be reverse direction
 */
export function checkRouteCompatibility(
  tripOrigin: string,
  tripDestination: string,
  parcelOrigin: string,
  parcelDestination: string
): RouteCompatibilityResult {
  const fromExact = areCitiesEquivalent(tripOrigin, parcelOrigin);
  const toExact = areCitiesEquivalent(tripDestination, parcelDestination);

  // 1. Direct Exact Route Match
  if (fromExact && toExact) {
    return {
      isCompatible: true,
      confidence: 1.0,
      originMatch: { isCompatible: true, distanceKm: 0, isExact: true, score: 100 },
      destinationMatch: { isCompatible: true, distanceKm: 0, isExact: true, score: 100 },
      routeOverlap: {
        isCompatible: true,
        detourKm: 0,
        detourPercentage: 0,
        directionCosine: 1.0,
        isIntermediateDropoff: false,
        isIntermediatePickup: false,
        score: 100,
      },
      overallRouteScore: 100,
    };
  }

  // 2. Check for reverse route (e.g. Hisar -> Bhiwani vs Bhiwani -> Hisar)
  const isReverseRoute =
    areCitiesEquivalent(tripOrigin, parcelDestination) &&
    areCitiesEquivalent(tripDestination, parcelOrigin);

  if (isReverseRoute) {
    return {
      isCompatible: false,
      rejectionCode: 'REVERSE_DIRECTION',
      rejectionReason: 'Traveler is traveling in the opposite direction of this parcel',
      confidence: 0,
      originMatch: { isCompatible: false, distanceKm: 999, isExact: false, score: 0 },
      destinationMatch: { isCompatible: false, distanceKm: 999, isExact: false, score: 0 },
      routeOverlap: {
        isCompatible: false,
        detourKm: 999,
        detourPercentage: 100,
        directionCosine: -1.0,
        isIntermediateDropoff: false,
        isIntermediatePickup: false,
        score: 0,
      },
      overallRouteScore: 0,
    };
  }

  // 3. Resolve Coordinates
  const tripStart = findCity(tripOrigin);
  const tripEnd = findCity(tripDestination);
  const parcelStart = findCity(parcelOrigin);
  const parcelEnd = findCity(parcelDestination);

  // If cities cannot be geocoded, we can ONLY allow exact normalized string matches
  if (!tripStart || !tripEnd || !parcelStart || !parcelEnd) {
    if (fromExact && toExact) {
      return {
        isCompatible: true,
        confidence: 0.9,
        originMatch: { isCompatible: true, distanceKm: 0, isExact: true, score: 100 },
        destinationMatch: { isCompatible: true, distanceKm: 0, isExact: true, score: 100 },
        routeOverlap: {
          isCompatible: true,
          detourKm: 0,
          detourPercentage: 0,
          directionCosine: 1.0,
          isIntermediateDropoff: false,
          isIntermediatePickup: false,
          score: 100,
        },
        overallRouteScore: 90,
      };
    }

    return {
      isCompatible: false,
      rejectionCode: 'CITY_NOT_FOUND',
      rejectionReason: 'Unable to calculate route distance for unverified city coordinates',
      confidence: 0,
      originMatch: { isCompatible: fromExact, distanceKm: fromExact ? 0 : 999, isExact: fromExact, score: fromExact ? 100 : 0 },
      destinationMatch: { isCompatible: toExact, distanceKm: toExact ? 0 : 999, isExact: toExact, score: toExact ? 100 : 0 },
      routeOverlap: {
        isCompatible: false,
        detourKm: 999,
        detourPercentage: 100,
        directionCosine: 0,
        isIntermediateDropoff: false,
        isIntermediatePickup: false,
        score: 0,
      },
      overallRouteScore: 0,
    };
  }

  // 4. Distances & Proximity Calculations
  const originDistKm = fromExact ? 0 : getDistance(tripStart, parcelStart);
  const destDistKm = toExact ? 0 : getDistance(tripEnd, parcelEnd);
  const directTripDistKm = Math.max(getDistance(tripStart, tripEnd), 1);
  const parcelDistKm = getDistance(parcelStart, parcelEnd);

  // Vector Direction Alignment
  const directionCosine = calculateDirectionCosine(tripStart, tripEnd, parcelStart, parcelEnd);

  // Check for intermediate drop-off (Traveler X -> Y passes through or near Parcel Destination B)
  // E.g. Traveler: Hisar -> Delhi (~165km). Parcel: Hisar -> Rohtak (~90km). Rohtak is directly on the way!
  const isIntermediateDropoff =
    fromExact &&
    !toExact &&
    isPointAlongPath(tripStart, tripEnd, parcelEnd, 20, 25);

  // Check for intermediate pick-up (Traveler X -> Y starts earlier, picks up Parcel at A on the way to Y)
  // E.g. Traveler: Hisar -> Delhi. Parcel: Rohtak -> Delhi.
  const isIntermediatePickup =
    !fromExact &&
    toExact &&
    isPointAlongPath(tripStart, tripEnd, parcelStart, 20, 25);

  // Hard Origin Check:
  const isOriginEligible =
    fromExact ||
    originDistKm <= MAX_PICKUP_DISTANCE_KM ||
    isIntermediatePickup;

  // Hard Destination Check:
  const isDestinationEligible =
    toExact ||
    destDistKm <= MAX_DROPOFF_DISTANCE_KM ||
    isIntermediateDropoff;

  if (!isOriginEligible) {
    return {
      isCompatible: false,
      rejectionCode: 'ORIGIN_TOO_FAR',
      rejectionReason: `Pickup location is ${Math.round(originDistKm)} km away from traveler origin (max ${MAX_PICKUP_DISTANCE_KM} km)`,
      confidence: 0,
      originMatch: { isCompatible: false, distanceKm: originDistKm, isExact: false, score: 0 },
      destinationMatch: { isCompatible: isDestinationEligible, distanceKm: destDistKm, isExact: toExact, score: toExact ? 100 : Math.max(0, 100 - destDistKm * 2.5) },
      routeOverlap: {
        isCompatible: false,
        detourKm: originDistKm,
        detourPercentage: (originDistKm / directTripDistKm) * 100,
        directionCosine,
        isIntermediateDropoff,
        isIntermediatePickup,
        score: 0,
      },
      overallRouteScore: 0,
    };
  }

  if (!isDestinationEligible) {
    return {
      isCompatible: false,
      rejectionCode: 'DESTINATION_TOO_FAR',
      rejectionReason: `Dropoff location is ${Math.round(destDistKm)} km away from traveler destination (max ${MAX_DROPOFF_DISTANCE_KM} km)`,
      confidence: 0,
      originMatch: { isCompatible: true, distanceKm: originDistKm, isExact: fromExact, score: fromExact ? 100 : Math.max(0, 100 - originDistKm * 2.5) },
      destinationMatch: { isCompatible: false, distanceKm: destDistKm, isExact: false, score: 0 },
      routeOverlap: {
        isCompatible: false,
        detourKm: destDistKm,
        detourPercentage: (destDistKm / directTripDistKm) * 100,
        directionCosine,
        isIntermediateDropoff,
        isIntermediatePickup,
        score: 0,
      },
      overallRouteScore: 0,
    };
  }

  // 5. Detour & Corridor Overlap Evaluation
  const actualDeliveryRouteDistKm =
    (fromExact ? 0 : originDistKm) +
    parcelDistKm +
    (isIntermediateDropoff ? getDistance(parcelEnd, tripEnd) : (toExact ? 0 : destDistKm));

  const totalDetourKm = Math.max(0, actualDeliveryRouteDistKm - directTripDistKm);
  const detourRatio = totalDetourKm / directTripDistKm;

  // If detour is excessively high (> 35%) and neither endpoint is an exact match, reject!
  const isDetourPermissible =
    (fromExact && toExact) ||
    isIntermediateDropoff ||
    isIntermediatePickup ||
    detourRatio <= MAX_ALLOWED_DETOUR_RATIO;

  if (!isDetourPermissible) {
    return {
      isCompatible: false,
      rejectionCode: 'DETOUR_TOO_LARGE',
      rejectionReason: `Route requires a ${Math.round(detourRatio * 100)}% detour, exceeding the 35% limit`,
      confidence: 0,
      originMatch: { isCompatible: true, distanceKm: originDistKm, isExact: fromExact, score: Math.max(0, 100 - originDistKm * 2.5) },
      destinationMatch: { isCompatible: true, distanceKm: destDistKm, isExact: toExact, score: Math.max(0, 100 - destDistKm * 2.5) },
      routeOverlap: {
        isCompatible: false,
        detourKm: totalDetourKm,
        detourPercentage: Math.round(detourRatio * 100),
        directionCosine,
        isIntermediateDropoff,
        isIntermediatePickup,
        score: 0,
      },
      overallRouteScore: 0,
    };
  }

  // 6. Direction Alignment
  // Must travel in the same general direction unless both endpoints are within 15km
  if (directionCosine < MIN_DIRECTION_COSINE && !(fromExact && toExact)) {
    return {
      isCompatible: false,
      rejectionCode: 'DIRECTION_MISALIGNED',
      rejectionReason: 'Traveler is not traveling in the direction of the delivery destination',
      confidence: 0,
      originMatch: { isCompatible: true, distanceKm: originDistKm, isExact: fromExact, score: Math.max(0, 100 - originDistKm * 2.5) },
      destinationMatch: { isCompatible: true, distanceKm: destDistKm, isExact: toExact, score: Math.max(0, 100 - destDistKm * 2.5) },
      routeOverlap: {
        isCompatible: false,
        detourKm: totalDetourKm,
        detourPercentage: Math.round(detourRatio * 100),
        directionCosine,
        isIntermediateDropoff,
        isIntermediatePickup,
        score: 0,
      },
      overallRouteScore: 0,
    };
  }

  // 7. Calculate Continuous Scores for Valid Match
  const originScore = fromExact ? 100 : Math.max(0, Math.round(100 - (originDistKm / MAX_PICKUP_DISTANCE_KM) * 45));
  const destScore = toExact
    ? 100
    : isIntermediateDropoff
      ? 90
      : Math.max(0, Math.round(100 - (destDistKm / MAX_DROPOFF_DISTANCE_KM) * 45));

  const detourScore = Math.max(0, Math.round(100 - (detourRatio / MAX_ALLOWED_DETOUR_RATIO) * 50));
  const directionScore = Math.max(0, Math.round(directionCosine * 100));

  const overallRouteScore = Math.round(
    originScore * 0.35 +
    destScore * 0.35 +
    detourScore * 0.20 +
    directionScore * 0.10
  );

  return {
    isCompatible: true,
    confidence: Math.round(overallRouteScore / 10) / 10,
    originMatch: {
      isCompatible: true,
      distanceKm: originDistKm,
      isExact: fromExact,
      score: originScore,
    },
    destinationMatch: {
      isCompatible: true,
      distanceKm: destDistKm,
      isExact: toExact,
      score: destScore,
    },
    routeOverlap: {
      isCompatible: true,
      detourKm: Math.round(totalDetourKm * 10) / 10,
      detourPercentage: Math.round(detourRatio * 100),
      directionCosine: Math.round(directionCosine * 100) / 100,
      isIntermediateDropoff,
      isIntermediatePickup,
      score: detourScore,
    },
    overallRouteScore,
  };
}

/**
 * Convenient wrapper for checking Trip vs Parcel compatibility.
 */
export function checkTripParcelRoute(trip: Trip, parcel: Parcel): RouteCompatibilityResult {
  return checkRouteCompatibility(trip.fromCity, trip.toCity, parcel.fromCity, parcel.toCity);
}
