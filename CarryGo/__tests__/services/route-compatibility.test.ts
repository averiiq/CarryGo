import {
  checkRouteCompatibility,
  checkTripParcelRoute,
  areCitiesEquivalent,
} from '@/services/route-compatibility.service';
import { MarketplaceRelevanceService } from '@/services/marketplace-relevance.service';
import { Trip, Parcel } from '@/types';

function createMockTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 'trip-1',
    userId: 'user-traveler-1',
    userName: 'Traveler One',
    userRating: 4.8,
    fromCity: 'Hisar',
    toCity: 'Bhiwani',
    date: '2026-09-25',
    time: '10:00',
    vehicleType: 'car',
    availableCapacity: 15,
    pricePerKg: 20,
    status: 'active',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function createMockParcel(overrides: Partial<Parcel> = {}): Parcel {
  return {
    id: 'parcel-1',
    userId: 'user-sender-1',
    userName: 'Sender One',
    fromCity: 'Hisar',
    toCity: 'Bhiwani',
    category: 'electronics',
    description: 'Small box',
    weight: 2,
    priceOffer: 300,
    status: 'open',
    deliveryDate: '2026-09-25',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('RouteCompatibilityService & Production Matching Engine Rules', () => {
  describe('1. Exact Route Matching', () => {
    it('reliably matches identical routes with maximum confidence', () => {
      const result = checkRouteCompatibility('Hisar', 'Bhiwani', 'Hisar', 'Bhiwani');
      expect(result.isCompatible).toBe(true);
      expect(result.overallRouteScore).toBe(100);
      expect(result.originMatch.isExact).toBe(true);
      expect(result.destinationMatch.isExact).toBe(true);
    });

    it('matches routes across casing, trim, and standard aliases', () => {
      const result = checkRouteCompatibility('Delhi', 'Gurugram', 'new delhi', 'gurgaon');
      expect(result.isCompatible).toBe(true);
      expect(result.overallRouteScore).toBeGreaterThanOrEqual(90);
    });
  });

  describe('2. Completely Unrelated Routes (Zero Tolerance False Matches)', () => {
    it('strictly REJECTS Ambala → Chandigarh when sender needs Hisar → Bhiwani', () => {
      const result = checkRouteCompatibility(
        'Ambala',
        'Chandigarh',
        'Hisar',
        'Bhiwani'
      );
      expect(result.isCompatible).toBe(false);
      expect(result.overallRouteScore).toBe(0);
      expect(result.rejectionCode).toBe('ORIGIN_TOO_FAR');
    });

    it('strictly REJECTS Jaipur → Kota when sender needs Bhiwani → Delhi', () => {
      const result = checkRouteCompatibility('Jaipur', 'Kota', 'Bhiwani', 'Delhi');
      expect(result.isCompatible).toBe(false);
      expect(result.overallRouteScore).toBe(0);
    });

    it('strictly REJECTS Mumbai → Pune when sender needs Hisar → Bhiwani', () => {
      const result = checkRouteCompatibility('Mumbai', 'Pune', 'Hisar', 'Bhiwani');
      expect(result.isCompatible).toBe(false);
      expect(result.overallRouteScore).toBe(0);
    });
  });

  describe('3. Reverse Routes', () => {
    it('strictly REJECTS reverse traveler route (Bhiwani → Hisar for Hisar → Bhiwani parcel)', () => {
      const result = checkRouteCompatibility('Bhiwani', 'Hisar', 'Hisar', 'Bhiwani');
      expect(result.isCompatible).toBe(false);
      expect(result.overallRouteScore).toBe(0);
      expect(result.rejectionCode).toBe('REVERSE_DIRECTION');
    });
  });

  describe('4. Same Origin, Incompatible Destination', () => {
    it('does NOT qualify candidate merely because origin is the same', () => {
      // Hisar -> Mumbai traveler should NOT deliver a Hisar -> Bhiwani parcel
      const result = checkRouteCompatibility('Hisar', 'Mumbai', 'Hisar', 'Bhiwani');
      expect(result.isCompatible).toBe(false);
      expect(result.overallRouteScore).toBe(0);
      expect(result.destinationMatch.isCompatible).toBe(false);
    });
  });

  describe('5. Same Destination, Incompatible Origin', () => {
    it('does NOT qualify candidate merely because destination is the same', () => {
      // Mumbai -> Bhiwani traveler should NOT pick up in Hisar if origins are disconnected
      const result = checkRouteCompatibility('Mumbai', 'Bhiwani', 'Hisar', 'Bhiwani');
      expect(result.isCompatible).toBe(false);
      expect(result.overallRouteScore).toBe(0);
      expect(result.originMatch.isCompatible).toBe(false);
    });
  });

  describe('6. Corridor / Intermediate Route Waypoints', () => {
    it('supports intermediate drop-off when waypoint lies directly along the highway corridor', () => {
      // Traveler: Hisar -> Delhi (~165km)
      // Parcel: Hisar -> Rohtak (~90km, directly along NH9 on the way to Delhi)
      const result = checkRouteCompatibility('Hisar', 'Delhi', 'Hisar', 'Rohtak');
      expect(result.isCompatible).toBe(true);
      expect(result.routeOverlap.isIntermediateDropoff).toBe(true);
      expect(result.overallRouteScore).toBeGreaterThanOrEqual(80);
    });
  });

  describe('7. Trip vs Parcel Entity Evaluation (checkTripParcelRoute)', () => {
    it('correctly approves compatible Trip and Parcel objects', () => {
      const trip = createMockTrip({ fromCity: 'Hisar', toCity: 'Bhiwani' });
      const parcel = createMockParcel({ fromCity: 'Hisar', toCity: 'Bhiwani' });
      const result = checkTripParcelRoute(trip, parcel);
      expect(result.isCompatible).toBe(true);
      expect(result.overallRouteScore).toBe(100);
    });

    it('correctly rejects incompatible Trip and Parcel objects with zero score', () => {
      const trip = createMockTrip({ fromCity: 'Ambala', toCity: 'Chandigarh' });
      const parcel = createMockParcel({ fromCity: 'Hisar', toCity: 'Bhiwani' });
      const result = checkTripParcelRoute(trip, parcel);
      expect(result.isCompatible).toBe(false);
      expect(result.overallRouteScore).toBe(0);
    });
  });
});

describe('MarketplaceRelevanceService (City-Personalized Home Feed)', () => {
  const userCity = 'Bhiwani';

  it('marks activity originating from user home city as RELEVANT', () => {
    const isRelevant = MarketplaceRelevanceService.isRelevantToCity(
      { fromCity: 'Bhiwani', toCity: 'Delhi' },
      userCity
    );
    expect(isRelevant).toBe(true);
  });

  it('marks activity destined for user home city as RELEVANT', () => {
    const isRelevant = MarketplaceRelevanceService.isRelevantToCity(
      { fromCity: 'Delhi', toCity: 'Bhiwani' },
      userCity
    );
    expect(isRelevant).toBe(true);
  });

  it('marks regional route ending in user home city as RELEVANT', () => {
    const isRelevant = MarketplaceRelevanceService.isRelevantToCity(
      { fromCity: 'Hisar', toCity: 'Bhiwani' },
      userCity
    );
    expect(isRelevant).toBe(true);
  });

  it('strictly marks unrelated northern route as NOT RELEVANT to Bhiwani', () => {
    const isRelevant = MarketplaceRelevanceService.isRelevantToCity(
      { fromCity: 'Ambala', toCity: 'Chandigarh' },
      userCity
    );
    expect(isRelevant).toBe(false);
  });

  it('strictly marks distant routes as NOT RELEVANT to Bhiwani', () => {
    expect(MarketplaceRelevanceService.isRelevantToCity({ fromCity: 'Jaipur', toCity: 'Kota' }, userCity)).toBe(false);
    expect(MarketplaceRelevanceService.isRelevantToCity({ fromCity: 'Mumbai', toCity: 'Pune' }, userCity)).toBe(false);
    expect(MarketplaceRelevanceService.isRelevantToCity({ fromCity: 'Bengaluru', toCity: 'Mysuru' }, userCity)).toBe(false);
  });
});
