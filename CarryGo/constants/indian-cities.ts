// Haryana Cities Coordinate Database (Hizli / CarryGo Haryana Launch)

export type PopulationTier = 'metro' | 'tier1' | 'tier2' | 'tier3';

export interface IndianCity {
  name: string;
  state: string;
  lat: number;
  lng: number;
  tier: PopulationTier;
}

export type HaryanaCity = IndianCity;

/**
 * Haryana Cities Database
 * Exclusively contains Haryana districts, municipal corporations, and major transit hubs.
 */
export const HARYANA_CITIES: readonly IndianCity[] = [
  // Major Urban & Industrial Hubs (Tier 1)
  { name: 'Gurugram', state: 'Haryana', lat: 28.4595, lng: 77.0266, tier: 'tier1' },
  { name: 'Faridabad', state: 'Haryana', lat: 28.4089, lng: 77.3178, tier: 'tier1' },

  // Key Commercial & District Centers (Tier 2)
  { name: 'Panipat', state: 'Haryana', lat: 29.3909, lng: 76.9635, tier: 'tier2' },
  { name: 'Ambala', state: 'Haryana', lat: 30.3782, lng: 76.7767, tier: 'tier2' },
  { name: 'Karnal', state: 'Haryana', lat: 29.6857, lng: 76.9905, tier: 'tier2' },
  { name: 'Rohtak', state: 'Haryana', lat: 28.8955, lng: 76.6066, tier: 'tier2' },
  { name: 'Hisar', state: 'Haryana', lat: 29.1492, lng: 75.7217, tier: 'tier2' },
  { name: 'Sonipat', state: 'Haryana', lat: 28.9931, lng: 77.0151, tier: 'tier2' },
  { name: 'Panchkula', state: 'Haryana', lat: 30.6942, lng: 76.8606, tier: 'tier2' },
  { name: 'Yamunanagar', state: 'Haryana', lat: 30.129, lng: 77.2674, tier: 'tier2' },
  { name: 'Sirsa', state: 'Haryana', lat: 29.5349, lng: 75.0298, tier: 'tier2' },
  { name: 'Bhiwani', state: 'Haryana', lat: 28.793, lng: 76.132, tier: 'tier2' },
  { name: 'Bahadurgarh', state: 'Haryana', lat: 28.6924, lng: 76.9249, tier: 'tier2' },
  { name: 'Rewari', state: 'Haryana', lat: 28.192, lng: 76.6186, tier: 'tier2' },
  { name: 'Jind', state: 'Haryana', lat: 29.314, lng: 76.3144, tier: 'tier2' },
  { name: 'Palwal', state: 'Haryana', lat: 28.1447, lng: 77.3256, tier: 'tier2' },
  { name: 'Kaithal', state: 'Haryana', lat: 29.8015, lng: 76.3996, tier: 'tier2' },
  { name: 'Kurukshetra', state: 'Haryana', lat: 29.9695, lng: 76.8783, tier: 'tier2' },
  { name: 'Manesar', state: 'Haryana', lat: 28.3518, lng: 76.9366, tier: 'tier2' },
  { name: 'Jagadhri', state: 'Haryana', lat: 30.1727, lng: 77.2986, tier: 'tier2' },
  { name: 'Thanesar', state: 'Haryana', lat: 29.98, lng: 76.82, tier: 'tier2' },

  // District Headquarters, Sub-Divisions & Transit Towns (Tier 3)
  { name: 'Fatehabad', state: 'Haryana', lat: 29.5146, lng: 75.4542, tier: 'tier3' },
  { name: 'Narnaul', state: 'Haryana', lat: 28.0441, lng: 76.1075, tier: 'tier3' },
  { name: 'Charkhi Dadri', state: 'Haryana', lat: 28.5921, lng: 76.2653, tier: 'tier3' },
  { name: 'Jhajjar', state: 'Haryana', lat: 28.6064, lng: 76.6565, tier: 'tier3' },
  { name: 'Nuh', state: 'Haryana', lat: 28.1098, lng: 77.0142, tier: 'tier3' },
  { name: 'Hansi', state: 'Haryana', lat: 29.1026, lng: 75.9616, tier: 'tier3' },
  { name: 'Kalka', state: 'Haryana', lat: 30.8354, lng: 76.9332, tier: 'tier3' },
  { name: 'Tohana', state: 'Haryana', lat: 29.7042, lng: 75.9048, tier: 'tier3' },
  { name: 'Gohana', state: 'Haryana', lat: 29.1387, lng: 76.7011, tier: 'tier3' },
  { name: 'Hodal', state: 'Haryana', lat: 27.8931, lng: 77.3683, tier: 'tier3' },
  { name: 'Pundri', state: 'Haryana', lat: 29.7567, lng: 76.5604, tier: 'tier3' },
  { name: 'Shahbad', state: 'Haryana', lat: 30.1684, lng: 76.8711, tier: 'tier3' },
  { name: 'Pehowa', state: 'Haryana', lat: 29.9814, lng: 76.5828, tier: 'tier3' },
  { name: 'Assandh', state: 'Haryana', lat: 29.5244, lng: 76.6042, tier: 'tier3' },
  { name: 'Gharaunda', state: 'Haryana', lat: 29.5404, lng: 76.9714, tier: 'tier3' },
  { name: 'Samalkha', state: 'Haryana', lat: 29.2394, lng: 77.0117, tier: 'tier3' },
  { name: 'Ganaur', state: 'Haryana', lat: 29.1337, lng: 77.0175, tier: 'tier3' },
  { name: 'Narwana', state: 'Haryana', lat: 29.5985, lng: 76.1212, tier: 'tier3' },
  { name: 'Safidon', state: 'Haryana', lat: 29.4088, lng: 76.6664, tier: 'tier3' },
  { name: 'Sohna', state: 'Haryana', lat: 28.2464, lng: 77.0658, tier: 'tier3' },
  { name: 'Pataudi', state: 'Haryana', lat: 28.3244, lng: 76.7797, tier: 'tier3' },
  { name: 'Bawal', state: 'Haryana', lat: 28.0833, lng: 76.5833, tier: 'tier3' },
  { name: 'Kosli', state: 'Haryana', lat: 28.4111, lng: 76.4833, tier: 'tier3' },
  { name: 'Tosham', state: 'Haryana', lat: 28.8778, lng: 75.9189, tier: 'tier3' },
  { name: 'Siwani', state: 'Haryana', lat: 28.9133, lng: 75.6144, tier: 'tier3' },
  { name: 'Loharu', state: 'Haryana', lat: 28.4356, lng: 75.8117, tier: 'tier3' },
  { name: 'Barwala', state: 'Haryana', lat: 29.3789, lng: 75.9122, tier: 'tier3' },
  { name: 'Naraingarh', state: 'Haryana', lat: 30.4789, lng: 77.1294, tier: 'tier3' },
  { name: 'Ellenabad', state: 'Haryana', lat: 29.4475, lng: 74.6592, tier: 'tier3' },
  { name: 'Rania', state: 'Haryana', lat: 29.5267, lng: 74.8344, tier: 'tier3' },
  { name: 'Mandi Dabwali', state: 'Haryana', lat: 29.9578, lng: 74.7214, tier: 'tier3' },
  { name: 'Uklana', state: 'Haryana', lat: 29.5167, lng: 75.8667, tier: 'tier3' },
  { name: 'Meham', state: 'Haryana', lat: 28.9667, lng: 76.2833, tier: 'tier3' },
  { name: 'Sampla', state: 'Haryana', lat: 28.7758, lng: 76.7725, tier: 'tier3' },
  { name: 'Beri', state: 'Haryana', lat: 28.7, lng: 76.5833, tier: 'tier3' },
  { name: 'Badhra', state: 'Haryana', lat: 28.4833, lng: 76.1333, tier: 'tier3' },
  { name: 'Tauru', state: 'Haryana', lat: 28.2167, lng: 76.95, tier: 'tier3' },
  { name: 'Pinjore', state: 'Haryana', lat: 30.7958, lng: 76.915, tier: 'tier3' },
  { name: 'Cheeka', state: 'Haryana', lat: 30.05, lng: 76.2333, tier: 'tier3' },
  { name: 'Kalayat', state: 'Haryana', lat: 29.6761, lng: 76.2575, tier: 'tier3' },
  { name: 'Ladwa', state: 'Haryana', lat: 29.9972, lng: 77.045, tier: 'tier3' },
  { name: 'Ferozepur Jhirka', state: 'Haryana', lat: 27.7917, lng: 76.9417, tier: 'tier3' },
  { name: 'Punhana', state: 'Haryana', lat: 27.8667, lng: 77.2, tier: 'tier3' },
  { name: 'Hathin', state: 'Haryana', lat: 27.9556, lng: 77.24, tier: 'tier3' },
  { name: 'Kharkhoda', state: 'Haryana', lat: 28.8789, lng: 76.9125, tier: 'tier3' },
  { name: 'Radaur', state: 'Haryana', lat: 30.0267, lng: 77.1533, tier: 'tier3' },
  { name: 'Nilokheri', state: 'Haryana', lat: 29.8333, lng: 76.9167, tier: 'tier3' },
  { name: 'Indri', state: 'Haryana', lat: 29.88, lng: 77.06, tier: 'tier3' },
  { name: 'Taraori', state: 'Haryana', lat: 29.8, lng: 76.9333, tier: 'tier3' },
  { name: 'Mahendragarh', state: 'Haryana', lat: 28.2833, lng: 76.15, tier: 'tier3' },
];

/**
 * Primary exported city list. In this release, CarryGo is launching in Haryana only.
 */
export const INDIAN_CITIES: readonly IndianCity[] = HARYANA_CITIES;

const CITY_MAP = new Map<string, IndianCity>();
for (const city of HARYANA_CITIES) {
  CITY_MAP.set(city.name.toLowerCase().trim(), city);
}

/**
 * Common alternate spellings and local aliases for Haryana cities
 */
const CITY_ALIASES: Record<string, string> = {
  'gurgaon': 'Gurugram',
  'sonepat': 'Sonipat',
  'mahendragarh': 'Narnaul',
  'mewat': 'Nuh',
  'thanesar': 'Kurukshetra',
  'jagadhri': 'Yamunanagar',
  'pinjore': 'Panchkula',
  'dabwali': 'Mandi Dabwali',
  'shahabad': 'Shahbad',
  'shahbad markanda': 'Shahbad',
};

/**
 * Optional regional transit gateway hubs for corridor calculations only.
 * Not included in selectable city dropdowns or user autocomplete.
 */
const REGIONAL_GATEWAYS: IndianCity[] = [
  { name: 'Delhi', state: 'Delhi', lat: 28.6139, lng: 77.209, tier: 'metro' },
  { name: 'New Delhi', state: 'Delhi', lat: 28.6139, lng: 77.209, tier: 'metro' },
  { name: 'Chandigarh', state: 'Chandigarh', lat: 30.7333, lng: 76.7794, tier: 'tier1' },
];

const GATEWAY_MAP = new Map<string, IndianCity>();
for (const gw of REGIONAL_GATEWAYS) {
  GATEWAY_MAP.set(gw.name.toLowerCase().trim(), gw);
}
GATEWAY_MAP.set('dilli', REGIONAL_GATEWAYS[0]);
GATEWAY_MAP.set('delhi ncr', REGIONAL_GATEWAYS[0]);

/**
 * Find a city by name (case-insensitive, alias support, partial match fallback).
 * Prioritizes Haryana cities, with fallback to regional transit gateways for corridor math.
 */
export function findCity(name: string): IndianCity | undefined {
  if (!name) return undefined;
  const lower = name.toLowerCase().trim();
  const alias = CITY_ALIASES[lower];
  if (alias) {
    const aliasedCity = CITY_MAP.get(alias.toLowerCase());
    if (aliasedCity) return aliasedCity;
  }
  const exact = CITY_MAP.get(lower);
  if (exact) return exact;

  // Search Haryana cities by partial substring
  const partial = HARYANA_CITIES.find(c => c.name.toLowerCase().includes(lower));
  if (partial) return partial;

  // Gateway fallback for transit calculations
  return GATEWAY_MAP.get(lower);
}

/**
 * Calculate distance between two cities using the Haversine formula.
 * Returns distance in kilometers.
 */
export function getDistance(city1: IndianCity, city2: IndianCity): number {
  return haversineDistance(city1.lat, city1.lng, city2.lat, city2.lng);
}

/**
 * Haversine distance between two lat/lng coordinates.
 * Returns distance in kilometers.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const EARTH_RADIUS_KM = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Get all Haryana city names as a flat array (for autocomplete).
 */
export function getCityNames(): string[] {
  return HARYANA_CITIES.map(c => c.name);
}

/**
 * Find Haryana cities within a given radius from a coordinate.
 */
export function findCitiesInRadius(
  lat: number,
  lng: number,
  radiusKm: number,
): IndianCity[] {
  return HARYANA_CITIES.filter(
    city => haversineDistance(lat, lng, city.lat, city.lng) <= radiusKm,
  );
}
