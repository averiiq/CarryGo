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
