// Indian Cities Coordinate & Route Intelligence Database

export type PopulationTier = 'metro' | 'tier1' | 'tier2' | 'tier3'

export interface IndianCity {
  name: string
  state: string
  lat: number
  lng: number
  tier: PopulationTier
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
  { name: 'Gurugram', state: 'Haryana', lat: 28.4595, lng: 77.0266, tier: 'tier1' },
  { name: 'Faridabad', state: 'Haryana', lat: 28.4089, lng: 77.3178, tier: 'tier1' },
  { name: 'Noida', state: 'Uttar Pradesh', lat: 28.5355, lng: 77.391, tier: 'tier1' },

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
  { name: 'Nashik', state: 'Maharashtra', lat: 19.9975, lng: 73.7898, tier: 'tier2' },
  { name: 'Aurangabad', state: 'Maharashtra', lat: 19.8762, lng: 75.3433, tier: 'tier2' },
  { name: 'Raipur', state: 'Chhattisgarh', lat: 21.2514, lng: 81.6296, tier: 'tier2' },
  { name: 'Meerut', state: 'Uttar Pradesh', lat: 28.9845, lng: 77.7064, tier: 'tier2' },

  // Tier 3
  { name: 'Udaipur', state: 'Rajasthan', lat: 24.5854, lng: 73.7125, tier: 'tier3' },
  { name: 'Shimla', state: 'Himachal Pradesh', lat: 31.1048, lng: 77.1734, tier: 'tier3' },
  { name: 'Goa', state: 'Goa', lat: 15.2993, lng: 74.124, tier: 'tier3' },
  { name: 'Bhubaneswar', state: 'Odisha', lat: 20.2961, lng: 85.8245, tier: 'tier3' },
  { name: 'Vijayawada', state: 'Andhra Pradesh', lat: 16.5062, lng: 80.648, tier: 'tier3' },
  { name: 'Tiruchirappalli', state: 'Tamil Nadu', lat: 10.7905, lng: 78.7047, tier: 'tier3' },
  { name: 'Hubli', state: 'Karnataka', lat: 15.3647, lng: 75.124, tier: 'tier3' },
  { name: 'Jabalpur', state: 'Madhya Pradesh', lat: 23.1815, lng: 79.9864, tier: 'tier3' },
  { name: 'Hisar', state: 'Haryana', lat: 29.1492, lng: 75.7217, tier: 'tier3' },
  { name: 'Rohtak', state: 'Haryana', lat: 28.8955, lng: 76.6066, tier: 'tier3' },
  { name: 'Karnal', state: 'Haryana', lat: 29.6857, lng: 76.9905, tier: 'tier3' },
  { name: 'Panipat', state: 'Haryana', lat: 29.3909, lng: 76.9635, tier: 'tier3' },
  { name: 'Ambala', state: 'Haryana', lat: 30.3782, lng: 76.7767, tier: 'tier3' },
  { name: 'Sonipat', state: 'Haryana', lat: 28.9931, lng: 77.0151, tier: 'tier3' },
]

const CITY_MAP = new Map<string, IndianCity>()
for (const city of INDIAN_CITIES) {
  CITY_MAP.set(city.name.toLowerCase().trim(), city)
}

/**
 * Find a city by name (exact or case-insensitive partial).
 */
export function findCity(name: string): IndianCity | undefined {
  if (!name) return undefined
  const lower = name.toLowerCase().trim()
  const exact = CITY_MAP.get(lower)
  if (exact) return exact
  return INDIAN_CITIES.find((c) => c.name.toLowerCase().includes(lower))
}

/**
 * Filter cities matching query string with ranking (metro > tier1 > tier2 > tier3).
 */
export function searchCities(query: string, limit = 8): IndianCity[] {
  if (!query || !query.trim()) {
    // Return top popular metros
    return INDIAN_CITIES.slice(0, limit)
  }

  const clean = query.toLowerCase().trim()
  const tierWeight: Record<PopulationTier, number> = {
    metro: 4,
    tier1: 3,
    tier2: 2,
    tier3: 1,
  }

  return INDIAN_CITIES
    .filter(
      (c) =>
        c.name.toLowerCase().includes(clean) ||
        c.state.toLowerCase().includes(clean)
    )
    .sort((a, b) => {
      // Prioritize exact prefix match
      const aStarts = a.name.toLowerCase().startsWith(clean)
      const bStarts = b.name.toLowerCase().startsWith(clean)
      if (aStarts && !bStarts) return -1
      if (!aStarts && bStarts) return 1

      // Then tier weight
      return tierWeight[b.tier] - tierWeight[a.tier]
    })
    .slice(0, limit)
}

/**
 * Haversine formula to compute great-circle distance in kilometers.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

/**
 * Get road/transit distance between two city names.
 * Applies a 1.22 road tortuosity factor to straight-line distance.
 */
export function getRouteDistance(fromName: string, toName: string): number | null {
  const c1 = findCity(fromName)
  const c2 = findCity(toName)
  if (!c1 || !c2) return null
  if (c1.name.toLowerCase() === c2.name.toLowerCase()) return 0

  const straightLine = haversineDistance(c1.lat, c1.lng, c2.lat, c2.lng)
  // Approximate driving road distance
  return Math.round(straightLine * 1.22)
}

export type RouteEstimate = {
  distanceKm: number
  driveHours: number
  trainHours: number
  flightHours: number | null
  recommendedVehicle: 'car' | 'train' | 'flight'
  basePriceEstimate: number
}

/**
 * Calculate full route travel estimates between two cities.
 */
export function getRouteEstimate(fromName: string, toName: string): RouteEstimate | null {
  const distanceKm = getRouteDistance(fromName, toName)
  if (distanceKm === null || distanceKm <= 0) return null

  // Avg speeds: Car ~60km/h with stops, Train ~75km/h, Flight ~600km/h + 2h airport
  const driveHours = Number((distanceKm / 58).toFixed(1))
  const trainHours = Number((distanceKm / 72).toFixed(1))
  const flightHours =
    distanceKm > 350
      ? Number((distanceKm / 550 + 1.8).toFixed(1))
      : null

  let recommendedVehicle: 'car' | 'train' | 'flight' = 'car'
  if (distanceKm > 700 && flightHours !== null) {
    recommendedVehicle = 'flight'
  } else if (distanceKm > 250) {
    recommendedVehicle = 'train'
  }

  // Realistic base price estimate per kg
  // Short (<200km): ₹40-60/kg, Medium (200-600km): ₹60-90/kg, Long (>600km): ₹100-140/kg
  let basePriceEstimate = 50
  if (distanceKm > 600) {
    basePriceEstimate = Math.min(150, Math.round(90 + (distanceKm - 600) * 0.06))
  } else if (distanceKm > 200) {
    basePriceEstimate = Math.round(50 + (distanceKm - 200) * 0.1)
  }

  return {
    distanceKm,
    driveHours,
    trainHours,
    flightHours,
    recommendedVehicle,
    basePriceEstimate,
  }
}
