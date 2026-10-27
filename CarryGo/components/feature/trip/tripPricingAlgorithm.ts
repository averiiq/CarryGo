import { findCity, getDistance, HARYANA_CITIES } from '@/constants/indian-cities';
import { VehicleType } from '@/types';

export interface PriceGuidance {
  suggested: number;
  min: number;
  max: number;
  distanceKm: number;
  health: 'budget' | 'fair' | 'moderate' | 'overpriced' | 'none';
  healthLabel: string;
  healthColor: string;
  healthDescription: string;
}

/**
 * Common transit waypoints along major northern Indian corridors.
 */
const CORRIDOR_WAYPOINTS: Record<string, string[]> = {
  // NH-44 Delhi <-> Chandigarh / Punjab corridor
  'delhi-chandigarh': ['Sonipat', 'Panipat', 'Karnal', 'Kurukshetra', 'Ambala'],
  'gurugram-chandigarh': ['Delhi', 'Sonipat', 'Panipat', 'Karnal', 'Ambala'],
  'faridabad-chandigarh': ['Delhi', 'Panipat', 'Karnal', 'Kurukshetra', 'Ambala'],
  // NH-9 Delhi <-> Hisar / Sirsa corridor
  'delhi-hisar': ['Bahadurgarh', 'Rohtak', 'Meham', 'Hansi'],
  'gurugram-hisar': ['Jhajjar', 'Rohtak', 'Hansi'],
  'delhi-sirsa': ['Rohtak', 'Hansi', 'Hisar', 'Fatehabad'],
  'gurugram-sirsa': ['Rohtak', 'Hisar', 'Fatehabad'],
  // NH-48 Delhi / Gurugram <-> Rewari / Narnaul / Jaipur corridor
  'delhi-rewari': ['Gurugram', 'Manesar', 'Dharuhera'],
  'gurugram-rewari': ['Manesar', 'Pataudi', 'Bawal'],
  'delhi-narnaul': ['Gurugram', 'Rewari', 'Mahendragarh'],
  'gurugram-narnaul': ['Rewari', 'Mahendragarh'],
  // Rohtak <-> Chandigarh / Panchkula
  'rohtak-chandigarh': ['Gohana', 'Panipat', 'Karnal', 'Ambala'],
  'hisar-chandigarh': ['Barwala', 'Narwana', 'Kaithal', 'Pehowa', 'Ambala'],
};

/**
 * Calculate total cumulative distance in kilometers along the route including all stopovers.
 */
export function calculateRouteDistance(
  fromCity: string,
  toCity: string,
  stopovers: string[] = []
): number {
  if (!fromCity || !toCity) return 0;

  const validStops = [fromCity, ...stopovers.filter(Boolean), toCity];
  if (validStops.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 0; i < validStops.length - 1; i++) {
    const c1 = findCity(validStops[i]);
    const c2 = findCity(validStops[i + 1]);

    if (c1 && c2) {
      totalDistance += getDistance(c1, c2);
    } else {
      // Conservative estimate if an unmapped gateway is entered
      totalDistance += 70;
    }
  }

  return Math.max(15, Math.round(totalDistance));
}

/**
 * Recommend intelligent stopovers along the traveler's route.
 */
export function getSuggestedStopovers(
  fromCity: string,
  toCity: string,
  currentStopovers: string[] = []
): string[] {
  if (!fromCity || !toCity) return [];

  const key1 = `${fromCity.toLowerCase().trim()}-${toCity.toLowerCase().trim()}`;
  const key2 = `${toCity.toLowerCase().trim()}-${fromCity.toLowerCase().trim()}`;

  const currentSet = new Set(
    [fromCity, toCity, ...currentStopovers].map((s) => s.toLowerCase().trim())
  );

  let waypoints: string[] = [];
  if (CORRIDOR_WAYPOINTS[key1]) {
    waypoints = CORRIDOR_WAYPOINTS[key1];
  } else if (CORRIDOR_WAYPOINTS[key2]) {
    waypoints = [...CORRIDOR_WAYPOINTS[key2]].reverse();
  } else {
    // Spatial search: Find intermediate cities between origin and destination
    const c1 = findCity(fromCity);
    const c2 = findCity(toCity);
    if (c1 && c2) {
      const minLat = Math.min(c1.lat, c2.lat) - 0.2;
      const maxLat = Math.max(c1.lat, c2.lat) + 0.2;
      const minLng = Math.min(c1.lng, c2.lng) - 0.2;
      const maxLng = Math.max(c1.lng, c2.lng) + 0.2;

      waypoints = HARYANA_CITIES.filter(
        (c) =>
          c.lat >= minLat &&
          c.lat <= maxLat &&
          c.lng >= minLng &&
          c.lng <= maxLng &&
          c.tier !== 'tier3'
      ).map((c) => c.name);
    }
  }

  return waypoints.filter((city) => !currentSet.has(city.toLowerCase().trim())).slice(0, 5);
}

/**
 * Negotiable price algorithm: Calculates fair price guidance based on distance,
 * vehicle commute mode, and provides real-time health feedback to prevent overcharging.
 */
export function calculatePriceGuidance(
  distanceKm: number,
  vehicle: VehicleType,
  currentPriceStr?: string
): PriceGuidance {
  const vehicleMultipliers: Record<VehicleType, number> = {
    bike: 0.85,
    car: 1.0,
    bus: 0.85,
    train: 0.75,
    flight: 1.8,
  };
  const mult = vehicleMultipliers[vehicle] || 1.0;

  // Tiered base rate per kg based on corridor distance to prevent overcharging for short routes
  let baseSuggested = 65;
  let minBase = 45;
  let maxBase = 90;

  if (distanceKm <= 60) {
    // Ultra-short route (e.g. Gurugram to Delhi, Bahadurgarh to Rohtak)
    baseSuggested = 45;
    minBase = 30;
    maxBase = 65;
  } else if (distanceKm <= 120) {
    // Short corridor (e.g. Delhi to Panipat, Gurugram to Rewari)
    baseSuggested = 65;
    minBase = 45;
    maxBase = 85;
  } else if (distanceKm <= 250) {
    // Medium corridor (e.g. Delhi to Chandigarh, Karnal)
    baseSuggested = 85;
    minBase = 60;
    maxBase = 115;
  } else if (distanceKm <= 450) {
    // Long corridor
    baseSuggested = 115;
    minBase = 80;
    maxBase = 155;
  } else {
    // Inter-state / long-haul corridor
    baseSuggested = 150;
    minBase = 110;
    maxBase = 220;
  }

  const suggested = Math.round(baseSuggested * mult);
  const min = Math.max(25, Math.round(minBase * mult));
  const max = Math.round(maxBase * mult);

  const priceNum = Number(currentPriceStr);
  let health: PriceGuidance['health'] = 'none';
  let healthLabel = '';
  let healthColor = '#10B981';
  let healthDescription = '';

  if (Number.isFinite(priceNum) && priceNum > 0) {
    if (priceNum < min) {
      health = 'budget';
      healthLabel = 'Budget Fare • Fast Bookings';
      healthColor = '#10B981';
      healthDescription = 'Priced below average corridor rate. Senders will book very quickly.';
    } else if (priceNum <= max) {
      health = 'fair';
      healthLabel = 'Fair & Competitive Rate';
      healthColor = '#10B981';
      healthDescription = `Optimal rate for ~${distanceKm} km. Senders rarely negotiate.`;
    } else if (priceNum <= Math.round(max * 1.35)) {
      health = 'moderate';
      healthLabel = 'Slightly High • Expect Negotiation';
      healthColor = '#F59E0B';
      healthDescription = 'Above standard corridor rate. Senders may submit counter-offers in chat.';
    } else {
      health = 'overpriced';
      healthLabel = 'High for this Short Route';
      healthColor = '#EF4444';
      healthDescription = `Overcharging for ~${distanceKm} km may discourage senders. We recommend keeping under ₹${max}/kg.`;
    }
  }

  return {
    suggested,
    min,
    max,
    distanceKm,
    health,
    healthLabel,
    healthColor,
    healthDescription,
  };
}
