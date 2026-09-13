import { getSupabaseClient } from '@/template';
import { disabledFeatureMessage, FeatureFlags } from '@/constants/featureFlags';
import * as Location from 'expo-location';

import { INDIAN_CITIES, IndianCity, haversineDistance } from '@/constants/indian-cities';

function normalizeCityName(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

let cachedCityDetection: {
  lat: number;
  lng: number;
  city: string;
  timestamp: number;
} | null = null;

const CITY_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const CITY_ALIASES: Record<string, string> = {
  bengaluru: 'Bangalore',
  bangalore: 'Bangalore',
  gurugram: 'Gurugram',
  gurgaon: 'Gurugram',
  noida: 'Noida',
  ghaziabad: 'Delhi',
  faridabad: 'Faridabad',
  'new delhi': 'Delhi',
  delhi: 'Delhi',
  calcutta: 'Kolkata',
  kolkata: 'Kolkata',
  madras: 'Chennai',
  chennai: 'Chennai',
  bombay: 'Mumbai',
  mumbai: 'Mumbai',
  'navi mumbai': 'Mumbai',
  thane: 'Mumbai',
  pune: 'Pune',
  pimpri: 'Pune',
  chinchwad: 'Pune',
  hyderabad: 'Hyderabad',
  secunderabad: 'Hyderabad',
  prayagraj: 'Allahabad',
  allahabad: 'Allahabad',
  puducherry: 'Pondicherry',
  pondicherry: 'Pondicherry',
  banaras: 'Varanasi',
  kashi: 'Varanasi',
  varanasi: 'Varanasi',
  trivandrum: 'Thiruvananthapuram',
  thiruvananthapuram: 'Thiruvananthapuram',
  cochin: 'Kochi',
  kochi: 'Kochi',
  vizag: 'Visakhapatnam',
  visakhapatnam: 'Visakhapatnam',
  baroda: 'Vadodara',
  vadodara: 'Vadodara',
  mysuru: 'Mysore',
  mysore: 'Mysore',
  mangaluru: 'Mangalore',
  mangalore: 'Mangalore',
};

function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms)),
  ]);
}

async function ensureForegroundPermission(): Promise<{ granted: boolean; error?: string }> {
  try {
    const existing = await Location.getForegroundPermissionsAsync();
    if (existing.status === 'granted') return { granted: true };

    if (existing.canAskAgain || existing.status === 'undetermined') {
      const requested = await Location.requestForegroundPermissionsAsync();
      if (requested.status === 'granted') return { granted: true };
    }

    return {
      granted: false,
      error: 'Location permission was denied. Please allow location access in your device settings.',
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Location permission check failed.';
    return { granted: false, error: msg };
  }
}

function findNearestIndianCity(lat: number, lng: number, maxDistanceKm = 100): { city: IndianCity; distanceKm: number } | null {
  let closest: IndianCity | null = null;
  let minDistance = Infinity;

  for (const city of INDIAN_CITIES) {
    const dist = haversineDistance(lat, lng, city.lat, city.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closest = city;
    }
  }

  if (closest && minDistance <= maxDistanceKm) {
    return { city: closest, distanceKm: minDistance };
  }
  return null;
}

export async function detectCurrentCity(): Promise<{ data: string | null; error: string | null }> {
  try {
    const perm = await ensureForegroundPermission();
    if (!perm.granted) {
      return { data: null, error: perm.error || 'Location permission denied.' };
    }

    // Check if device location services are enabled
    const servicesEnabled = await Location.hasServicesEnabledAsync().catch(() => true);
    if (!servicesEnabled) {
      return { data: null, error: 'Location services (GPS) are turned off. Please turn them on in device settings.' };
    }

    let coords: { latitude: number; longitude: number } | null = null;

    // Tier 1: Fast cached / last known position (< 50ms)
    try {
      const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 1000 * 60 * 30 });
      if (lastKnown?.coords) {
        coords = {
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
        };
      }
    } catch {
      // Proceed to active location request
    }

    // Tier 2: Active location request with balanced accuracy
    if (!coords) {
      try {
        const current = await withTimeout(
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          5500,
          'Location request timed out'
        );
        if (current?.coords) {
          coords = {
            latitude: current.coords.latitude,
            longitude: current.coords.longitude,
          };
        }
      } catch {
        // Tier 3: Fast low-accuracy fallback (Wi-Fi/Cellular, works indoors reliably)
        try {
          const fallback = await withTimeout(
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest }),
            4000,
            'Low-accuracy location timed out'
          );
          if (fallback?.coords) {
            coords = {
              latitude: fallback.coords.latitude,
              longitude: fallback.coords.longitude,
            };
          }
        } catch {
          // Tier 4: Any previous known position as emergency fallback
          const anyLastKnown = await Location.getLastKnownPositionAsync().catch(() => null);
          if (anyLastKnown?.coords) {
            coords = {
              latitude: anyLastKnown.coords.latitude,
              longitude: anyLastKnown.coords.longitude,
            };
          }
        }
      }
    }

    if (!coords) {
      return { data: null, error: 'Unable to acquire GPS coordinates. Please check your signal or select your city manually.' };
    }

    const { latitude: lat, longitude: lng } = coords;
    const now = Date.now();

    // Check in-memory cache
    if (
      cachedCityDetection &&
      now - cachedCityDetection.timestamp < CITY_CACHE_TTL_MS &&
      haversineDistance(lat, lng, cachedCityDetection.lat, cachedCityDetection.lng) < 3.0
    ) {
      return { data: cachedCityDetection.city, error: null };
    }

    let detectedCity: string | null = null;

    // Attempt reverse geocoding with a 4s timeout
    try {
      const addresses = await withTimeout(
        Location.reverseGeocodeAsync({ latitude: lat, longitude: lng }),
        4000,
        'Reverse geocoding timed out'
      );
      const address = addresses && addresses[0];
      if (address) {
        const rawCity = address.city || address.subregion || address.district || address.region;
        if (rawCity) {
          const lower = rawCity.toLowerCase().trim();

          // 1. Check known aliases
          for (const [alias, canonical] of Object.entries(CITY_ALIASES)) {
            if (lower === alias || lower.includes(alias)) {
              detectedCity = canonical;
              break;
            }
          }

          // 2. Direct match against Indian cities list
          if (!detectedCity) {
            const matched = INDIAN_CITIES.find(
              (c) => c.name.toLowerCase() === lower || lower.includes(c.name.toLowerCase())
            );
            if (matched) {
              detectedCity = matched.name;
            } else if (address.city) {
              detectedCity = normalizeCityName(address.city);
            } else if (address.district) {
              detectedCity = normalizeCityName(address.district);
            } else if (address.subregion) {
              detectedCity = normalizeCityName(address.subregion);
            }
          }
        }
      }
    } catch {
      // Reverse geocoding failed or timed out — fallback to nearest Indian city below
    }

    if (detectedCity) {
      detectedCity = detectedCity.replace(/\s+district$/i, '').trim();
    }

    // 3. Coordinate-based fallback: Find closest Indian city within 90km radius
    if (!detectedCity) {
      const nearest = findNearestIndianCity(lat, lng, 90);
      if (nearest) {
        detectedCity = nearest.city.name;
      }
    }

    // 4. Wider search radius (up to 200km) if in an adjacent regional area
    if (!detectedCity) {
      const nearestRegional = findNearestIndianCity(lat, lng, 200);
      if (nearestRegional) {
        detectedCity = nearestRegional.city.name;
      }
    }

    if (!detectedCity) {
      return { data: null, error: 'Could not detect a recognized nearby city. Please select your city from the list.' };
    }

    cachedCityDetection = { lat, lng, city: detectedCity, timestamp: now };
    return { data: detectedCity, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not get your current location right now.';
    return { data: null, error: message };
  }
}

export async function requestLocationPermission(): Promise<boolean> {
  const res = await ensureForegroundPermission();
  return res.granted;
}

export async function getCurrentLocation() {
  if (!FeatureFlags.preciseLocationSharing) {
    return { data: null, error: disabledFeatureMessage.location };
  }
  try {
    const { granted } = await ensureForegroundPermission();
    if (!granted) return { data: null, error: 'Permission denied' };
    const location = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      7000,
      'Location timed out'
    );
    return { data: { lat: location.coords.latitude, lng: location.coords.longitude }, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not get location';
    return { data: null, error: message };
  }
}

export async function updateDeliveryLocation(deliveryId: string, lat: number, lng: number, userId: string) {
  if (!FeatureFlags.preciseLocationSharing) return { error: disabledFeatureMessage.location };
  const sb = getSupabaseClient();

  const { data: { user } } = await sb.auth.getUser();
  if (!user || user.id !== userId) return { error: 'Unauthorized' };
  const { error } = await sb.rpc('update_delivery_location', {
    p_delivery_id: deliveryId,
    p_lat: lat,
    p_lng: lng,
  });
  if (error) return { error: error.message };
  return { error: null };
}

export async function fetchDeliveryLocation(deliveryId: string) {
  if (!FeatureFlags.preciseLocationSharing) {
    return { data: null, error: disabledFeatureMessage.location };
  }
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('deliveries')
    .select('traveller_lat, traveller_lng, location_updated_at')
    .eq('id', deliveryId)
    .single();
  if (error) return { data: null, error: error.message };
  if (!data?.traveller_lat || !data?.traveller_lng) return { data: null, error: null };
  return {
    data: {
      lat: data.traveller_lat,
      lng: data.traveller_lng,
      updatedAt: data.location_updated_at || '',
    },
    error: null,
  };
}
