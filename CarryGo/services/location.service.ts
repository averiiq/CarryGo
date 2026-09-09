import { getSupabaseClient } from '@/template';
import { disabledFeatureMessage, FeatureFlags } from '@/constants/featureFlags';
import * as Location from 'expo-location';

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

function calculateSimpleDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLat = (lat2 - lat1) * 111;
  const dLon = (lon2 - lon1) * 111 * Math.cos((lat1 * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLon * dLon);
}

function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms)),
  ]);
}

async function ensureForegroundPermission(): Promise<boolean> {
  try {
    const existing = await Location.getForegroundPermissionsAsync();
    if (existing.status === 'granted') return true;
    const requested = await Location.requestForegroundPermissionsAsync();
    return requested.status === 'granted';
  } catch {
    return false;
  }
}

export async function detectCurrentCity() {
  try {
    const granted = await ensureForegroundPermission();
    if (!granted) {
      return { data: null, error: 'Location permission denied. Enable it to auto-fill your city.' };
    }

    const location = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      7000,
      'Location request timed out. Please check your GPS signal.'
    );

    const lat = location.coords.latitude;
    const lng = location.coords.longitude;
    const now = Date.now();

    // Check cache
    if (
      cachedCityDetection &&
      now - cachedCityDetection.timestamp < CITY_CACHE_TTL_MS &&
      calculateSimpleDistanceKm(lat, lng, cachedCityDetection.lat, cachedCityDetection.lng) < 2.0
    ) {
      return { data: cachedCityDetection.city, error: null };
    }

    const addresses = await withTimeout(
      Location.reverseGeocodeAsync({ latitude: lat, longitude: lng }),
      6000,
      'Reverse geocoding timed out.'
    );
    const address = addresses[0];

    const detectedCity =
      normalizeCityName(address?.city) ??
      normalizeCityName(address?.subregion) ??
      normalizeCityName(address?.district) ??
      normalizeCityName(address?.region);

    if (!detectedCity) {
      return { data: null, error: 'Unable to detect a nearby city from your current location.' };
    }

    cachedCityDetection = { lat, lng, city: detectedCity, timestamp: now };
    return { data: detectedCity, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not get your current location right now.';
    return { data: null, error: message };
  }
}

export async function requestLocationPermission(): Promise<boolean> {
  return ensureForegroundPermission();
}

export async function getCurrentLocation() {
  if (!FeatureFlags.preciseLocationSharing) {
    return { data: null, error: disabledFeatureMessage.location };
  }
  try {
    const granted = await ensureForegroundPermission();
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
