import {
  VEHICLE_CONFIG,
  formatTripRating,
  getTripAccessibilityLabel,
  getVehicleMeta,
} from '@/components/feature/TripCard';
import { Trip, Request } from '@/types';

describe('TripCard - Helpers & Domain Logic', () => {
  const baseTrip: Trip = {
    id: 'trip-101',
    userId: 'user-001',
    userName: 'Rahul Sharma',
    userRating: 4.8,
    fromCity: 'New Delhi',
    toCity: 'Jaipur',
    date: '2026-10-20',
    time: '08:30 AM',
    vehicleType: 'car',
    availableCapacity: 5,
    pricePerKg: 120,
    status: 'active',
    createdAt: '2026-10-15T10:00:00Z',
  };

  describe('getVehicleMeta', () => {
    it('returns correct configuration for known vehicle types', () => {
      const carMeta = getVehicleMeta('car');
      expect(carMeta.label).toBe('CAR');
      expect(carMeta.icon).toBe('directions-car');
      expect(carMeta.color).toBe(VEHICLE_CONFIG.car.color);

      const flightMeta = getVehicleMeta('flight');
      expect(flightMeta.label).toBe('FLIGHT');
      expect(flightMeta.icon).toBe('flight');

      const trainMeta = getVehicleMeta('train');
      expect(trainMeta.label).toBe('TRAIN');
      expect(trainMeta.icon).toBe('train');

      const bikeMeta = getVehicleMeta('bike');
      expect(bikeMeta.label).toBe('BIKE');
      expect(bikeMeta.icon).toBe('two-wheeler');
    });

    it('falls back to car configuration for unknown or undefined vehicle types', () => {
      const fallback = getVehicleMeta(undefined);
      expect(fallback.label).toBe('CAR');
      expect(fallback.icon).toBe('directions-car');

      const unknown = getVehicleMeta('spaceship' as any);
      expect(unknown.label).toBe('SPACESHIP');
      expect(unknown.icon).toBe('directions-car');
    });

    it('adjusts background and border colors for dark mode', () => {
      const light = getVehicleMeta('car', false);
      const dark = getVehicleMeta('car', true);

      expect(dark.bg).toBe(VEHICLE_CONFIG.car.color + '22');
      expect(dark.border).toBe(VEHICLE_CONFIG.car.color + '44');
      expect(light.bg).toBe(VEHICLE_CONFIG.car.bg);
    });
  });

  describe('formatTripRating', () => {
    it('formats positive ratings with 1 decimal place', () => {
      expect(formatTripRating(4.8)).toEqual({
        hasRating: true,
        formatted: '4.8',
        numeric: 4.8,
      });
      expect(formatTripRating(5.0)).toEqual({
        hasRating: true,
        formatted: '5.0',
        numeric: 5.0,
      });
    });

    it('returns NEW for zero, negative, NaN or undefined ratings', () => {
      expect(formatTripRating(0)).toEqual({
        hasRating: false,
        formatted: 'NEW',
        numeric: 0,
      });
      expect(formatTripRating(undefined)).toEqual({
        hasRating: false,
        formatted: 'NEW',
        numeric: 0,
      });
      expect(formatTripRating(NaN)).toEqual({
        hasRating: false,
        formatted: 'NEW',
        numeric: 0,
      });
    });
  });

  describe('getTripAccessibilityLabel', () => {
    it('generates a detailed accessibility description for sender view', () => {
      const label = getTripAccessibilityLabel(baseTrip);
      expect(label).toContain('Trip by Rahul Sharma');
      expect(label).toContain('rated 4.8 stars');
      expect(label).toContain('from New Delhi to Jaipur');
      expect(label).toContain('on 2026-10-20');
      expect(label).toContain('at 08:30 AM');
      expect(label).toContain('5 kilograms available capacity');
      expect(label).toContain('price ₹120 per kilogram');
      expect(label).toContain('traveling by car');
    });

    it('identifies owner perspective correctly', () => {
      const label = getTripAccessibilityLabel(baseTrip, { isOwner: true });
      expect(label).toContain('Your trip');
      expect(label).not.toContain('Trip by Rahul Sharma');
    });

    it('includes request status when existing request is present', () => {
      const mockRequest = {
        id: 'req-1',
        status: 'accepted',
      } as Request;

      const label = getTripAccessibilityLabel(baseTrip, { existingRequest: mockRequest });
      expect(label).toContain('request status: accepted');
    });
  });
});
