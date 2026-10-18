import { ParcelCategory } from '@/types';
import { MaterialIcons } from '@expo/vector-icons';
import { toLocalDateKey } from '@/components/feature/SevenDaySchedulePicker';

export type ParcelDraft = {
  fromCity: string;
  toCity: string;
  deliveryDate: string;
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
  category: 'documents',
  description: '',
  weight: '',
  priceOffer: '',
  images: [],
};

export const PARCEL_CATEGORIES: {
  type: ParcelCategory;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
}[] = [
  { type: 'documents', label: 'Documents', icon: 'description', color: '#6B7280' },
  { type: 'electronics', label: 'Electronics', icon: 'devices', color: '#0F766E' },
  { type: 'clothing', label: 'Clothing', icon: 'checkroom', color: '#64748B' },
  { type: 'food', label: 'Food', icon: 'restaurant', color: '#EA580C' },
  { type: 'medicine', label: 'Medicine', icon: 'local-pharmacy', color: '#16A34A' },
  { type: 'other', label: 'Other', icon: 'inventory-2', color: '#4B5563' },
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
