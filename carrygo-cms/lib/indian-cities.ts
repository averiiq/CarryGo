// Haryana Cities Coordinate & Route Intelligence Database
// Exclusively configured for Haryana State Launch across all 22 districts

export type PopulationTier = 'metro' | 'tier1' | 'tier2' | 'tier3'

export interface IndianCity {
  name: string
  state: string
  lat: number
  lng: number
  tier: PopulationTier
}

export const INDIAN_CITIES: readonly IndianCity[] = [
  // Primary Economic Hubs & NCR Metros in Haryana
  { name: 'Gurugram', state: 'Haryana', lat: 28.4595, lng: 77.0266, tier: 'metro' },
  { name: 'Faridabad', state: 'Haryana', lat: 28.4089, lng: 77.3178, tier: 'metro' },

  // Tier 1 / Major Industrial & District Hubs
  { name: 'Panipat', state: 'Haryana', lat: 29.3909, lng: 76.9635, tier: 'tier1' },
  { name: 'Ambala', state: 'Haryana', lat: 30.3782, lng: 76.7767, tier: 'tier1' },
  { name: 'Karnal', state: 'Haryana', lat: 29.6857, lng: 76.9905, tier: 'tier1' },
  { name: 'Rohtak', state: 'Haryana', lat: 28.8955, lng: 76.6066, tier: 'tier1' },
  { name: 'Hisar', state: 'Haryana', lat: 29.1492, lng: 75.7217, tier: 'tier1' },
  { name: 'Sonipat', state: 'Haryana', lat: 28.9931, lng: 77.0151, tier: 'tier1' },
  { name: 'Panchkula', state: 'Haryana', lat: 30.6942, lng: 76.8606, tier: 'tier1' },
  { name: 'Yamunanagar', state: 'Haryana', lat: 30.129, lng: 77.2674, tier: 'tier1' },

  // Tier 2 / Regional Commercial Corridors
  { name: 'Bahadurgarh', state: 'Haryana', lat: 28.6924, lng: 76.924, tier: 'tier2' },
  { name: 'Manesar', state: 'Haryana', lat: 28.3515, lng: 76.9404, tier: 'tier2' },
  { name: 'Rewari', state: 'Haryana', lat: 28.192, lng: 76.618, tier: 'tier2' },
  { name: 'Sirsa', state: 'Haryana', lat: 29.5349, lng: 75.0298, tier: 'tier2' },
  { name: 'Bhiwani', state: 'Haryana', lat: 28.7932, lng: 76.139, tier: 'tier2' },
  { name: 'Jind', state: 'Haryana', lat: 29.314, lng: 76.3142, tier: 'tier2' },
  { name: 'Palwal', state: 'Haryana', lat: 28.1447, lng: 77.326, tier: 'tier2' },
  { name: 'Kaithal', state: 'Haryana', lat: 29.8015, lng: 76.3996, tier: 'tier2' },
  { name: 'Thanesar', state: 'Haryana', lat: 29.9695, lng: 76.8783, tier: 'tier2' },
  { name: 'Kurukshetra', state: 'Haryana', lat: 29.9695, lng: 76.8783, tier: 'tier2' },

  // Tier 3 / District Headquarters & Key Transit Towns
  { name: 'Fatehabad', state: 'Haryana', lat: 29.5152, lng: 75.451, tier: 'tier3' },
  { name: 'Narnaul', state: 'Haryana', lat: 28.0435, lng: 76.1077, tier: 'tier3' },
  { name: 'Charkhi Dadri', state: 'Haryana', lat: 28.5921, lng: 76.2653, tier: 'tier3' },
  { name: 'Jhajjar', state: 'Haryana', lat: 28.6063, lng: 76.6565, tier: 'tier3' },
  { name: 'Nuh', state: 'Haryana', lat: 28.1066, lng: 77.0094, tier: 'tier3' },
  { name: 'Hansi', state: 'Haryana', lat: 29.1011, lng: 75.962, tier: 'tier3' },
  { name: 'Kalka', state: 'Haryana', lat: 30.8336, lng: 76.9351, tier: 'tier3' },
  { name: 'Tohana', state: 'Haryana', lat: 29.7042, lng: 75.9067, tier: 'tier3' },
  { name: 'Gohana', state: 'Haryana', lat: 29.1384, lng: 76.6976, tier: 'tier3' },
  { name: 'Hodal', state: 'Haryana', lat: 27.8931, lng: 77.3694, tier: 'tier3' },
  { name: 'Pundri', state: 'Haryana', lat: 29.7562, lng: 76.5621, tier: 'tier3' },
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
    // Return top popular hubs
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
 * Calculate full route travel estimates between two Haryana cities.
 */
export function getRouteEstimate(fromName: string, toName: string): RouteEstimate | null {
  const distanceKm = getRouteDistance(fromName, toName)
  if (distanceKm === null || distanceKm <= 0) return null

  // Avg speeds across Haryana expressways and NH-44: Car ~65km/h, Train ~70km/h
  const driveHours = Number((distanceKm / 65).toFixed(1))
  const trainHours = Number((distanceKm / 68).toFixed(1))
  const flightHours = null

  const recommendedVehicle: 'car' | 'train' | 'flight' = distanceKm > 140 ? 'train' : 'car'

  // Affordable intercity peer-to-peer rates within Haryana
  let basePriceEstimate = 35
  if (distanceKm > 150) {
    basePriceEstimate = Math.min(100, Math.round(65 + (distanceKm - 150) * 0.18))
  } else if (distanceKm > 60) {
    basePriceEstimate = Math.round(40 + (distanceKm - 60) * 0.25)
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
