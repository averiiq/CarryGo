import {
  SearchItem,
  filterSearchResults,
  formatRouteSubscriptionMessage,
  sortSearchResults,
} from '@/components/feature/search/searchHelpers';
import { Trip, Parcel } from '@/types';

describe('SearchHelpers - Route Filtering & Ordering', () => {
  const mockTrips: Trip[] = [
    {
      id: 'trip-1',
      userId: 'user-1',
      userName: 'Amit',
      userRating: 4.9,
      fromCity: 'New Delhi',
      toCity: 'Jaipur',
      date: '2026-10-25',
      time: '09:00 AM',
      vehicleType: 'car',
      availableCapacity: 5,
      pricePerKg: 100,
      status: 'active',
      createdAt: '2026-10-10T10:00:00Z',
    },
    {
      id: 'trip-2',
      userId: 'user-2',
      userName: 'Rahul',
      userRating: 4.5,
      fromCity: 'Mumbai',
      toCity: 'Pune',
      date: '2026-10-22',
      time: '06:00 PM',
      vehicleType: 'bike',
      availableCapacity: 2,
      pricePerKg: 60,
      status: 'active',
      createdAt: '2026-10-12T10:00:00Z',
    },
    {
      id: 'trip-inactive',
      userId: 'user-3',
      userName: 'Karan',
      userRating: 4.0,
      fromCity: 'New Delhi',
      toCity: 'Jaipur',
      date: '2026-10-25',
      time: '10:00 AM',
      vehicleType: 'car',
      availableCapacity: 10,
      pricePerKg: 80,
      status: 'completed',
      createdAt: '2026-10-01T10:00:00Z',
    },
  ];

  const mockParcels: Parcel[] = [
    {
      id: 'parcel-1',
      userId: 'user-4',
      userName: 'Sneha',
      fromCity: 'New Delhi',
      toCity: 'Jaipur',
      category: 'documents',
      description: 'Contracts',
      weight: 1,
      priceOffer: 150,
      status: 'open',
      createdAt: '2026-10-15T10:00:00Z',
      deliveryDate: '2026-10-26',
    },
    {
      id: 'parcel-closed',
      userId: 'user-5',
      userName: 'Priya',
      fromCity: 'New Delhi',
      toCity: 'Jaipur',
      category: 'clothing',
      description: 'Dress',
      weight: 2,
      priceOffer: 300,
      status: 'delivered',
      createdAt: '2026-10-05T10:00:00Z',
    },
  ];

  describe('filterSearchResults', () => {
    it('filters active trips and open parcels matching origin and destination', () => {
      const { matchedTrips, matchedParcels } = filterSearchResults(mockTrips, mockParcels, {
        fromCity: 'delhi',
        toCity: 'jaipur',
      });

      expect(matchedTrips.length).toBe(1);
      expect(matchedTrips[0].id).toBe('trip-1');
      expect(matchedParcels.length).toBe(1);
      expect(matchedParcels[0].id).toBe('parcel-1');
    });

    it('filters trips by vehicle type', () => {
      const { matchedTrips } = filterSearchResults(mockTrips, mockParcels, {
        vehicleType: 'bike',
      });

      expect(matchedTrips.length).toBe(1);
      expect(matchedTrips[0].id).toBe('trip-2');
    });

    it('excludes listings created by the searching user', () => {
      const { matchedTrips } = filterSearchResults(mockTrips, mockParcels, {
        excludeUserId: 'user-1',
      });

      expect(matchedTrips.map((t) => t.id)).not.toContain('trip-1');
    });
  });

  describe('sortSearchResults', () => {
    const items: SearchItem[] = [
      { type: 'trip', data: mockTrips[0] }, // ₹100/kg, 4.9 rating, date 2026-10-25
      { type: 'trip', data: mockTrips[1] }, // ₹60/kg, 4.5 rating, date 2026-10-22
      { type: 'parcel', data: mockParcels[0] }, // ₹150 offer, date 2026-10-26
    ];

    it('sorts by lowest price first', () => {
      const sorted = sortSearchResults(items, 'price_low');
      const prices = sorted.map((item) =>
        item.type === 'trip' ? item.data.pricePerKg : item.data.priceOffer
      );
      expect(prices).toEqual([60, 100, 150]);
    });

    it('sorts by highest price first', () => {
      const sorted = sortSearchResults(items, 'price_high');
      const prices = sorted.map((item) =>
        item.type === 'trip' ? item.data.pricePerKg : item.data.priceOffer
      );
      expect(prices).toEqual([150, 100, 60]);
    });

    it('sorts by nearest date first', () => {
      const sorted = sortSearchResults(items, 'date_nearest');
      expect(sorted[0].data.id).toBe('trip-2'); // 2026-10-22
      expect(sorted[1].data.id).toBe('trip-1'); // 2026-10-25
      expect(sorted[2].data.id).toBe('parcel-1'); // 2026-10-26
    });

    it('sorts by highest rating first for trips', () => {
      const sorted = sortSearchResults(items, 'rating_best');
      expect(sorted[0].data.id).toBe('trip-1'); // 4.9 rating
      expect(sorted[1].data.id).toBe('trip-2'); // 4.5 rating
    });
  });

  describe('formatRouteSubscriptionMessage', () => {
    it('formats route subscription alerts with cities', () => {
      const { createdMessage, alreadySubscribedMessage } = formatRouteSubscriptionMessage(
        'Delhi',
        'Chandigarh'
      );
      expect(createdMessage).toBe("You'll be notified when trips or parcels appear on Delhi → Chandigarh.");
      expect(alreadySubscribedMessage).toBe('You already have an active alert for Delhi → Chandigarh.');
    });

    it('handles fallback when cities are missing', () => {
      const { createdMessage } = formatRouteSubscriptionMessage('', '');
      expect(createdMessage).toContain('this corridor');
    });
  });
});
