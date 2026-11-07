import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabaseClient } from '@/template';
import {
  HARYANA_CITIES,
  findCity,
  getDistance,
  IndianCity,
} from '@/constants/indian-cities';

const CORRIDOR_USAGE_KEY = 'CARRYGO_DYNAMIC_CORRIDOR_USAGE_V2';

export interface PopularCorridor {
  id: string;
  fromCity: string;
  toCity: string;
  label: string;
  distance: string;
  usageCount: number;
  lastUsedAt: number;
}

// Permitted gateway cities (Delhi NCR / Chandigarh)
const PERMITTED_GATEWAYS = ['Delhi', 'New Delhi', 'Chandigarh'];

/**
 * Validates whether a city belongs to Haryana or the allowed Delhi/Chandigarh gateways.
 * Strictly excludes out-of-region cities (like Jaipur, Agra, Mumbai, etc.).
 */
export function isPermittedCorridorCity(cityName: string): boolean {
  if (!cityName) return false;
  const clean = cityName.trim().toLowerCase();

  // Check permitted gateways (Delhi, Chandigarh)
  if (PERMITTED_GATEWAYS.some((gw) => gw.toLowerCase() === clean)) {
    return true;
  }

  // Check aliases (e.g. gurgaon -> Gurugram, dilli -> Delhi)
  if (clean === 'gurgaon' || clean === 'sonepat' || clean === 'dilli' || clean === 'delhi ncr') {
    return true;
  }

  // Check Haryana database
  const city = findCity(cityName);
  if (!city) return false;

  return city.state.toLowerCase() === 'haryana' || city.state.toLowerCase() === 'delhi' || city.state.toLowerCase() === 'chandigarh';
}

/**
 * Normalizes city name to canonical database representation.
 */
export function normalizeCorridorCity(city: string): string {
  const clean = city.trim();
  const lower = clean.toLowerCase();
  if (lower === 'gurgaon') return 'Gurugram';
  if (lower === 'sonepat') return 'Sonipat';
  if (lower === 'dilli' || lower === 'delhi ncr' || lower === 'new delhi') return 'Delhi';
  const found = findCity(clean);
  return found ? found.name : clean;
}

/**
 * Validates that a route connects strictly within Haryana or between Haryana and Delhi/Chandigarh.
 */
export function isValidHaryanaDelhiCorridor(fromCity: string, toCity: string): boolean {
  if (!fromCity || !toCity) return false;
  const normFrom = normalizeCorridorCity(fromCity);
  const normTo = normalizeCorridorCity(toCity);

  if (normFrom.toLowerCase() === normTo.toLowerCase()) return false;
  if (!isPermittedCorridorCity(normFrom) || !isPermittedCorridorCity(normTo)) return false;

  return true;
}

/**
 * Base seed corridors strictly restricted to Haryana and Delhi corridors.
 * Guaranteed zero out-of-Haryana cities like Jaipur or Agra.
 */
const SEED_HARYANA_DELHI_CORRIDORS: [string, string][] = [
  ['Delhi', 'Gurugram'],
  ['Gurugram', 'Rohtak'],
  ['Delhi', 'Faridabad'],
  ['Delhi', 'Chandigarh'],
  ['Faridabad', 'Karnal'],
  ['Panipat', 'Ambala'],
  ['Hisar', 'Sonipat'],
  ['Rewari', 'Gurugram'],
  ['Delhi', 'Panipat'],
  ['Delhi', 'Rohtak'],
];

interface StoredCorridorUsage {
  fromCity: string;
  toCity: string;
  count: number;
  lastUsedAt: number;
}

/**
 * Canonical route key (bidirectional).
 */
function makeCanonicalKey(cityA: string, cityB: string): string {
  const normA = normalizeCorridorCity(cityA);
  const normB = normalizeCorridorCity(cityB);
  return [normA, normB].sort().join('__');
}

/**
 * Records user interaction or trip/parcel creation on a corridor.
 * Dynamically updates frequency and recency.
 */
export async function recordCorridorUsage(fromCity: string, toCity: string): Promise<void> {
  if (!isValidHaryanaDelhiCorridor(fromCity, toCity)) return;

  const normFrom = normalizeCorridorCity(fromCity);
  const normTo = normalizeCorridorCity(toCity);
  const key = makeCanonicalKey(normFrom, normTo);

  try {
    const raw = await AsyncStorage.getItem(CORRIDOR_USAGE_KEY);
    const map: Record<string, StoredCorridorUsage> = raw ? JSON.parse(raw) : {};

    const existing = map[key] || {
      fromCity: normFrom,
      toCity: normTo,
      count: 0,
      lastUsedAt: Date.now(),
    };

    map[key] = {
      fromCity: existing.fromCity || normFrom,
      toCity: existing.toCity || normTo,
      count: existing.count + 1,
      lastUsedAt: Date.now(),
    };

    await AsyncStorage.setItem(CORRIDOR_USAGE_KEY, JSON.stringify(map));
  } catch {
    // Non-blocking telemetry
  }
}

/**
 * Dynamic Algorithm: Calculates and returns popular corridors sorted by live popularity and recency.
 * 1. Checks user recorded corridor usage.
 * 2. Checks active marketplace listings from Supabase.
 * 3. Enforces Haryana + Delhi corridor boundaries (no out-of-region routes).
 * 4. Computes real-world distances dynamically using coordinates.
 */
export async function getDynamicPopularCorridors(limit: number = 8): Promise<PopularCorridor[]> {
  const routeScores = new Map<string, { fromCity: string; toCity: string; score: number; count: number; lastUsedAt: number }>();

  // 1. Initialize seed corridors
  for (let i = 0; i < SEED_HARYANA_DELHI_CORRIDORS.length; i++) {
    const [from, to] = SEED_HARYANA_DELHI_CORRIDORS[i];
    const key = makeCanonicalKey(from, to);
    // Base score descending so highest traffic natural corridors start on top
    const baseScore = Math.max(1, 10 - i);
    routeScores.set(key, {
      fromCity: from,
      toCity: to,
      score: baseScore,
      count: baseScore,
      lastUsedAt: 0,
    });
  }

  // 2. Fetch locally tracked usage
  try {
    const rawUsage = await AsyncStorage.getItem(CORRIDOR_USAGE_KEY);
    if (rawUsage) {
      const stored: Record<string, StoredCorridorUsage> = JSON.parse(rawUsage);
      const now = Date.now();
      const ONE_DAY = 24 * 60 * 60 * 1000;
      const ONE_WEEK = 7 * ONE_DAY;

      for (const [key, item] of Object.entries(stored)) {
        if (!isValidHaryanaDelhiCorridor(item.fromCity, item.toCity)) continue;

        let recencyBonus = 0;
        const age = now - item.lastUsedAt;
        if (age < ONE_DAY) recencyBonus = 15;
        else if (age < ONE_WEEK) recencyBonus = 7;

        const dynamicScore = (item.count * 5) + recencyBonus;

        const current = routeScores.get(key);
        if (current) {
          current.score += dynamicScore;
          current.count += item.count;
          current.lastUsedAt = Math.max(current.lastUsedAt, item.lastUsedAt);
        } else {
          routeScores.set(key, {
            fromCity: item.fromCity,
            toCity: item.toCity,
            score: 10 + dynamicScore,
            count: item.count,
            lastUsedAt: item.lastUsedAt,
          });
        }
      }
    }
  } catch {
    // Non-blocking fallback
  }

  // 3. Query active marketplace trips/parcels for live corridor density
  try {
    const sb = getSupabaseClient();
    const [tripsRes, parcelsRes] = await Promise.all([
      sb.from('trips').select('from_city, to_city, created_at').order('created_at', { ascending: false }).limit(40),
      sb.from('parcels').select('from_city, to_city, created_at').order('created_at', { ascending: false }).limit(40),
    ]);

    const activeListings = [
      ...(tripsRes.data || []).map((t: any) => ({ from: t.from_city, to: t.to_city, weight: 4 })),
      ...(parcelsRes.data || []).map((p: any) => ({ from: p.from_city, to: p.to_city, weight: 3 })),
    ];

    for (const listing of activeListings) {
      if (!listing.from || !listing.to) continue;
      if (!isValidHaryanaDelhiCorridor(listing.from, listing.to)) continue;

      const normFrom = normalizeCorridorCity(listing.from);
      const normTo = normalizeCorridorCity(listing.to);
      const key = makeCanonicalKey(normFrom, normTo);

      const current = routeScores.get(key);
      if (current) {
        current.score += listing.weight;
        current.count += 1;
      } else {
        routeScores.set(key, {
          fromCity: normFrom,
          toCity: normTo,
          score: 10 + listing.weight,
          count: 1,
          lastUsedAt: Date.now(),
        });
      }
    }
  } catch {
    // Silent network fallback
  }

  // 4. Sort by dynamic score descending
  const sorted = Array.from(routeScores.entries())
    .map(([key, data]) => ({
      key,
      ...data,
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.lastUsedAt - a.lastUsedAt;
    })
    .slice(0, limit);

  // 5. Build presentation models with dynamically computed distances
  return sorted.map((item) => {
    const c1 = findCity(item.fromCity);
    const c2 = findCity(item.toCity);
    const distNum = c1 && c2 ? getDistance(c1, c2) : 0;
    const distText = distNum > 0 ? `${Math.round(distNum)} km` : '';
    const id = `corridor_${item.fromCity.toLowerCase()}_${item.toCity.toLowerCase()}`;

    return {
      id,
      fromCity: item.fromCity,
      toCity: item.toCity,
      label: `${item.fromCity} ↔ ${item.toCity}`,
      distance: distText,
      usageCount: item.count,
      lastUsedAt: item.lastUsedAt,
    };
  });
}
