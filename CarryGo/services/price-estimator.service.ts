import { getSupabaseClient } from '@/template';
import { ParcelCategory, VehicleType } from '@/types';
import { getDistance, findCity } from '@/constants/indian-cities';

export interface PriceEstimateParams {
  fromCity: string;
  toCity: string;
  weight: number;
  category: ParcelCategory;
  vehicleType?: VehicleType;
  deliveryDate?: string;
}

export interface PriceBreakdown {
  basePrice: number;
  distanceFactor: number;
  weightFactor: number;
  categoryFactor: number;
  demandFactor: number;
  urgencyFactor: number;
  vehicleFactor: number;
}

export interface PriceEstimate {
  suggestedPrice: number;
  minPrice: number;
  maxPrice: number;
  breakdown: PriceBreakdown;
  confidenceLevel: 'high' | 'medium' | 'low';
  demandLevel: 'high' | 'medium' | 'low';
}

const CATEGORY_MULTIPLIERS: Record<ParcelCategory, number> = {
  documents: 0.7,
  clothing: 0.9,
  food: 1.1,
  electronics: 1.4,
  medicine: 1.3,
  other: 1.0,
};

const VEHICLE_MULTIPLIERS: Record<VehicleType, number> = {
  bike: 0.7,
  car: 1.0,
  bus: 0.85,
  train: 0.8,
  flight: 1.6,
};

function calculateUrgency(deliveryDate?: string): number {
  if (!deliveryDate) return 1.0;
  const daysUntil = Math.max(0, (new Date(deliveryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysUntil <= 1) return 1.5;
  if (daysUntil <= 3) return 1.25;
  if (daysUntil <= 7) return 1.1;
  return 1.0;
}

export async function estimatePrice(params: PriceEstimateParams): Promise<PriceEstimate> {
  const { fromCity, toCity, weight, category, vehicleType = 'car', deliveryDate } = params;

  const from = findCity(fromCity);
  const to = findCity(toCity);
  const distanceKm = from && to ? getDistance(from, to) : 500;

  const sb = getSupabaseClient();
  const [tripsRes, parcelsRes] = await Promise.all([
    sb.from('trips').select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .ilike('from_city', `%${fromCity}%`)
      .ilike('to_city', `%${toCity}%`),
    sb.from('parcels').select('id', { count: 'exact', head: true })
      .eq('status', 'open')
      .ilike('from_city', `%${fromCity}%`)
      .ilike('to_city', `%${toCity}%`),
  ]);

  const activeTrips = tripsRes.count ?? 0;
  const openParcels = parcelsRes.count ?? 0;

  let demandMultiplier = 1.0;
  let demandLevel: PriceEstimate['demandLevel'] = 'medium';
  if (activeTrips === 0 && openParcels > 0) {
    demandMultiplier = 1.4;
    demandLevel = 'high';
  } else if (openParcels > activeTrips * 2) {
    demandMultiplier = 1.25;
    demandLevel = 'high';
  } else if (activeTrips > openParcels * 2) {
    demandMultiplier = 0.8;
    demandLevel = 'low';
  }

  const basePrice = 50;
  const distanceFactor = Math.max(1, distanceKm * 0.12);
  const weightFactor = Math.max(1, weight * 15);
  const categoryFactor = CATEGORY_MULTIPLIERS[category];
  const vehicleFactor = VEHICLE_MULTIPLIERS[vehicleType];
  const urgencyFactor = calculateUrgency(deliveryDate);
  const demandFactor = demandMultiplier;

  const rawPrice = (basePrice + distanceFactor + weightFactor) * categoryFactor * vehicleFactor * urgencyFactor * demandFactor;
  const suggestedPrice = Math.round(rawPrice / 10) * 10;

  const confidenceLevel: PriceEstimate['confidenceLevel'] =
    from && to && (activeTrips + openParcels) > 3 ? 'high' :
    from && to ? 'medium' : 'low';

  return {
    suggestedPrice,
    minPrice: Math.round(suggestedPrice * 0.7),
    maxPrice: Math.round(suggestedPrice * 1.4),
    breakdown: {
      basePrice,
      distanceFactor: Math.round(distanceFactor),
      weightFactor: Math.round(weightFactor),
      categoryFactor,
      demandFactor,
      urgencyFactor,
      vehicleFactor,
    },
    confidenceLevel,
    demandLevel,
  };
}
