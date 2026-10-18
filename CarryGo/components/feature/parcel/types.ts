import { ParcelCategory } from '@/types';
import { MaterialIcons } from '@expo/vector-icons';
import { toLocalDateKey } from '@/components/feature/SevenDaySchedulePicker';

export type ParcelDraft = {
  fromCity: string;
  toCity: string;
  deliveryDate: string;
  preferredTime?: string;
  category: ParcelCategory;
  description: string;
  weight: string;
  priceOffer: string;
  images: string[];
};

export const EMPTY_PARCEL_DRAFT: ParcelDraft = {
  fromCity: '',
  toCity: '',
  deliveryDate: '',
  preferredTime: 'anytime',
  category: 'documents',
  description: '',
  weight: '',
  priceOffer: '',
  images: [],
};

export const PARCEL_CATEGORY_IMAGES: Record<ParcelCategory, any> = {
  documents: require('@/assets/images/categories/documents.jpg'),
  electronics: require('@/assets/images/categories/electronics.jpg'),
  clothing: require('@/assets/images/categories/clothing.jpg'),
  food: require('@/assets/images/categories/food.jpg'),
  medicine: require('@/assets/images/categories/medicine.jpg'),
  other: require('@/assets/images/categories/other.jpg'),
};

export const PARCEL_CATEGORIES: {
  type: ParcelCategory;
  label: string;
  tagline: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
}[] = [
  { type: 'documents', label: 'Documents', tagline: 'Letters, books & files', icon: 'description', color: '#2563EB' },
  { type: 'electronics', label: 'Electronics', tagline: 'Phones, tech & gadgets', icon: 'devices', color: '#059669' },
  { type: 'clothing', label: 'Clothing', tagline: 'Apparel, shoes & wear', icon: 'checkroom', color: '#7C3AED' },
  { type: 'food', label: 'Food & Sweets', tagline: 'Packaged dry foods', icon: 'restaurant', color: '#EA580C' },
  { type: 'medicine', label: 'Medicine', tagline: 'Healthcare & pharma', icon: 'local-pharmacy', color: '#DB2777' },
  { type: 'other', label: 'General / Box', tagline: 'Cartons & parcels', icon: 'inventory-2', color: '#4F46E5' },
];

export const PREFERRED_TIME_PRESETS = [
  { id: 'anytime', label: 'Anytime', icon: 'schedule' as const, timeRange: 'All day' },
  { id: 'morning', label: 'Morning', icon: 'wb-sunny' as const, timeRange: '08:00 – 12:00' },
  { id: 'afternoon', label: 'Afternoon', icon: 'wb-twilight' as const, timeRange: '12:00 – 17:00' },
  { id: 'evening', label: 'Evening', icon: 'nights-stay' as const, timeRange: '17:00 – 21:00' },
];

export const PARCEL_WEIGHT_PRESETS = ['0.5', '1', '2', '5'];
export const PARCEL_OFFER_PRESETS = ['100', '200', '500', '1000'];

export function normalizeParcelCity(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

export function validateParcelRoute(
  draft: ParcelDraft,
  todayKey: string = toLocalDateKey(new Date())
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!draft.fromCity.trim()) errors.fromCity = 'Select origin city';
  if (!draft.toCity.trim()) errors.toCity = 'Select destination city';
  if (
    draft.fromCity.trim() &&
    draft.toCity.trim() &&
    draft.fromCity.trim().toLowerCase() === draft.toCity.trim().toLowerCase()
  ) {
    errors.toCity = 'Must differ from origin';
  }
  if (draft.deliveryDate && draft.deliveryDate < todayKey) {
    errors.deliveryDate = 'Delivery date cannot be in the past';
  }
  return errors;
}

export function validateParcelDetails(draft: ParcelDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!draft.images || draft.images.length < 1) {
    errors.images = 'Add at least 1 parcel photo';
  } else {
    const uniqueImages = new Set(draft.images);
    if (uniqueImages.size !== draft.images.length) {
      errors.images = 'Duplicate images are not allowed';
    }
  }
  const parcelWeight = Number(draft.weight);
  const offerAmount = Number(draft.priceOffer);

  if (!draft.weight.trim()) {
    errors.weight = 'Enter weight';
  } else if (!Number.isFinite(parcelWeight) || parcelWeight <= 0 || parcelWeight > 100) {
    errors.weight = '0.1 - 100 kg';
  }

  if (!draft.priceOffer.trim()) {
    errors.priceOffer = 'Enter price offer';
  } else if (!Number.isFinite(offerAmount) || offerAmount < 1 || offerAmount > 100000) {
    errors.priceOffer = 'Rs 1 - Rs 1,00,000';
  }

  return errors;
}
