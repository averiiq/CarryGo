import { getDistance, findCity } from '@/constants/indian-cities';
import type { Trip } from '@/types';

export interface RouteTimelineMeta {
  departureTime: string;
  arrivalTime: string;
  durationLabel: string;
  durationMinutes: number;
}

/**
 * Parses time string (e.g. "19:15", "07:30 PM", "9:00 AM") into { hours, minutes } in 24h format.
 */
export function parseTimeString(timeStr?: string): { hours: number; minutes: number } {
  if (!timeStr || !timeStr.trim()) {
    return { hours: 10, minutes: 0 };
  }
  const clean = timeStr.trim();

  // Check 12-hour AM/PM format (e.g. "07:30 PM" or "7:30pm")
  const ampmMatch = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const m = parseInt(ampmMatch[2], 10);
    const ampm = ampmMatch[3]?.toUpperCase();
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return { hours: Math.min(23, Math.max(0, h)), minutes: Math.min(59, Math.max(0, m)) };
  }

  // Check simple "HH:MM" format
  const simpleMatch = clean.match(/^(\d{1,2}):(\d{2})/);
  if (simpleMatch) {
    const h = parseInt(simpleMatch[1], 10);
    const m = parseInt(simpleMatch[2], 10);
    return { hours: Math.min(23, Math.max(0, h)), minutes: Math.min(59, Math.max(0, m)) };
  }

  return { hours: 10, minutes: 0 };
}

/**
 * Formats hours and minutes into "HH:MM" 24h format.
 */
export function format24Hour(hours: number, minutes: number): string {
  const hh = String(hours % 24).padStart(2, '0');
  const mm = String(minutes % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Estimates travel duration between two cities in minutes based on distance and vehicle type.
 */
export function estimateTripDuration(fromCity: string, toCity: string, vehicleType: string = 'car'): number {
  const cityA = findCity(fromCity);
  const cityB = findCity(toCity);

  let distanceKm = 80;
  if (cityA && cityB) {
    const d = getDistance(cityA, cityB);
    if (d > 0) distanceKm = d;
  }

  let avgSpeed = 55; // default car speed in km/h on highway
  const mode = vehicleType.toLowerCase();
  if (mode === 'flight') avgSpeed = 500;
  else if (mode === 'train') avgSpeed = 65;
  else if (mode === 'bike') avgSpeed = 45;
  else if (mode === 'bus') avgSpeed = 40;

  const hours = distanceKm / avgSpeed;
  return Math.max(30, Math.round(hours * 60));
}

/**
 * Formats duration in minutes into BlaBlaCar style (e.g. "1h20", "0h50", "2h15").
 */
export function formatDurationLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${String(m).padStart(2, '0')}`;
}

/**
 * Computes departure, arrival, and duration metadata for a trip route.
 */
export function getRouteTimelineMeta(trip: Trip): RouteTimelineMeta {
  const { hours, minutes } = parseTimeString(trip.time);
  const departureTime = format24Hour(hours, minutes);

  const durationMinutes = estimateTripDuration(trip.fromCity, trip.toCity, trip.vehicleType);
  const durationLabel = formatDurationLabel(durationMinutes);

  const totalMin = hours * 60 + minutes + durationMinutes;
  const arrivalHours = Math.floor(totalMin / 60) % 24;
  const arrivalMinutes = totalMin % 60;
  const arrivalTime = format24Hour(arrivalHours, arrivalMinutes);

  return {
    departureTime,
    arrivalTime,
    durationLabel,
    durationMinutes,
  };
}

/**
 * Splits price into main amount and decimal string (e.g. 180 -> { amount: "180", decimal: ".00" }).
 */
export function formatBlaBlaPrice(price: number): { amount: string; decimal: string } {
  const safe = Number.isFinite(price) && price > 0 ? Math.round(price) : 0;
  return {
    amount: safe.toLocaleString('en-IN'),
    decimal: '.00',
  };
}

export interface StopoverTimelineNode {
  cityName: string;
  time: string;
  distanceFromStartKm: number;
  segmentDistanceKm: number;
  isOrigin: boolean;
  isDestination: boolean;
  stopoverIndex?: number;
}

/**
 * Calculates stop-by-stop itinerary nodes with estimated arrival times
 * and cumulative driving distances along the highway corridor.
 */
export function getStopoverTimelineMeta(trip: Trip): StopoverTimelineNode[] {
  const { hours, minutes } = parseTimeString(trip.time);
  const startCity = findCity(trip.fromCity);
  const endCity = findCity(trip.toCity);

  const rawStops = (trip.stopovers || []).map((s) => String(s || '').trim()).filter(Boolean);
  const totalTripDist = startCity && endCity ? Math.max(15, getDistance(startCity, endCity)) : 100;

  let avgSpeed = 55;
  const mode = (trip.vehicleType || 'car').toLowerCase();
  if (mode === 'flight') avgSpeed = 500;
  else if (mode === 'train') avgSpeed = 65;
  else if (mode === 'bike') avgSpeed = 45;
  else if (mode === 'bus') avgSpeed = 40;

  const nodes: StopoverTimelineNode[] = [];

  // Origin node
  nodes.push({
    cityName: trip.fromCity,
    time: format24Hour(hours, minutes),
    distanceFromStartKm: 0,
    segmentDistanceKm: 0,
    isOrigin: true,
    isDestination: false,
  });

  let prevCityObj = startCity;
  let runningDist = 0;

  // Intermediate stops
  rawStops.forEach((stopName, idx) => {
    const stopObj = findCity(stopName);
    let legDist = 25;
    if (prevCityObj && stopObj) {
      legDist = Math.max(5, getDistance(prevCityObj, stopObj));
    }
    runningDist += legDist;
    if (runningDist >= totalTripDist) {
      runningDist = Math.max(10, totalTripDist - (rawStops.length - idx) * 15);
    }
    const transitMin = Math.round((runningDist / avgSpeed) * 60);
    const stopTotalMin = hours * 60 + minutes + transitMin;
    const stopH = Math.floor(stopTotalMin / 60) % 24;
    const stopM = stopTotalMin % 60;

    nodes.push({
      cityName: stopName,
      time: format24Hour(stopH, stopM),
      distanceFromStartKm: runningDist,
      segmentDistanceKm: legDist,
      isOrigin: false,
      isDestination: false,
      stopoverIndex: idx + 1,
    });

    if (stopObj) prevCityObj = stopObj;
  });

  // Destination node
  const totalMin = hours * 60 + minutes + estimateTripDuration(trip.fromCity, trip.toCity, trip.vehicleType);
  const arrH = Math.floor(totalMin / 60) % 24;
  const arrM = totalMin % 60;

  const lastStopDist = totalTripDist - runningDist;
  nodes.push({
    cityName: trip.toCity,
    time: format24Hour(arrH, arrM),
    distanceFromStartKm: totalTripDist,
    segmentDistanceKm: Math.max(5, lastStopDist),
    isOrigin: false,
    isDestination: true,
  });

  return nodes;
}

/**
 * Calculates fair proportional pricing for a sub-segment along a trip route.
 * E.g., if trip is Delhi -> Chandigarh (245km) at ₹200, a Panipat -> Karnal leg (38km)
 * is charged fairly with a reasonable floor (minimum ₹60).
 */
export function calculateLegPrice(
  fullTripPrice: number,
  legFrom: string,
  legTo: string,
  tripFrom: string,
  tripTo: string
): number {
  const c1 = findCity(legFrom);
  const c2 = findCity(legTo);
  const t1 = findCity(tripFrom);
  const t2 = findCity(tripTo);

  if (!c1 || !c2 || !t1 || !t2) return fullTripPrice;
  const legDist = getDistance(c1, c2);
  const totalDist = getDistance(t1, t2);
  if (totalDist <= 0 || legDist >= totalDist * 0.9) return fullTripPrice;

  const ratio = Math.max(0.35, Math.min(1.0, legDist / totalDist));
  return Math.max(60, Math.round(fullTripPrice * ratio));
}

