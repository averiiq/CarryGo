// Haryana Cities & Towns Coordinate Database (CaryGoo Regional Launch)

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
 * Haryana Cities, Towns & Transit Villages Database
 * Contains Haryana districts, municipal corporations, tehsils, industrial hubs,
 * and key transit villages along National & State Highway corridors.
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
  { name: 'Ballabgarh', state: 'Haryana', lat: 28.3417, lng: 77.3333, tier: 'tier2' },
  { name: 'Dharuhera', state: 'Haryana', lat: 28.2056, lng: 76.7917, tier: 'tier2' },

  // District Headquarters, Sub-Divisions & Highway Towns (Tier 3)
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

  // Key Highway Towns, Industrial Corridors & Transit Villages (Tier 3)
  // NH-44 GT Road Corridor
  { name: 'Kundli', state: 'Haryana', lat: 28.8752, lng: 77.1264, tier: 'tier3' },
  { name: 'Rai', state: 'Haryana', lat: 28.9328, lng: 77.0984, tier: 'tier3' },
  { name: 'Murthal', state: 'Haryana', lat: 29.0289, lng: 77.0739, tier: 'tier3' },
  { name: 'Bapoli', state: 'Haryana', lat: 29.3242, lng: 77.0850, tier: 'tier3' },
  { name: 'Israna', state: 'Haryana', lat: 29.2742, lng: 76.8533, tier: 'tier3' },
  { name: 'Madlauda', state: 'Haryana', lat: 29.4583, lng: 76.8550, tier: 'tier3' },
  { name: 'Pipli', state: 'Haryana', lat: 29.9822, lng: 76.8833, tier: 'tier3' },
  { name: 'Babain', state: 'Haryana', lat: 30.0753, lng: 77.0375, tier: 'tier3' },

  // NH-48 & Gurugram / Sohna / Rewari Corridor
  { name: 'Badshahpur', state: 'Haryana', lat: 28.3931, lng: 77.0542, tier: 'tier3' },
  { name: 'Bhondsi', state: 'Haryana', lat: 28.3510, lng: 77.0670, tier: 'tier3' },
  { name: 'Kherki Daula', state: 'Haryana', lat: 28.3980, lng: 76.9850, tier: 'tier3' },
  { name: 'Bilaspur', state: 'Haryana', lat: 28.3183, lng: 76.8717, tier: 'tier3' },
  { name: 'Pachgaon', state: 'Haryana', lat: 28.3240, lng: 76.9050, tier: 'tier3' },
  { name: 'Farrukhnagar', state: 'Haryana', lat: 28.4500, lng: 76.8167, tier: 'tier3' },
  { name: 'Khol', state: 'Haryana', lat: 28.2333, lng: 76.4500, tier: 'tier3' },
  { name: 'Dahina', state: 'Haryana', lat: 28.3000, lng: 76.3500, tier: 'tier3' },

  // Rohtak / Jhajjar / Sonipat Corridor
  { name: 'Rohad', state: 'Haryana', lat: 28.7210, lng: 76.8540, tier: 'tier3' },
  { name: 'Asaudha', state: 'Haryana', lat: 28.7350, lng: 76.8820, tier: 'tier3' },
  { name: 'Badli', state: 'Haryana', lat: 28.5833, lng: 76.8167, tier: 'tier3' },
  { name: 'Dighal', state: 'Haryana', lat: 28.7333, lng: 76.6500, tier: 'tier3' },
  { name: 'Matanhail', state: 'Haryana', lat: 28.4500, lng: 76.5167, tier: 'tier3' },
  { name: 'Kalanaur', state: 'Haryana', lat: 28.8333, lng: 76.4000, tier: 'tier3' },
  { name: 'Mundlana', state: 'Haryana', lat: 29.1833, lng: 76.8167, tier: 'tier3' },

  // Hisar / Sirsa / Bhiwani / Fatehabad Corridor
  { name: 'Agroha', state: 'Haryana', lat: 29.3500, lng: 75.6167, tier: 'tier3' },
  { name: 'Balsamand', state: 'Haryana', lat: 28.9833, lng: 75.4500, tier: 'tier3' },
  { name: 'Adampur', state: 'Haryana', lat: 29.2833, lng: 75.4500, tier: 'tier3' },
  { name: 'Bhattu Kalan', state: 'Haryana', lat: 29.3833, lng: 75.3500, tier: 'tier3' },
  { name: 'Ding', state: 'Haryana', lat: 29.4167, lng: 75.1833, tier: 'tier3' },
  { name: 'Bawani Khera', state: 'Haryana', lat: 28.9500, lng: 76.0167, tier: 'tier3' },
  { name: 'Mundhal Khurd', state: 'Haryana', lat: 29.0333, lng: 76.1167, tier: 'tier3' },
  { name: 'Behal', state: 'Haryana', lat: 28.5167, lng: 75.6167, tier: 'tier3' },
  { name: 'Jui Khurd', state: 'Haryana', lat: 28.6667, lng: 75.8833, tier: 'tier3' },
  { name: 'Kalanwali', state: 'Haryana', lat: 29.8333, lng: 74.9833, tier: 'tier3' },
  { name: 'Nathusari Chopta', state: 'Haryana', lat: 29.4333, lng: 75.0167, tier: 'tier3' },

  // Jind / Kaithal / Kurukshetra Corridor
  { name: 'Julana', state: 'Haryana', lat: 29.1167, lng: 76.3833, tier: 'tier3' },
  { name: 'Pillukhera', state: 'Haryana', lat: 29.2667, lng: 76.5167, tier: 'tier3' },
  { name: 'Uchana', state: 'Haryana', lat: 29.4667, lng: 76.1667, tier: 'tier3' },
  { name: 'Alewa', state: 'Haryana', lat: 29.4833, lng: 76.3500, tier: 'tier3' },
  { name: 'Dhand', state: 'Haryana', lat: 29.8833, lng: 76.5500, tier: 'tier3' },
  { name: 'Siwan', state: 'Haryana', lat: 29.9500, lng: 76.3500, tier: 'tier3' },
  { name: 'Guhla', state: 'Haryana', lat: 30.0333, lng: 76.3000, tier: 'tier3' },
  { name: 'Ismailabad', state: 'Haryana', lat: 30.1167, lng: 76.7833, tier: 'tier3' },

  // Ambala / Yamunanagar / Panchkula Corridor
  { name: 'Saha', state: 'Haryana', lat: 30.2500, lng: 76.9667, tier: 'tier3' },
  { name: 'Barara', state: 'Haryana', lat: 30.2167, lng: 77.0500, tier: 'tier3' },
  { name: 'Mullana', state: 'Haryana', lat: 30.2500, lng: 77.0500, tier: 'tier3' },
  { name: 'Shahzadpur', state: 'Haryana', lat: 30.4333, lng: 77.0167, tier: 'tier3' },
  { name: 'Sadhaura', state: 'Haryana', lat: 30.3833, lng: 77.2167, tier: 'tier3' },
  { name: 'Bilaspur (Yamunanagar)', state: 'Haryana', lat: 30.3000, lng: 77.3000, tier: 'tier3' },
  { name: 'Chhachhrauli', state: 'Haryana', lat: 30.2500, lng: 77.3667, tier: 'tier3' },
  { name: 'Hathnikund', state: 'Haryana', lat: 30.3167, lng: 77.5833, tier: 'tier3' },
  { name: 'Mustafabad', state: 'Haryana', lat: 30.2000, lng: 77.1500, tier: 'tier3' },
  { name: 'Raipur Rani', state: 'Haryana', lat: 30.6500, lng: 77.0167, tier: 'tier3' },
  { name: 'Barwala (Panchkula)', state: 'Haryana', lat: 30.5667, lng: 76.9167, tier: 'tier3' },

  // Faridabad / Palwal / Hodal Corridor
  { name: 'Sikri', state: 'Haryana', lat: 28.2833, lng: 77.3333, tier: 'tier3' },
  { name: 'Prithla', state: 'Haryana', lat: 28.2333, lng: 77.3167, tier: 'tier3' },
  { name: 'Alawalpur', state: 'Haryana', lat: 28.1667, lng: 77.2833, tier: 'tier3' },
  { name: 'Aurangabad', state: 'Haryana', lat: 28.0500, lng: 77.3667, tier: 'tier3' },
  { name: 'Hassanpur', state: 'Haryana', lat: 27.9833, lng: 77.4833, tier: 'tier3' },
  { name: 'Mandkola', state: 'Haryana', lat: 28.1833, lng: 77.1667, tier: 'tier3' },
  { name: 'Nagina', state: 'Haryana', lat: 27.9333, lng: 77.0000, tier: 'tier3' },
  { name: 'Pinangwan', state: 'Haryana', lat: 27.9000, lng: 77.1000, tier: 'tier3' },

  // Mahendragarh / Narnaul Corridor
  { name: 'Kanina', state: 'Haryana', lat: 28.3167, lng: 76.3167, tier: 'tier3' },
  { name: 'Ateli', state: 'Haryana', lat: 28.1000, lng: 76.2667, tier: 'tier3' },
  { name: 'Nangal Chaudhry', state: 'Haryana', lat: 27.8833, lng: 76.1167, tier: 'tier3' },
  { name: 'Satnali', state: 'Haryana', lat: 28.3167, lng: 75.9833, tier: 'tier3' },

  // Key Border Transit Gateways
  { name: 'Zirakpur', state: 'Punjab', lat: 30.6425, lng: 76.8173, tier: 'tier2' },
  { name: 'Dera Bassi', state: 'Punjab', lat: 30.5833, lng: 76.8500, tier: 'tier3' },
  { name: 'Noida', state: 'Uttar Pradesh', lat: 28.5355, lng: 77.3910, tier: 'tier1' },
  { name: 'Greater Noida', state: 'Uttar Pradesh', lat: 28.4744, lng: 77.5040, tier: 'tier1' },
  { name: 'Ghaziabad', state: 'Uttar Pradesh', lat: 28.6692, lng: 77.4538, tier: 'tier1' },
];

/**
 * Primary exported city list. In this release, CaryGoo is launching in Haryana and NCR corridors.
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
  'murthal': 'Murthal',
  'kundli': 'Kundli',
  'dharuhera': 'Dharuhera',
  'ballabgarh': 'Ballabgarh',
  'ballabhgarh': 'Ballabgarh',
  'agroha': 'Agroha',
  'zirakpur': 'Zirakpur',
  'derabassi': 'Dera Bassi',
  'noida': 'Noida',
  'greater noida': 'Greater Noida',
  'ghaziabad': 'Ghaziabad',
  'manesar': 'Manesar',
  'bilaspur': 'Bilaspur',
};

/**
 * Optional regional transit gateway hubs for corridor calculations only.
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
 */
export function findCity(name: string): IndianCity | undefined {
  if (!name || typeof name !== 'string') return undefined;
  const lower = name.toLowerCase().trim();

  // Check aliases first
  const aliasTarget = CITY_ALIASES[lower];
  if (aliasTarget) {
    const aliasedCity = CITY_MAP.get(aliasTarget.toLowerCase());
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
