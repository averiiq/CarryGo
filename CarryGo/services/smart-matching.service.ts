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

export type MismatchReason =
  | 'capacity_exceeded'
  | 'date_misaligned'
  | 'price_gap'
  | 'corridor_unserved'
  | 'no_active_listings';

export interface DiagnosticAction {
  id: 'split_parcel' | 'adjust_date' | 'adjust_price' | 'post_open_request' | 'subscribe_route' | 'repost_trip' | 'increase_capacity';
  label: string;
  hint: string;
  icon?: string;
}

export interface MatchingDiagnostic {
  reason: MismatchReason;
  title: string;
  explanation: string;
  candidateCount: number;
  actions: DiagnosticAction[];
  details?: {
    requiredCapacity?: number;
    maxAvailableCapacity?: number;
    parcelDeliveryDate?: string;
    earliestTripDate?: string;
    latestTripDate?: string;
    parcelPriceOffer?: number;
    averageTripPrice?: number;
    corridorName?: string;
  };
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
  if (!rating || rating <= 0) return 75;
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

export function diagnoseParcelTripMatching(
  parcel: Parcel,
  candidateTrips: Trip[]
): MatchingDiagnostic {
  const corridorName = `${parcel.fromCity} → ${parcel.toCity}`;

  // 1. Exclude trips by the parcel owner
  const otherUserTrips = candidateTrips.filter(t => t.userId !== parcel.userId);

  if (otherUserTrips.length === 0) {
    return {
      reason: 'corridor_unserved',
      title: 'No Active Travel Companions on This Route',
      explanation: `There are currently no registered journeys scheduled between ${parcel.fromCity} and ${parcel.toCity}. You can dispatch your package as an open request so passing travel companions can accept it, or set route alerts.`,
      candidateCount: 0,
      actions: [
        {
          id: 'post_open_request',
          label: 'Dispatch Open Request',
          hint: 'Keep your package visible to all travel companions along this pathway',
          icon: 'send',
        },
        {
          id: 'subscribe_route',
          label: 'Set Route Alert',
          hint: 'Receive an instant notification the moment a travel companion lists a journey',
          icon: 'notifications',
        },
      ],
      details: { corridorName },
    };
  }

  // 2. Check for active trips
  const activeTrips = otherUserTrips.filter(t => t.status === 'active');
  if (activeTrips.length === 0) {
    return {
      reason: 'no_active_listings',
      title: 'All Route Journeys Are Completed or Full',
      explanation: `We found ${otherUserTrips.length} journey(s) on this route, but all are currently reserved or completed.`,
      candidateCount: otherUserTrips.length,
      actions: [
        {
          id: 'subscribe_route',
          label: 'Set Route Alert',
          hint: 'Get notified as soon as a new journey opens on this pathway',
          icon: 'notifications',
        },
        {
          id: 'post_open_request',
          label: 'Dispatch Open Request',
          hint: 'Make your package discoverable by new travel companions',
          icon: 'send',
        },
      ],
      details: { corridorName },
    };
  }

  // 3. Route compatibility check
  const routeTrips = activeTrips.filter(t => routeCompatibility(t, parcel) >= 20);
  if (routeTrips.length === 0) {
    return {
      reason: 'corridor_unserved',
      title: 'No Direct or Connecting Travellers Found',
      explanation: `There are active travellers nearby, but none of their routes pass close enough to ${parcel.fromCity} or ${parcel.toCity}.`,
      candidateCount: activeTrips.length,
      actions: [
        {
          id: 'post_open_request',
          label: 'Post Open Request',
          hint: 'Allow flexible long-distance travellers to make a custom detour offer',
          icon: 'send',
        },
        {
          id: 'subscribe_route',
          label: 'Set Route Alert',
          hint: 'We will notify you when a direct trip is created',
          icon: 'notifications',
        },
      ],
      details: { corridorName },
    };
  }

  // 4. Capacity bottleneck check
  const fittingTrips = routeTrips.filter(t => t.availableCapacity >= parcel.weight);
  if (fittingTrips.length === 0) {
    const maxCapacity = Math.max(...routeTrips.map(t => t.availableCapacity), 0);
    return {
      reason: 'capacity_exceeded',
      title: 'Package Exceeds Available Luggage Reserve',
      explanation: `Found ${routeTrips.length} travel companion${routeTrips.length > 1 ? 's' : ''} on this route, but your package (${parcel.weight}kg) exceeds their spare baggage capacity (maximum available is ${maxCapacity}kg).`,
      candidateCount: routeTrips.length,
      actions: [
        {
          id: 'split_parcel',
          label: 'Split into Smaller Parcels',
          hint: maxCapacity > 0 ? `Split your package to fit within ${maxCapacity}kg luggage reserve` : 'Split into smaller packages',
          icon: 'call-split',
        },
        {
          id: 'post_open_request',
          label: 'Post Bulk Request',
          hint: 'Allow SUV, van, or large-capacity travelers to carry this delivery',
          icon: 'send',
        },
      ],
      details: {
        requiredCapacity: parcel.weight,
        maxAvailableCapacity: maxCapacity,
        corridorName,
      },
    };
  }

  // 5. Date bottleneck check
  if (parcel.deliveryDate) {
    const deadline = new Date(parcel.deliveryDate).getTime();
    const onTimeTrips = routeTrips.filter(t => {
      const tripTime = new Date(t.date).getTime();
      return (tripTime - deadline) / (1000 * 60 * 60 * 24) <= 1;
    });

    if (onTimeTrips.length === 0) {
      const sortedByDate = [...routeTrips].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      const earliest = sortedByDate[0]?.date;
      return {
        reason: 'date_misaligned',
        title: 'Travel Dates Fall After Delivery Deadline',
        explanation: `Found ${routeTrips.length} traveller${routeTrips.length > 1 ? 's' : ''} on this route, but their earliest departure is ${earliest}, which is after your deadline (${parcel.deliveryDate}).`,
        candidateCount: routeTrips.length,
        actions: [
          {
            id: 'adjust_date',
            label: 'Extend Delivery Window',
            hint: 'Allow flexible delivery dates to match scheduled departures',
            icon: 'date-range',
          },
          {
            id: 'post_open_request',
            label: 'Request Express Delivery',
            hint: 'Notify urgent community drivers for same-day or next-day transit',
            icon: 'flash-on',
          },
        ],
        details: {
          parcelDeliveryDate: parcel.deliveryDate,
          earliestTripDate: earliest,
          corridorName,
        },
      };
    }
  }

  // 6. Price bottleneck check
  const requiredOffers = routeTrips.map(t => t.pricePerKg * parcel.weight);
  const minRequired = Math.min(...requiredOffers);
  const avgTripPrice = Math.round(requiredOffers.reduce((a, b) => a + b, 0) / requiredOffers.length);

  if (parcel.priceOffer > 0 && parcel.priceOffer < minRequired * 0.6) {
    return {
      reason: 'price_gap',
      title: 'Reward Offer Below Corridor Average',
      explanation: `Travellers on this route typically ask ~₹${avgTripPrice} for a ${parcel.weight}kg parcel (min ₹${minRequired}). Your current offer is ₹${parcel.priceOffer}.`,
      candidateCount: routeTrips.length,
      actions: [
        {
          id: 'adjust_price',
          label: 'Increase Delivery Reward',
          hint: `Raise offer closer to ₹${minRequired} – ₹${avgTripPrice} to attract drivers`,
          icon: 'payments',
        },
        {
          id: 'post_open_request',
          label: 'Keep Current Offer',
          hint: 'Leave your request open for drivers willing to accept your budget',
          icon: 'send',
        },
      ],
      details: {
        parcelPriceOffer: parcel.priceOffer,
        averageTripPrice: avgTripPrice,
        corridorName,
      },
    };
  }

  // 7. General schedule / low total score fallback
  return {
    reason: 'date_misaligned',
    title: 'No High-Match Travellers Right Now',
    explanation: `We found ${routeTrips.length} traveller(s) on this corridor, but their timing, detour, or pricing scores did not meet the confidence threshold.`,
    candidateCount: routeTrips.length,
    actions: [
      {
        id: 'adjust_date',
        label: 'Adjust Delivery Window',
        hint: 'Broaden your departure dates by ±2 days',
        icon: 'date-range',
      },
      {
        id: 'post_open_request',
        label: 'Post Open Request',
        hint: 'Let drivers contact you directly with custom offers',
        icon: 'send',
      },
    ],
    details: { corridorName },
  };
}

export function diagnoseTripParcelMatching(
  trip: Trip,
  candidateParcels: Parcel[]
): MatchingDiagnostic {
  const corridorName = `${trip.fromCity} → ${trip.toCity}`;
  const otherUserParcels = candidateParcels.filter(p => p.userId !== trip.userId);

  if (otherUserParcels.length === 0) {
    return {
      reason: 'corridor_unserved',
      title: 'No Packages Waiting on This Pathway',
      explanation: `There are currently no packages waiting for dispatch between ${trip.fromCity} and ${trip.toCity}. We will notify you as soon as a sender lists a matching package.`,
      candidateCount: 0,
      actions: [
        {
          id: 'subscribe_route',
          label: 'Set Route Alert',
          hint: 'Get notified instantly when new packages are listed along your travel pathway',
          icon: 'notifications',
        },
        {
          id: 'repost_trip',
          label: 'Keep Journey Active',
          hint: 'Your journey remains visible in search results for senders',
          icon: 'directions-car',
        },
      ],
      details: { corridorName },
    };
  }

  const openParcels = otherUserParcels.filter(p => p.status === 'open');
  if (openParcels.length === 0) {
    return {
      reason: 'no_active_listings',
      title: 'All Route Parcels Are Already Matched',
      explanation: `All ${otherUserParcels.length} parcel(s) on this route have already been assigned to other travellers.`,
      candidateCount: otherUserParcels.length,
      actions: [
        {
          id: 'subscribe_route',
          label: 'Set Route Alert',
          hint: 'Be first to receive alerts when new parcels appear',
          icon: 'notifications',
        },
      ],
      details: { corridorName },
    };
  }

  const routeParcels = openParcels.filter(p => routeCompatibility(trip, p) >= 20);
  if (routeParcels.length === 0) {
    return {
      reason: 'corridor_unserved',
      title: 'No Parcels Along Your Driving Corridor',
      explanation: `There are open parcels in nearby cities, but none are close enough to your route (${corridorName}).`,
      candidateCount: openParcels.length,
      actions: [
        {
          id: 'subscribe_route',
          label: 'Set Route Alert',
          hint: 'We will ping you when a parcel matching your corridor is listed',
          icon: 'notifications',
        },
      ],
      details: { corridorName },
    };
  }

  // Capacity check
  const fittingParcels = routeParcels.filter(p => p.weight <= trip.availableCapacity);
  if (fittingParcels.length === 0) {
    const minWeight = Math.min(...routeParcels.map(p => p.weight));
    return {
      reason: 'capacity_exceeded',
      title: 'Waiting Packages Exceed Your Available Capacity',
      explanation: `There are ${routeParcels.length} parcel(s) waiting on this route, but they weigh at least ${minWeight}kg, which exceeds your current capacity limit of ${trip.availableCapacity}kg.`,
      candidateCount: routeParcels.length,
      actions: [
        {
          id: 'increase_capacity',
          label: 'Increase Available Capacity',
          hint: `Raise your trip spare capacity to at least ${minWeight}kg to claim these deliveries`,
          icon: 'fitness-center',
        },
      ],
      details: {
        requiredCapacity: minWeight,
        maxAvailableCapacity: trip.availableCapacity,
        corridorName,
      },
    };
  }

  return {
    reason: 'date_misaligned',
    title: 'No Matching Parcels for Your Travel Date',
    explanation: `Found ${routeParcels.length} parcel(s) on this corridor, but their required delivery timelines do not align with your departure on ${trip.date}.`,
    candidateCount: routeParcels.length,
    actions: [
      {
        id: 'subscribe_route',
        label: 'Keep Trip Active',
        hint: 'Senders often list urgent same-day packages closer to your travel date',
        icon: 'notifications',
      },
    ],
    details: { corridorName },
  };
}
