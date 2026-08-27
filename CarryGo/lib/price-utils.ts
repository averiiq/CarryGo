import { ParcelCategory, VehicleType } from '@/types';

export function formatCurrency(amount: number): string {
  if (amount >= 10_000_000) return `Rs ${(amount / 10_000_000).toFixed(1)}Cr`;
  if (amount >= 100_000) return `Rs ${(amount / 100_000).toFixed(1)}L`;
  return `Rs ${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function formatCurrencyExact(amount: number): string {
  return `Rs ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const PLATFORM_FEE_PERCENT = 10;

export function calculateEarnings(
  weight: number,
  pricePerKg: number,
  platformFeePercent: number = PLATFORM_FEE_PERCENT
): { gross: number; platformFee: number; net: number } {
  const gross = weight * pricePerKg;
  const platformFee = gross * (platformFeePercent / 100);
  const net = gross - platformFee;
  return { gross, platformFee, net };
}

interface PriceRange {
  min: number;
  max: number;
  average: number;
}

const CATEGORY_BASE_RATES: Record<ParcelCategory, PriceRange> = {
  documents: { min: 30, max: 150, average: 80 },
  electronics: { min: 80, max: 500, average: 200 },
  clothing: { min: 40, max: 200, average: 100 },
  food: { min: 50, max: 250, average: 120 },
  medicine: { min: 60, max: 300, average: 150 },
  other: { min: 40, max: 400, average: 120 },
};

const VEHICLE_MULTIPLIER: Record<VehicleType, number> = {
  bike: 0.8,
  car: 1.0,
  bus: 0.9,
  train: 0.85,
  flight: 1.5,
};

export function getPriceRange(
  category: ParcelCategory,
  weight: number,
  vehicleType?: VehicleType
): PriceRange {
  const base = CATEGORY_BASE_RATES[category];
  const weightFactor = Math.max(1, weight * 0.5);
  const vehicleMult = vehicleType ? VEHICLE_MULTIPLIER[vehicleType] : 1;

  return {
    min: Math.round(base.min * weightFactor * vehicleMult),
    max: Math.round(base.max * weightFactor * vehicleMult),
    average: Math.round(base.average * weightFactor * vehicleMult),
  };
}

export function getPricePerKgSuggestion(
  distanceKm: number,
  vehicleType: VehicleType
): number {
  const baseRate = 5 + distanceKm * 0.08;
  return Math.round(baseRate * VEHICLE_MULTIPLIER[vehicleType]);
}
