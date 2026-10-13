import {
  formatCorridorLabel,
  sortMarketplaceTrips,
  sortMarketplaceParcels,
  MarketplaceSortOption,
} from '@/components/feature/LiveMarketplaceHeader';
import { Trip, Parcel } from '@/types';

describe('LiveMarketplaceHeader - Logic & Helpers', () => {
  describe('formatCorridorLabel', () => {
    it('returns null when no cities are provided', () => {
      expect(formatCorridorLabel('', '')).toBeNull();
      expect(formatCorridorLabel(undefined, undefined)).toBeNull();
    });

    it('formats a full origin-to-destination corridor', () => {
      expect(formatCorridorLabel('Delhi', 'Chandigarh')).toBe('Delhi ➔ Chandigarh');
      expect(formatCorridorLabel(' Gurugram ', ' Jaipur ')).toBe('Gurugram ➔ Jaipur');
    });

    it('formats partial corridors when only fromCity or toCity is set', () => {
      expect(formatCorridorLabel('Delhi', '')).toBe('From Delhi');
      expect(formatCorridorLabel('', 'Chandigarh')).toBe('To Chandigarh');
    });
  });

  describe('sortMarketplaceTrips', () => {
    const mockTrips: Trip[] = [
      {
        id: 'trip-1',
        userId: 'u1',
        userName: 'A',
        userRating: 4.8,
        fromCity: 'Delhi',
        toCity: 'Chandigarh',
        date: '2026-10-25',
        time: '08:00',
        vehicleType: 'car',
        availableCapacity: 10,
        pricePerKg: 60,
        status: 'active',
        createdAt: '2026-10-20T00:00:00Z',
      },
      {
        id: 'trip-2',
        userId: 'u2',
        userName: 'B',
        userRating: 4.5,
        fromCity: 'Delhi',
        toCity: 'Chandigarh',
        date: '2026-10-25',
        time: '10:00',
        vehicleType: 'train',
        availableCapacity: 25,
        pricePerKg: 30,
        status: 'active',
        createdAt: '2026-10-20T01:00:00Z',
      },
    ];

    it('sorts trips by lowest price per kg', () => {
      const sorted = sortMarketplaceTrips(mockTrips, 'price');
      expect(sorted[0].id).toBe('trip-2'); // 30 is less than 60
      expect(sorted[1].id).toBe('trip-1');
    });

    it('sorts trips by highest available capacity', () => {
      const sorted = sortMarketplaceTrips(mockTrips, 'capacity');
      expect(sorted[0].id).toBe('trip-2'); // 25kg is more than 10kg
      expect(sorted[1].id).toBe('trip-1');
    });

    it('preserves order when sort is recent', () => {
      const sorted = sortMarketplaceTrips(mockTrips, 'recent');
      expect(sorted[0].id).toBe('trip-1');
    });
  });

  describe('sortMarketplaceParcels', () => {
    const mockParcels: Parcel[] = [
      {
        id: 'parcel-1',
        userId: 'u1',
        userName: 'A',
        fromCity: 'Delhi',
        toCity: 'Chandigarh',
        description: 'Warm winter jacket',
        category: 'clothing',
        weight: 3,
        priceOffer: 250,
        status: 'open',
        createdAt: '2026-10-20T00:00:00Z',
      },
      {
        id: 'parcel-2',
        userId: 'u2',
        userName: 'B',
        fromCity: 'Delhi',
        toCity: 'Chandigarh',
        description: 'Urgent diabetes supplies',
        category: 'medicine',
        weight: 1,
        priceOffer: 700,
        status: 'open',
        createdAt: '2026-10-20T01:00:00Z',
      },
    ];

    it('sorts parcels by highest reward / price offer', () => {
      const sorted = sortMarketplaceParcels(mockParcels, 'price');
      expect(sorted[0].id).toBe('parcel-2'); // ₹700 is more than ₹250
      expect(sorted[1].id).toBe('parcel-1');
    });

    it('prioritizes urgent packages (medicine / high bounty) when sort is urgent', () => {
      const sorted = sortMarketplaceParcels(mockParcels, 'urgent');
      expect(sorted[0].id).toBe('parcel-2'); // Medicine is urgent
    });
  });
});
