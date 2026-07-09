import { getSupabaseClient } from '@/template';
import { disabledFeatureMessage, FeatureFlags } from '@/constants/featureFlags';
import * as Location from 'expo-location';

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

export async function updateDeliveryLocation(deliveryId: string, lat: number, lng: number) {
  if (!FeatureFlags.preciseLocationSharing) return { error: disabledFeatureMessage.location };
  const sb = getSupabaseClient();
  const { error } = await sb.from('deliveries').update({
    traveller_lat: lat,
    traveller_lng: lng,
    location_updated_at: new Date().toISOString(),
  }).eq('id', deliveryId);
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
  if (!data?.traveller_lat) return { data: null, error: null };
  return {
    data: {
      lat: parseFloat(data.traveller_lat),
      lng: parseFloat(data.traveller_lng),
      updatedAt: data.location_updated_at,
    },
    error: null,
  };
}
