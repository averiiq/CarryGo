import {
  sortMatchingTrips,
  calculateMatchPrice,
  formatMatchSummary,
  buildRequestsByTripMap,
  formatMatchHeaderRoute,
} from '@/components/feature/matching/matchingHelpers';
import type { Trip, Request } from '@/types';

describe('MatchingHelpers', () => {
  const sampleTrips: Trip[] = [
    {
      id: 'trip-1',
      userId: 'user-1',
      userName: 'Amit',
      userRating: 4.8,
      fromCity: 'Delhi',
      toCity: 'Jaipur',
      date: '2026-10-25',
      time: '08:00 AM',
      vehicleType: 'car',
      availableCapacity: 6,
      pricePerKg: 120,
      status: 'active',
      createdAt: '2026-10-01T00:00:00Z',
    },
    {
      id: 'trip-2',
      userId: 'user-2',
      userName: 'Deepak',
      userRating: 4.9,
      fromCity: 'Delhi',
      toCity: 'Jaipur',
      date: '2026-10-25',
      time: '11:00 AM',
      vehicleType: 'train',
      availableCapacity: 15,
      pricePerKg: 70,
      status: 'active',
      createdAt: '2026-10-02T00:00:00Z',
    },
    {
      id: 'trip-3',
      userId: 'user-3',
      userName: 'Vikas',
      userRating: 4.2,
      fromCity: 'Delhi',
      toCity: 'Jaipur',
      date: '2026-10-25',
      time: '02:00 PM',
      vehicleType: 'bus',
      availableCapacity: 4,
      pricePerKg: 90,
      status: 'active',
      createdAt: '2026-10-03T00:00:00Z',
    },
  ];

  describe('sortMatchingTrips', () => {
    it('preserves match algorithm order when sortBy is "match"', () => {
      const sorted = sortMatchingTrips(sampleTrips, 'match');
      expect(sorted.map((t) => t.id)).toEqual(['trip-1', 'trip-2', 'trip-3']);
    });

    it('sorts ascending by pricePerKg when sortBy is "price"', () => {
      const sorted = sortMatchingTrips(sampleTrips, 'price');
      expect(sorted.map((t) => t.id)).toEqual(['trip-2', 'trip-3', 'trip-1']);
      expect(sorted[0].pricePerKg).toBe(70);
      expect(sorted[2].pricePerKg).toBe(120);
    });

    it('sorts descending by userRating when sortBy is "rating"', () => {
      const sorted = sortMatchingTrips(sampleTrips, 'rating');
      expect(sorted.map((t) => t.id)).toEqual(['trip-2', 'trip-1', 'trip-3']);
      expect(sorted[0].userRating).toBe(4.9);
      expect(sorted[2].userRating).toBe(4.2);
    });

    it('sorts descending by availableCapacity when sortBy is "capacity"', () => {
      const sorted = sortMatchingTrips(sampleTrips, 'capacity');
      expect(sorted.map((t) => t.id)).toEqual(['trip-2', 'trip-1', 'trip-3']);
      expect(sorted[0].availableCapacity).toBe(15);
      expect(sorted[2].availableCapacity).toBe(4);
    });
  });

  describe('calculateMatchPrice', () => {
    it('calculates price based on rate and weight', () => {
      expect(calculateMatchPrice(100, 3)).toBe(300);
      expect(calculateMatchPrice(75, 2)).toBe(150);
    });

    it('enforces a minimum floor price of ₹50', () => {
      expect(calculateMatchPrice(10, 1)).toBe(50);
      expect(calculateMatchPrice(0, 0)).toBe(50);
      expect(calculateMatchPrice(-10, -5)).toBe(50);
    });
  });

  describe('formatMatchSummary', () => {
    it('formats category, weight, and INR budget correctly', () => {
      const summary = formatMatchSummary('electronics', 3, 500);
      expect(summary).toBe('Electronics · 3kg · ₹500 budget');
    });

    it('handles partial parameters gracefully', () => {
      expect(formatMatchSummary('documents')).toBe('Documents');
      expect(formatMatchSummary(undefined, 2)).toBe('2kg');
      expect(formatMatchSummary(undefined, undefined, 250)).toBe('₹250 budget');
      expect(formatMatchSummary()).toBe('Route details');
    });
  });

  describe('buildRequestsByTripMap', () => {
    const mockRequests: Request[] = [
      {
        id: 'req-1',
        parcelId: 'parcel-1',
        tripId: 'trip-1',
        senderId: 'user-sender',
        senderName: 'Sender',
        travellerId: 'user-1',
        travellerName: 'Amit',
        status: 'pending',
        price: 300,
        createdAt: '2026-10-01T10:00:00Z',
        updatedAt: '2026-10-01T10:00:00Z',
      },
      {
        id: 'req-2',
        parcelId: 'parcel-2',
        tripId: 'trip-2',
        senderId: 'user-sender',
        senderName: 'Sender',
        travellerId: 'user-2',
        travellerName: 'Deepak',
        status: 'accepted',
        price: 200,
        createdAt: '2026-10-01T11:00:00Z',
        updatedAt: '2026-10-01T11:30:00Z',
      },
      {
        id: 'req-3-overwrite',
        parcelId: 'parcel-3',
        tripId: 'trip-1',
        senderId: 'user-sender',
        senderName: 'Sender',
        travellerId: 'user-1',
        travellerName: 'Amit',
        status: 'accepted',
        price: 350,
        createdAt: '2026-10-01T12:00:00Z',
        updatedAt: '2026-10-01T12:00:00Z',
      },
    ];

    it('maps requests to trips and prioritizes accepted status', () => {
      const map = buildRequestsByTripMap(mockRequests);
      expect(map.has('trip-1')).toBe(true);
      expect(map.get('trip-1')?.status).toBe('accepted');
      expect(map.get('trip-1')?.id).toBe('req-3-overwrite');
      expect(map.get('trip-2')?.status).toBe('accepted');
      expect(map.has('trip-nonexistent')).toBe(false);
    });

    it('returns empty map when requests array is empty', () => {
      const map = buildRequestsByTripMap([]);
      expect(map.size).toBe(0);
    });
  });

  describe('formatMatchHeaderRoute', () => {
    it('returns city names when provided', () => {
      expect(formatMatchHeaderRoute('Delhi', 'Jaipur')).toEqual({
        from: 'Delhi',
        to: 'Jaipur',
      });
    });

    it('falls back to default labels when empty', () => {
      expect(formatMatchHeaderRoute('', undefined)).toEqual({
        from: 'Route',
        to: 'Details',
      });
    });
  });
});
