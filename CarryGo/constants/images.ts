import { CLOUDINARY_CONFIG, buildCloudinaryUrl } from '@/lib/cloudinary/config';
import { ImageSourcePropType } from 'react-native';

export const VEHICLE_IMAGES: Record<string, ImageSourcePropType> = {
  car: require('@/assets/images/vehicles/car.jpg'),
  bike: require('@/assets/images/vehicles/bike.jpg'),
  bus: require('@/assets/images/vehicles/bus.jpg'),
  train: require('@/assets/images/vehicles/train.jpg'),
  flight: require('@/assets/images/vehicles/flight.jpg'),
};

export const CATEGORY_IMAGES: Record<string, ImageSourcePropType> = {
  documents: require('@/assets/images/categories/documents.jpg'),
  electronics: require('@/assets/images/categories/electronics.jpg'),
  clothing: require('@/assets/images/categories/clothing.jpg'),
  food: require('@/assets/images/categories/food.jpg'),
  medicine: require('@/assets/images/categories/medicine.jpg'),
  other: require('@/assets/images/categories/other.jpg'),
};

export function getVehicleImage(vehicleType?: string | null): ImageSourcePropType {
  const key = (vehicleType || 'car').toLowerCase();
  return VEHICLE_IMAGES[key] || VEHICLE_IMAGES.car;
}

export function getCategoryFallbackImage(category?: string | null): ImageSourcePropType {
  const key = (category || 'other').toLowerCase();
  return CATEGORY_IMAGES[key] || CATEGORY_IMAGES.other;
}

/**
 * Resolves any avatar or parcel image uri to a displayable remote/local URI.
 * Supports:
 * - Full HTTP/HTTPS URLs (e.g. from Cloudinary secure_url or CDN)
 * - Base64 data URIs
 * - Local file/content URIs
 * - Cloudinary publicIds stored without domain (e.g. "carrygo/xyz" or "avatars/...")
 */
export function resolveImageUrl(uri?: string | null): string | undefined {
  if (!uri || typeof uri !== 'string') return undefined;
  const trimmed = uri.trim();
  if (trimmed.length === 0) return undefined;

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('file://') ||
    trimmed.startsWith('content://')
  ) {
    return trimmed;
  }

  // Cloudinary publicId fallback
  if (CLOUDINARY_CONFIG.cloudName) {
    return buildCloudinaryUrl(trimmed);
  }

  return undefined;
}
