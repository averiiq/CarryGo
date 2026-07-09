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
  // Metros
  { name: 'Mumbai', state: 'Maharashtra', lat: 19.076, lng: 72.8777, tier: 'metro' },
  { name: 'Delhi', state: 'Delhi', lat: 28.7041, lng: 77.1025, tier: 'metro' },
  { name: 'Bangalore', state: 'Karnataka', lat: 12.9716, lng: 77.5946, tier: 'metro' },
  { name: 'Hyderabad', state: 'Telangana', lat: 17.385, lng: 78.4867, tier: 'metro' },
  { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707, tier: 'metro' },
  { name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639, tier: 'metro' },

  // Tier 1
  { name: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567, tier: 'tier1' },
  { name: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714, tier: 'tier1' },
  { name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873, tier: 'tier1' },
  { name: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462, tier: 'tier1' },
  { name: 'Surat', state: 'Gujarat', lat: 21.1702, lng: 72.8311, tier: 'tier1' },
  { name: 'Kanpur', state: 'Uttar Pradesh', lat: 26.4499, lng: 80.3319, tier: 'tier1' },
  { name: 'Nagpur', state: 'Maharashtra', lat: 21.1458, lng: 79.0882, tier: 'tier1' },
  { name: 'Indore', state: 'Madhya Pradesh', lat: 22.7196, lng: 75.8577, tier: 'tier1' },
  { name: 'Patna', state: 'Bihar', lat: 25.6093, lng: 85.1376, tier: 'tier1' },
  { name: 'Bhopal', state: 'Madhya Pradesh', lat: 23.2599, lng: 77.4126, tier: 'tier1' },
  { name: 'Coimbatore', state: 'Tamil Nadu', lat: 11.0168, lng: 76.9558, tier: 'tier1' },
  { name: 'Kochi', state: 'Kerala', lat: 9.9312, lng: 76.2673, tier: 'tier1' },
  { name: 'Visakhapatnam', state: 'Andhra Pradesh', lat: 17.6868, lng: 83.2185, tier: 'tier1' },
  { name: 'Chandigarh', state: 'Chandigarh', lat: 30.7333, lng: 76.7794, tier: 'tier1' },

  // Tier 2
  { name: 'Vadodara', state: 'Gujarat', lat: 22.3072, lng: 73.1812, tier: 'tier2' },
  { name: 'Agra', state: 'Uttar Pradesh', lat: 27.1767, lng: 78.0081, tier: 'tier2' },
  { name: 'Varanasi', state: 'Uttar Pradesh', lat: 25.3176, lng: 82.9739, tier: 'tier2' },
  { name: 'Mysore', state: 'Karnataka', lat: 12.2958, lng: 76.6394, tier: 'tier2' },
  { name: 'Mangalore', state: 'Karnataka', lat: 12.9141, lng: 74.856, tier: 'tier2' },
  { name: 'Rajkot', state: 'Gujarat', lat: 22.3039, lng: 70.8022, tier: 'tier2' },
  { name: 'Thiruvananthapuram', state: 'Kerala', lat: 8.5241, lng: 76.9366, tier: 'tier2' },
  { name: 'Dehradun', state: 'Uttarakhand', lat: 30.3165, lng: 78.0322, tier: 'tier2' },
  { name: 'Guwahati', state: 'Assam', lat: 26.1445, lng: 91.7362, tier: 'tier2' },
  { name: 'Ranchi', state: 'Jharkhand', lat: 23.3441, lng: 85.3096, tier: 'tier2' },
  { name: 'Madurai', state: 'Tamil Nadu', lat: 9.9252, lng: 78.1198, tier: 'tier2' },
  { name: 'Jodhpur', state: 'Rajasthan', lat: 26.2389, lng: 73.0243, tier: 'tier2' },
  { name: 'Amritsar', state: 'Punjab', lat: 31.634, lng: 74.8723, tier: 'tier2' },
  { name: 'Aurangabad', state: 'Maharashtra', lat: 19.8762, lng: 75.3433, tier: 'tier2' },
  { name: 'Nashik', state: 'Maharashtra', lat: 19.9975, lng: 73.7898, tier: 'tier2' },
  { name: 'Raipur', state: 'Chhattisgarh', lat: 21.2514, lng: 81.6296, tier: 'tier2' },

  // Tier 3
  { name: 'Udaipur', state: 'Rajasthan', lat: 24.5854, lng: 73.7125, tier: 'tier3' },
  { name: 'Shimla', state: 'Himachal Pradesh', lat: 31.1048, lng: 77.1734, tier: 'tier3' },
  { name: 'Goa', state: 'Goa', lat: 15.2993, lng: 74.124, tier: 'tier3' },
  { name: 'Bhubaneswar', state: 'Odisha', lat: 20.2961, lng: 85.8245, tier: 'tier3' },
  { name: 'Vijayawada', state: 'Andhra Pradesh', lat: 16.5062, lng: 80.648, tier: 'tier3' },
  { name: 'Tiruchirappalli', state: 'Tamil Nadu', lat: 10.7905, lng: 78.7047, tier: 'tier3' },
  { name: 'Hubli', state: 'Karnataka', lat: 15.3647, lng: 75.124, tier: 'tier3' },
  { name: 'Jabalpur', state: 'Madhya Pradesh', lat: 23.1815, lng: 79.9864, tier: 'tier3' },
];

/**
 * Find a city by name (case-insensitive partial match).
 * Returns the best match or undefined.
 */
export function findCity(name: string): IndianCity | undefined {
  const lower = name.toLowerCase().trim();
  const exact = INDIAN_CITIES.find(c => c.name.toLowerCase() === lower);
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
