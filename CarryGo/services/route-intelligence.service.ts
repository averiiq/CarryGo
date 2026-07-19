import { getSupabaseClient } from '@/template';
import { VehicleType } from '@/types';
import { sanitizeLikeInput } from '@/lib/sanitize';
import {
  findCity,
  getDistance,
  haversineDistance,
  INDIAN_CITIES,
  IndianCity,
} from '@/constants/indian-cities';

/** Average speeds (km/h) by vehicle type */
const VEHICLE_SPEEDS: Record<VehicleType, number> = {
  bike: 40,
  car: 60,
  bus: 45,
  train: 80,
  flight: 600,
};

/** Route distance multiplier to account for road curvature (not straight-line) */
const ROAD_DISTANCE_FACTOR: Record<VehicleType, number> = {
  bike: 1.4,
  car: 1.3,
  bus: 1.35,
  train: 1.15,
  flight: 1.0,
};

export interface RoutePopularity {
  tripCount: number;
  parcelCount: number;
  totalActivity: number;
}

export interface NearbyRoute {
  fromCity: string;
  toCity: string;
  distanceFromTarget: number;
}

/**
 * Calculate estimated distance between two Indian cities.
 * Returns distance in km, adjusted by vehicle type road factor.
 */
export function calculateRouteDistance(
  fromCity: string,
  toCity: string,
  vehicleType: VehicleType = 'car',
): number | null {
  const from = findCity(fromCity);
  const to = findCity(toCity);

  if (!from || !to) return null;

  const straightLine = getDistance(from, to);
  return Math.round(straightLine * ROAD_DISTANCE_FACTOR[vehicleType]);
}

/**
 * Find routes that pass through or near a city within the given radius.
 * Searches active trips in the database whose from/to cities are within radius.
 */
export function findNearbyRoutes(
  city: string,
  radiusKm: number,
): IndianCity[] {
  const target = findCity(city);
  if (!target) return [];

  return INDIAN_CITIES.filter(c => {
    if (c.name === target.name) return false;
    const dist = haversineDistance(target.lat, target.lng, c.lat, c.lng);
    return dist <= radiusKm;
  });
}

/**
 * Estimate transit time between two cities based on vehicle type.
 * Returns estimated hours rounded to one decimal.
 */
export function estimateTransitTime(
  fromCity: string,
  toCity: string,
  vehicleType: VehicleType,
): number | null {
  const distance = calculateRouteDistance(fromCity, toCity, vehicleType);
  if (distance === null) return null;

  const speed = VEHICLE_SPEEDS[vehicleType];

  // Add time for stops based on vehicle type
  let stopTimeFraction = 0;
  if (vehicleType === 'bus') stopTimeFraction = 0.15;
  if (vehicleType === 'train') stopTimeFraction = 0.1;
  if (vehicleType === 'flight') {
    // Add 2 hours for airport procedures
    return Math.round((distance / speed + 2) * 10) / 10;
  }

  const baseTime = distance / speed;
  return Math.round(baseTime * (1 + stopTimeFraction) * 10) / 10;
}

/**
 * Fetch route popularity from Supabase (count of trips and parcels on this route).
 */
export async function getRoutePopularity(
  fromCity: string,
  toCity: string,
): Promise<RoutePopularity> {
  const sb = getSupabaseClient();

  const safeFrom = sanitizeLikeInput(fromCity);
  const safeTo = sanitizeLikeInput(toCity);

  const [tripsResult, parcelsResult] = await Promise.all([
    sb
      .from('trips')
      .select('id', { count: 'exact', head: true })
      .ilike('from_city', `%${safeFrom}%`)
      .ilike('to_city', `%${safeTo}%`),
    sb
      .from('parcels')
      .select('id', { count: 'exact', head: true })
      .ilike('from_city', `%${safeFrom}%`)
      .ilike('to_city', `%${safeTo}%`),
  ]);

  const tripCount = tripsResult.count ?? 0;
  const parcelCount = parcelsResult.count ?? 0;

  return {
    tripCount,
    parcelCount,
    totalActivity: tripCount + parcelCount,
  };
}

/**
 * Get coordinates for a city name. Returns null if city not found.
 */
export function getCityCoordinates(
  cityName: string,
): { lat: number; lng: number } | null {
  const city = findCity(cityName);
  if (!city) return null;
  return { lat: city.lat, lng: city.lng };
}

/**
 * Format transit time into a human-readable string.
 */
export function formatTransitTime(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)} min`;
  }
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
