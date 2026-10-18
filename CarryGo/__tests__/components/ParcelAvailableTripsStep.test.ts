import { sortMatchingTrips, calculateMatchPrice } from '@/components/feature/matching/matchingHelpers';
import type { Trip } from '@/types';
import type { ParcelDraft } from '@/components/feature/parcel/types';

describe('ParcelAvailableTripsStep - Flow and Calculations', () => {
  const sampleTrips: Trip[] = [
    {
      id: 'trip-1',
      userId: 'user-naveen',
      userName: 'Naveen',
      userRating: 4.8,
      fromCity: 'Bhiwani',
      toCity: 'Hisar',
      date: '2026-10-18',
      time: '19:15',
      vehicleType: 'car',
      availableCapacity: 10,
      pricePerKg: 90,
      status: 'active',
      createdAt: '2026-10-18T08:00:00Z',
    },
    {
      id: 'trip-2',
      userId: 'user-fouji',
      userName: 'Fouji',
      userRating: 3.5,
      fromCity: 'Bhiwani',
      toCity: 'Hisar',
      date: '2026-10-18',
      time: '19:30',
      vehicleType: 'car',
      availableCapacity: 15,
      pricePerKg: 120,
      status: 'active',
      createdAt: '2026-10-18T08:30:00Z',
    },
    {
      id: 'trip-3',
      userId: 'user-rohit',
      userName: 'Rohit',
      userRating: 5.0,
      fromCity: 'Bhiwani',
      toCity: 'Hisar',
      date: '2026-10-18',
      time: '19:50',
      vehicleType: 'car',
      availableCapacity: 5,
      pricePerKg: 85,
      status: 'active',
      createdAt: '2026-10-18T09:00:00Z',
    },
  ];

  const sampleDraft: ParcelDraft = {
    fromCity: 'Bhiwani',
    toCity: 'Hisar',
    deliveryDate: '2026-10-18',
    preferredTime: 'anytime',
    category: 'electronics',
    weight: '2',
    priceOffer: '180',
    description: 'Noise cancelling headphones in box',
    images: ['https://example.com/item.jpg'],
  };

  it('calculates the exact fare for 2kg parcel across all matching trips', () => {
    const weightNum = Number(sampleDraft.weight);
    expect(calculateMatchPrice(sampleTrips[0].pricePerKg, weightNum)).toBe(180); // 90 * 2 = 180
    expect(calculateMatchPrice(sampleTrips[1].pricePerKg, weightNum)).toBe(240); // 120 * 2 = 240
    expect(calculateMatchPrice(sampleTrips[2].pricePerKg, weightNum)).toBe(170); // 85 * 2 = 170
  });

  it('sorts trips by price ascending', () => {
    const sorted = sortMatchingTrips(sampleTrips, 'price');
    expect(sorted[0].id).toBe('trip-3'); // 85
    expect(sorted[1].id).toBe('trip-1'); // 90
    expect(sorted[2].id).toBe('trip-2'); // 120
  });

  it('sorts trips by rating descending', () => {
    const sorted = sortMatchingTrips(sampleTrips, 'rating');
    expect(sorted[0].id).toBe('trip-3'); // 5.0
    expect(sorted[1].id).toBe('trip-1'); // 4.8
    expect(sorted[2].id).toBe('trip-2'); // 3.5
  });

  it('sorts trips by available capacity descending', () => {
    const sorted = sortMatchingTrips(sampleTrips, 'capacity');
    expect(sorted[0].id).toBe('trip-2'); // 15 kg
    expect(sorted[1].id).toBe('trip-1'); // 10 kg
    expect(sorted[2].id).toBe('trip-3'); // 5 kg
  });

  it('constructs correct navigation parameters for trip detail transition', () => {
    const targetTrip = sampleTrips[0];
    const navParams = {
      id: targetTrip.id,
      draftFromCity: sampleDraft.fromCity,
      draftToCity: sampleDraft.toCity,
      draftWeight: sampleDraft.weight,
      draftCategory: sampleDraft.category,
      draftPrice: sampleDraft.priceOffer,
      draftDesc: sampleDraft.description,
    };

    expect(navParams.id).toBe('trip-1');
    expect(navParams.draftFromCity).toBe('Bhiwani');
    expect(navParams.draftToCity).toBe('Hisar');
    expect(navParams.draftWeight).toBe('2');
    expect(navParams.draftCategory).toBe('electronics');
    expect(navParams.draftPrice).toBe('180');
    expect(navParams.draftDesc).toContain('headphones');
  });
});
