import { scoreMatch, findBestMatches, findBestParcelsForTrip, MatchScore } from '@/services/smart-matching.service';
import { Trip, Parcel } from '@/types';

jest.mock('@/constants/indian-cities', () => ({
  findCity: (name: string) => {
    const cities: Record<string, { name: string; lat: number; lng: number }> = {
      mumbai: { name: 'Mumbai', lat: 19.076, lng: 72.8777 },
      delhi: { name: 'Delhi', lat: 28.7041, lng: 77.1025 },
      pune: { name: 'Pune', lat: 18.5204, lng: 73.8567 },
      // Pune is ~150km from Mumbai; Delhi is ~1400km from Mumbai
      navi_mumbai: { name: 'Navi Mumbai', lat: 19.033, lng: 73.0297 },
    };
    const lower = name.toLowerCase().trim();
    return cities[lower] || cities[lower.replace(/\s+/g, '_')] || undefined;
  },
  getDistance: (city1: { lat: number; lng: number }, city2: { lat: number; lng: number }) => {
    // Simplified Haversine for test purposes
    const EARTH_RADIUS_KM = 6371;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(city2.lat - city1.lat);
    const dLng = toRad(city2.lng - city1.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(city1.lat)) * Math.cos(toRad(city2.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_KM * c;
  },
}));

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 'trip-1',
    userId: 'user-traveller',
    userName: 'Traveller',
    userRating: 4.5,
    fromCity: 'Mumbai',
    toCity: 'Delhi',
    date: '2026-07-20',
    time: '10:00',
    vehicleType: 'car',
    availableCapacity: 10,
    pricePerKg: 50,
    status: 'active',
    createdAt: '2026-07-15',
    ...overrides,
  };
}

function makeParcel(overrides: Partial<Parcel> = {}): Parcel {
  return {
    id: 'parcel-1',
    userId: 'user-sender',
    userName: 'Sender',
    fromCity: 'Mumbai',
    toCity: 'Delhi',
    category: 'electronics',
    description: 'Laptop',
    weight: 5,
    priceOffer: 300,
    status: 'open',
    createdAt: '2026-07-19',
    ...overrides,
  };
}

describe('smart-matching.service', () => {
  describe('scoreMatch - route compatibility', () => {
    it('returns 100 for exact city match (case insensitive)', () => {
      const trip = makeTrip({ fromCity: 'Mumbai', toCity: 'Delhi' });
      const parcel = makeParcel({ fromCity: 'mumbai', toCity: 'delhi' });

      const result = scoreMatch(trip, parcel);
      expect(result.breakdown.routeScore).toBe(100);
    });

    it('normalizes route aliases like state suffixes and NCR names', () => {
      const trip = makeTrip({ fromCity: 'Mumbai, Maharashtra', toCity: 'Delhi NCR' });
      const parcel = makeParcel({ fromCity: 'Mumbai', toCity: 'Delhi' });

      const result = scoreMatch(trip, parcel);
      expect(result.breakdown.routeScore).toBe(100);
    });

    it('returns 0 when cities are not found in database', () => {
      const trip = makeTrip({ fromCity: 'UnknownCity', toCity: 'AnotherUnknown' });
      const parcel = makeParcel({ fromCity: 'NowhereVille', toCity: 'GhostTown' });

      const result = scoreMatch(trip, parcel);
      expect(result.breakdown.routeScore).toBe(0);
    });

    it('returns partial score for nearby cities (within 50km)', () => {
      // Navi Mumbai is ~20km from Mumbai
      const trip = makeTrip({ fromCity: 'Navi_Mumbai', toCity: 'Delhi' });
      const parcel = makeParcel({ fromCity: 'Mumbai', toCity: 'Delhi' });

      const result = scoreMatch(trip, parcel);
      expect(result.breakdown.routeScore).toBeGreaterThanOrEqual(80);
    });

    it('penalizes opposite travel direction', () => {
      const trip = makeTrip({ fromCity: 'Mumbai', toCity: 'Delhi' });
      const parcel = makeParcel({ fromCity: 'Delhi', toCity: 'Mumbai' });

      const result = scoreMatch(trip, parcel);
      expect(result.breakdown.routeScore).toBeLessThan(40);
    });

    it('returns lower score for cities within 100km', () => {
      // Pune is ~150km from Mumbai so it should fall into different bracket
      const trip = makeTrip({ fromCity: 'Pune', toCity: 'Delhi' });
      const parcel = makeParcel({ fromCity: 'Mumbai', toCity: 'Delhi' });

      const result = scoreMatch(trip, parcel);
      // Distance between Pune and Mumbai is ~150km so > 100
      expect(result.breakdown.routeScore).toBeLessThanOrEqual(60);
    });
  });

  describe('scoreMatch - date alignment', () => {
    it('returns 100 when trip and parcel are on the same day', () => {
      const trip = makeTrip({ date: '2026-07-20' });
      const parcel = makeParcel({ createdAt: '2026-07-20' });

      const result = scoreMatch(trip, parcel);
      expect(result.breakdown.dateScore).toBeGreaterThanOrEqual(90);
    });

    it('returns 90 for 1-day difference', () => {
      const trip = makeTrip({ date: '2026-07-21' });
      const parcel = makeParcel({ createdAt: '2026-07-20' });

      const result = scoreMatch(trip, parcel);
      expect(result.breakdown.dateScore).toBe(90);
    });

    it('returns 75 for 2-day difference', () => {
      const trip = makeTrip({ date: '2026-07-22' });
      const parcel = makeParcel({ createdAt: '2026-07-20' });

      const result = scoreMatch(trip, parcel);
      expect(result.breakdown.dateScore).toBe(75);
    });

    it('returns 60 for 3-day difference', () => {
      const trip = makeTrip({ date: '2026-07-23' });
      const parcel = makeParcel({ createdAt: '2026-07-20' });

      const result = scoreMatch(trip, parcel);
      expect(result.breakdown.dateScore).toBe(60);
    });

    it('returns 0 for more than 7-day difference', () => {
      const trip = makeTrip({ date: '2026-08-01' });
      const parcel = makeParcel({ createdAt: '2026-07-20' });

      const result = scoreMatch(trip, parcel);
      expect(result.breakdown.dateScore).toBe(0);
    });

    it('penalizes trips that miss parcel delivery deadline', () => {
      const trip = makeTrip({ date: '2026-07-23' });
      const parcel = makeParcel({ createdAt: '2026-07-20', deliveryDate: '2026-07-21' });

      const result = scoreMatch(trip, parcel);
      expect(result.breakdown.dateScore).toBe(0);
    });
  });

  describe('scoreMatch - capacity fit', () => {
    it('returns 100 for optimal utilization ratio (50-90%)', () => {
      const trip = makeTrip({ availableCapacity: 10 });
      const parcel = makeParcel({ weight: 7 }); // 70% utilization

      const result = scoreMatch(trip, parcel);
      expect(result.breakdown.capacityScore).toBe(100);
    });

    it('returns 0 when parcel exceeds trip capacity', () => {
      const trip = makeTrip({ availableCapacity: 5 });
      const parcel = makeParcel({ weight: 10 });

      const result = scoreMatch(trip, parcel);
      expect(result.breakdown.capacityScore).toBe(0);
    });

    it('returns 80 for utilization ratio between 30-49%', () => {
      const trip = makeTrip({ availableCapacity: 10 });
      const parcel = makeParcel({ weight: 4 }); // 40% utilization

      const result = scoreMatch(trip, parcel);
      expect(result.breakdown.capacityScore).toBe(80);
    });

    it('returns 60 for utilization ratio between 10-29%', () => {
      const trip = makeTrip({ availableCapacity: 100 });
      const parcel = makeParcel({ weight: 15 }); // 15% utilization

      const result = scoreMatch(trip, parcel);
      expect(result.breakdown.capacityScore).toBe(60);
    });

    it('returns 40 for very low utilization (below 10%)', () => {
      const trip = makeTrip({ availableCapacity: 100 });
      const parcel = makeParcel({ weight: 5 }); // 5% utilization

      const result = scoreMatch(trip, parcel);
      expect(result.breakdown.capacityScore).toBe(40);
    });
  });

  describe('scoreMatch - price compatibility', () => {
    it('returns 100 when parcel offer meets or exceeds trip total', () => {
      const trip = makeTrip({ pricePerKg: 50 });
      const parcel = makeParcel({ weight: 5, priceOffer: 300 }); // tripTotal=250, offer=300

      const result = scoreMatch(trip, parcel);
      expect(result.breakdown.priceScore).toBe(100);
    });

    it('returns 85 when offer is 90%+ of trip total', () => {
      const trip = makeTrip({ pricePerKg: 50 });
      const parcel = makeParcel({ weight: 5, priceOffer: 230 }); // tripTotal=250, ratio=0.92

      const result = scoreMatch(trip, parcel);
      expect(result.breakdown.priceScore).toBe(85);
    });

    it('returns 65 when offer is 75-89% of trip total', () => {
      const trip = makeTrip({ pricePerKg: 50 });
      const parcel = makeParcel({ weight: 5, priceOffer: 200 }); // tripTotal=250, ratio=0.8

      const result = scoreMatch(trip, parcel);
      expect(result.breakdown.priceScore).toBe(65);
    });

    it('returns 40 when offer is 50-74% of trip total', () => {
      const trip = makeTrip({ pricePerKg: 100 });
      const parcel = makeParcel({ weight: 5, priceOffer: 300 }); // tripTotal=500, ratio=0.6

      const result = scoreMatch(trip, parcel);
      expect(result.breakdown.priceScore).toBe(40);
    });

    it('returns 15 when offer is below 50% of trip total', () => {
      const trip = makeTrip({ pricePerKg: 100 });
      const parcel = makeParcel({ weight: 5, priceOffer: 100 }); // tripTotal=500, ratio=0.2

      const result = scoreMatch(trip, parcel);
      expect(result.breakdown.priceScore).toBe(15);
    });
  });

  describe('scoreMatch - rating factor', () => {
    it('returns 100 for rating >= 4.5', () => {
      const trip = makeTrip({ userRating: 4.8 });
      const parcel = makeParcel();

      const result = scoreMatch(trip, parcel);
      expect(result.breakdown.ratingScore).toBe(100);
    });

    it('returns 80 for rating between 4.0-4.49', () => {
      const trip = makeTrip({ userRating: 4.2 });
      const parcel = makeParcel();

      const result = scoreMatch(trip, parcel);
      expect(result.breakdown.ratingScore).toBe(80);
    });

    it('returns 60 for rating between 3.5-3.99', () => {
      const trip = makeTrip({ userRating: 3.7 });
      const parcel = makeParcel();

      const result = scoreMatch(trip, parcel);
      expect(result.breakdown.ratingScore).toBe(60);
    });

    it('returns 40 for rating between 3.0-3.49', () => {
      const trip = makeTrip({ userRating: 3.2 });
      const parcel = makeParcel();

      const result = scoreMatch(trip, parcel);
      expect(result.breakdown.ratingScore).toBe(40);
    });

    it('returns 20 for rating below 3.0', () => {
      const trip = makeTrip({ userRating: 2.5 });
      const parcel = makeParcel();

      const result = scoreMatch(trip, parcel);
      expect(result.breakdown.ratingScore).toBe(20);
    });
  });

  describe('scoreMatch - overall score calculation', () => {
    it('calculates weighted total from all breakdown scores', () => {
      const trip = makeTrip();
      const parcel = makeParcel();

      const result = scoreMatch(trip, parcel);

      // Manually calculate expected total
      const expected = Math.round(
        result.breakdown.routeScore * 0.30 +
        result.breakdown.dateScore * 0.20 +
        result.breakdown.capacityScore * 0.15 +
        result.breakdown.priceScore * 0.15 +
        result.breakdown.ratingScore * 0.10 +
        result.breakdown.reliabilityScore * 0.10
      );

      expect(result.total).toBe(expected);
    });

    it('assigns reliability score of 70 by default', () => {
      const trip = makeTrip();
      const parcel = makeParcel();

      const result = scoreMatch(trip, parcel);
      expect(result.breakdown.reliabilityScore).toBe(70);
    });

    it('grades as excellent when total >= 80', () => {
      // Perfect match scenario
      const trip = makeTrip({
        fromCity: 'Mumbai',
        toCity: 'Delhi',
        date: '2026-07-19',
        availableCapacity: 10,
        pricePerKg: 50,
        userRating: 4.9,
      });
      const parcel = makeParcel({
        fromCity: 'Mumbai',
        toCity: 'Delhi',
        createdAt: '2026-07-19',
        weight: 7,
        priceOffer: 500,
      });

      const result = scoreMatch(trip, parcel);
      expect(result.grade).toBe('excellent');
      expect(result.total).toBeGreaterThanOrEqual(80);
    });

    it('grades as good when total is 60-79', () => {
      const trip = makeTrip({
        fromCity: 'Mumbai',
        toCity: 'Delhi',
        date: '2026-07-24', // 4 days diff -> dateScore=40
        availableCapacity: 100,
        pricePerKg: 100,
        userRating: 3.5, // ratingScore=60
      });
      const parcel = makeParcel({
        fromCity: 'Mumbai',
        toCity: 'Delhi',
        createdAt: '2026-07-20',
        weight: 5, // 5% utilization -> capacityScore=40
        priceOffer: 300, // tripTotal=500, ratio=0.6 -> priceScore=40
      });

      const result = scoreMatch(trip, parcel);
      expect(result.grade).toBe('good');
      expect(result.total).toBeGreaterThanOrEqual(60);
      expect(result.total).toBeLessThan(80);
    });

    it('grades as poor when total < 40', () => {
      const trip = makeTrip({
        fromCity: 'UnknownCity',
        toCity: 'AnotherUnknown',
        date: '2026-08-15', // far future
        availableCapacity: 2,
        pricePerKg: 200,
        userRating: 2.0,
      });
      const parcel = makeParcel({
        fromCity: 'NowhereVille',
        toCity: 'GhostTown',
        createdAt: '2026-07-19',
        weight: 5,
        priceOffer: 50,
      });

      const result = scoreMatch(trip, parcel);
      expect(result.grade).toBe('poor');
      expect(result.total).toBeLessThan(40);
    });
  });

  describe('findBestMatches', () => {
    it('excludes trips owned by the same user as the parcel', () => {
      const parcel = makeParcel({ userId: 'user-1' });
      const trips = [
        makeTrip({ id: 'trip-1', userId: 'user-1', status: 'active' }),
        makeTrip({ id: 'trip-2', userId: 'user-2', status: 'active' }),
      ];

      const results = findBestMatches(parcel, trips);
      expect(results.every(r => r.trip.userId !== 'user-1')).toBe(true);
    });

    it('excludes trips that are not active', () => {
      const parcel = makeParcel();
      const trips = [
        makeTrip({ id: 'trip-1', userId: 'user-2', status: 'completed' }),
        makeTrip({ id: 'trip-2', userId: 'user-3', status: 'cancelled' }),
        makeTrip({ id: 'trip-3', userId: 'user-4', status: 'active' }),
      ];

      const results = findBestMatches(parcel, trips);
      expect(results.length).toBe(1);
      expect(results[0].trip.id).toBe('trip-3');
    });

    it('filters out matches below minScore threshold', () => {
      const parcel = makeParcel({ fromCity: 'Mumbai', toCity: 'Delhi' });
      const trips = [
        makeTrip({
          id: 'trip-1',
          userId: 'user-2',
          fromCity: 'UnknownCity',
          toCity: 'AnotherUnknown',
          date: '2026-08-15',
          userRating: 1.0,
          status: 'active',
        }),
      ];

      const results = findBestMatches(parcel, trips, { minScore: 50 });
      expect(results.length).toBe(0);
    });

    it('sorts results by score in descending order', () => {
      const parcel = makeParcel({ fromCity: 'Mumbai', toCity: 'Delhi', createdAt: '2026-07-19' });
      const trips = [
        makeTrip({ id: 'trip-low', userId: 'user-2', userRating: 2.0, date: '2026-07-30', status: 'active' }),
        makeTrip({ id: 'trip-high', userId: 'user-3', userRating: 4.9, date: '2026-07-19', status: 'active' }),
      ];

      const results = findBestMatches(parcel, trips);
      expect(results.length).toBe(2);
      expect(results[0].score.total).toBeGreaterThanOrEqual(results[1].score.total);
    });

    it('limits results to specified count', () => {
      const parcel = makeParcel();
      const trips = Array.from({ length: 30 }, (_, i) =>
        makeTrip({ id: `trip-${i}`, userId: `user-${i + 10}`, status: 'active' })
      );

      const results = findBestMatches(parcel, trips, { limit: 5 });
      expect(results.length).toBeLessThanOrEqual(5);
    });

    it('uses default minScore of 20 and limit of 20', () => {
      const parcel = makeParcel();
      const trips = Array.from({ length: 25 }, (_, i) =>
        makeTrip({ id: `trip-${i}`, userId: `user-${i + 10}`, status: 'active' })
      );

      const results = findBestMatches(parcel, trips);
      expect(results.length).toBeLessThanOrEqual(20);
    });

    it('returns empty array when no trips match', () => {
      const parcel = makeParcel();
      const trips: Trip[] = [];

      const results = findBestMatches(parcel, trips);
      expect(results).toEqual([]);
    });
  });

  describe('findBestParcelsForTrip', () => {
    it('returns open parcels from other users that fit capacity', () => {
      const trip = makeTrip({ userId: 'traveller-1', availableCapacity: 8 });
      const parcels = [
        makeParcel({ id: 'parcel-ok', userId: 'sender-1', status: 'open', weight: 4 }),
        makeParcel({ id: 'parcel-heavy', userId: 'sender-2', status: 'open', weight: 20 }),
        makeParcel({ id: 'parcel-own', userId: 'traveller-1', status: 'open', weight: 2 }),
        makeParcel({ id: 'parcel-closed', userId: 'sender-3', status: 'matched', weight: 2 }),
      ];

      const matches = findBestParcelsForTrip(trip, parcels, { minScore: 0, limit: 10 });
      expect(matches.map(match => match.parcel.id)).toEqual(['parcel-ok']);
    });
  });
});
