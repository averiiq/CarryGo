import {
  calculateParcelDeliveryPrice,
  normalizeCity,
  partitionMatchingParcels,
} from '@/components/feature/SendRequestModal';
import { Parcel, Trip } from '@/types';

describe('SendRequestModal - Domain Calculations & Parcel Partitioning', () => {
  describe('normalizeCity', () => {
    it('trims whitespace and converts to lowercase', () => {
      expect(normalizeCity('  New Delhi  ')).toBe('new delhi');
      expect(normalizeCity('Mumbai')).toBe('mumbai');
      expect(normalizeCity('')).toBe('');
      expect(normalizeCity(undefined)).toBe('');
    });
  });

  describe('calculateParcelDeliveryPrice', () => {
    it('calculates standard cost when above minimum floor', () => {
      const cost = calculateParcelDeliveryPrice(2.5, 60);
      expect(cost).toBe(150); // 2.5 * 60 = 150
    });

    it('enforces minimum fare floor of 80 by default', () => {
      const cost = calculateParcelDeliveryPrice(0.5, 50);
      // 0.5 * 50 = 25 -> floor is 80
      expect(cost).toBe(80);
    });

    it('supports custom minimum floors', () => {
      const cost = calculateParcelDeliveryPrice(1, 50, 100);
      // 1 * 50 = 50 -> custom floor is 100
      expect(cost).toBe(100);
    });

    it('falls back to default rate of 50 if pricePerKg is zero or missing', () => {
      const cost = calculateParcelDeliveryPrice(3, 0);
      expect(cost).toBe(150); // 3 * 50 = 150
    });

    it('handles zero or negative weights safely with minimum weight clamp', () => {
      const cost = calculateParcelDeliveryPrice(0, 50);
      expect(cost).toBe(80); // clamped safeWeight 0.1 * 50 = 5 -> floor 80
    });
  });

  describe('partitionMatchingParcels', () => {
    const mockTrip: Pick<Trip, 'fromCity' | 'toCity' | 'availableCapacity'> = {
      fromCity: 'Delhi',
      toCity: 'Chandigarh',
      availableCapacity: 5,
    };

    const makeParcel = (overrides: Partial<Parcel> = {}): Parcel => ({
      id: 'p-1',
      userId: 'user-1',
      userName: 'Sender One',
      fromCity: 'Delhi',
      toCity: 'Chandigarh',
      category: 'documents',
      weight: 2,
      description: 'Important papers',
      priceOffer: 150,
      status: 'open',
      createdAt: '2026-09-01T10:00:00Z',
      ...overrides,
    });

    it('partitions open parcels matching route into eligible and overweight', () => {
      const pFit = makeParcel({ id: 'p-fit', weight: 3 });
      const pOver = makeParcel({ id: 'p-over', weight: 8 });

      const result = partitionMatchingParcels([pFit, pOver], mockTrip);

      expect(result.eligible).toHaveLength(1);
      expect(result.eligible[0].id).toBe('p-fit');
      expect(result.overweight).toHaveLength(1);
      expect(result.overweight[0].id).toBe('p-over');
    });

    it('ignores parcels with status other than open', () => {
      const pMatched = makeParcel({ id: 'p-matched', status: 'matched', weight: 2 });
      const pDelivered = makeParcel({ id: 'p-delivered', status: 'delivered', weight: 2 });
      const pOpen = makeParcel({ id: 'p-open', status: 'open', weight: 2 });

      const result = partitionMatchingParcels([pMatched, pDelivered, pOpen], mockTrip);

      expect(result.eligible).toHaveLength(1);
      expect(result.eligible[0].id).toBe('p-open');
      expect(result.overweight).toHaveLength(0);
    });

    it('ignores parcels on non-matching routes', () => {
      const pWrongOrigin = makeParcel({ id: 'p-wrong-from', fromCity: 'Mumbai', toCity: 'Chandigarh' });
      const pWrongDest = makeParcel({ id: 'p-wrong-to', fromCity: 'Delhi', toCity: 'Jaipur' });
      const pMatch = makeParcel({ id: 'p-match', fromCity: 'delhi ', toCity: ' chandigarh' });

      const result = partitionMatchingParcels([pWrongOrigin, pWrongDest, pMatch], mockTrip);

      expect(result.eligible).toHaveLength(1);
      expect(result.eligible[0].id).toBe('p-match');
    });

    it('places all matching parcels in overweight if trip availableCapacity is 0', () => {
      const tripZeroCap = { ...mockTrip, availableCapacity: 0 };
      const p1 = makeParcel({ id: 'p-1', weight: 1 });

      const result = partitionMatchingParcels([p1], tripZeroCap);

      expect(result.eligible).toHaveLength(0);
      expect(result.overweight).toHaveLength(1);
      expect(result.overweight[0].id).toBe('p-1');
    });
  });
});
