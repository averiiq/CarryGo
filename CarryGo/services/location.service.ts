import { getSupabaseClient } from '@/template';
import { disabledFeatureMessage, FeatureFlags } from '@/constants/featureFlags';
import * as Location from 'expo-location';

function normalizeCityName(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function detectCurrentCity() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return { data: null, error: 'Location permission denied. Enable it to auto-fill your city.' };
    }

    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const [address] = await Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });

    const detectedCity =
      normalizeCityName(address?.city) ??
      normalizeCityName(address?.subregion) ??
      normalizeCityName(address?.district) ??
      normalizeCityName(address?.region);

    if (!detectedCity) {
      return { data: null, error: 'Unable to detect a nearby city from your current location.' };
    }

    return { data: detectedCity, error: null };
  } catch {
    return { data: null, error: 'Could not get your current location right now.' };
  }
}

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function getCurrentLocation() {
  if (!FeatureFlags.preciseLocationSharing) {
    return { data: null, error: disabledFeatureMessage.location };
  }
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return { data: null, error: 'Permission denied' };
    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { data: { lat: location.coords.latitude, lng: location.coords.longitude }, error: null };
  } catch {
    return { data: null, error: 'Could not get location' };
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
