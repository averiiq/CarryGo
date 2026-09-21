// Indian Cities Coordinate Database

export type PopulationTier = 'metro' | 'tier1' | 'tier2' | 'tier3';

export interface IndianCity {
  name: string;
  state: string;
  lat: number;
  lng: number;
  tier: PopulationTier;
}

export const INDIAN_CITIES: readonly IndianCity[] = [
  // Primary Urban Hubs & NCR Metros (Tier 1)
  { name: 'Gurugram', state: 'Haryana', lat: 28.4595, lng: 77.0266, tier: 'tier1' },
  { name: 'Faridabad', state: 'Haryana', lat: 28.4089, lng: 77.3178, tier: 'tier1' },

  // Major Industrial & Commercial Centers (Tier 2)
  { name: 'Panipat', state: 'Haryana', lat: 29.3909, lng: 76.9635, tier: 'tier2' },
  { name: 'Ambala', state: 'Haryana', lat: 30.3782, lng: 76.7767, tier: 'tier2' },
  { name: 'Karnal', state: 'Haryana', lat: 29.6857, lng: 76.9905, tier: 'tier2' },
  { name: 'Rohtak', state: 'Haryana', lat: 28.8955, lng: 76.6066, tier: 'tier2' },
  { name: 'Hisar', state: 'Haryana', lat: 29.1492, lng: 75.7217, tier: 'tier2' },
  { name: 'Sonipat', state: 'Haryana', lat: 28.9931, lng: 77.0151, tier: 'tier2' },
  { name: 'Panchkula', state: 'Haryana', lat: 30.6942, lng: 76.8606, tier: 'tier2' },
  { name: 'Yamunanagar', state: 'Haryana', lat: 30.129, lng: 77.2674, tier: 'tier2' },

  // District Headquarters & Growing Hubs (Tier 3)
  { name: 'Sirsa', state: 'Haryana', lat: 29.5349, lng: 75.0298, tier: 'tier3' },
  { name: 'Bhiwani', state: 'Haryana', lat: 28.793, lng: 76.132, tier: 'tier3' },
  { name: 'Bahadurgarh', state: 'Haryana', lat: 28.6924, lng: 76.9249, tier: 'tier3' },
  { name: 'Rewari', state: 'Haryana', lat: 28.192, lng: 76.6186, tier: 'tier3' },
  { name: 'Jind', state: 'Haryana', lat: 29.314, lng: 76.3144, tier: 'tier3' },
  { name: 'Palwal', state: 'Haryana', lat: 28.1447, lng: 77.3256, tier: 'tier3' },
  { name: 'Kaithal', state: 'Haryana', lat: 29.8015, lng: 76.3996, tier: 'tier3' },
  { name: 'Kurukshetra', state: 'Haryana', lat: 29.9695, lng: 76.8783, tier: 'tier3' },
  { name: 'Fatehabad', state: 'Haryana', lat: 29.5146, lng: 75.4542, tier: 'tier3' },
  { name: 'Narnaul', state: 'Haryana', lat: 28.0441, lng: 76.1075, tier: 'tier3' },
  { name: 'Manesar', state: 'Haryana', lat: 28.3518, lng: 76.9366, tier: 'tier3' },
  { name: 'Charkhi Dadri', state: 'Haryana', lat: 28.5921, lng: 76.2653, tier: 'tier3' },
  { name: 'Jhajjar', state: 'Haryana', lat: 28.6064, lng: 76.6565, tier: 'tier3' },
  { name: 'Nuh', state: 'Haryana', lat: 28.1098, lng: 77.0142, tier: 'tier3' },
  { name: 'Hansi', state: 'Haryana', lat: 29.1026, lng: 75.9616, tier: 'tier3' },
  { name: 'Kalka', state: 'Haryana', lat: 30.8354, lng: 76.9332, tier: 'tier3' },
  { name: 'Tohana', state: 'Haryana', lat: 29.7042, lng: 75.9048, tier: 'tier3' },
  { name: 'Gohana', state: 'Haryana', lat: 29.1387, lng: 76.7011, tier: 'tier3' },
  { name: 'Hodal', state: 'Haryana', lat: 27.8931, lng: 77.3683, tier: 'tier3' },
  { name: 'Pundri', state: 'Haryana', lat: 29.7567, lng: 76.5604, tier: 'tier3' },
];

const CITY_MAP = new Map<string, IndianCity>();
for (const city of INDIAN_CITIES) {
  CITY_MAP.set(city.name.toLowerCase().trim(), city);
}

/**
 * Find a city by name (case-insensitive partial match).
 * Uses O(1) map lookup for exact matches with fallback to partial search.
 */
export function findCity(name: string): IndianCity | undefined {
  if (!name) return undefined;
  const lower = name.toLowerCase().trim();
  const exact = CITY_MAP.get(lower);
  if (exact) return exact;
  return INDIAN_CITIES.find(c => c.name.toLowerCase().includes(lower));
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
 * Get all city names as a flat array (for autocomplete).
 */
export function getCityNames(): string[] {
  return INDIAN_CITIES.map(c => c.name);
}

/**
 * Find cities within a given radius from a coordinate.
 */
export function findCitiesInRadius(
  lat: number,
  lng: number,
  radiusKm: number,
): IndianCity[] {
  return INDIAN_CITIES.filter(
    city => haversineDistance(lat, lng, city.lat, city.lng) <= radiusKm,
  );
}
