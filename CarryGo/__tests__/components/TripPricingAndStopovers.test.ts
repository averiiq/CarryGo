import {
  calculateRouteDistance,
  getSuggestedStopovers,
  calculatePriceGuidance,
} from '@/components/feature/trip/tripPricingAlgorithm';
import {
  VEHICLES,
  VEHICLE_MAX_CAPACITY,
  VEHICLE_QUICK_DEFAULTS,
} from '@/components/feature/trip/TripDetailsStep';

describe('Traveler Trip Flow - Pricing Algorithm, Commute Mode & Stopovers', () => {
  describe('Route Selection & Corridor Distance Calculation', () => {
    it('calculates direct corridor distance between two cities accurately', () => {
      // Delhi to Chandigarh direct corridor distance is ~240 km
      const distance = calculateRouteDistance('Delhi', 'Chandigarh');
      expect(distance).toBeGreaterThanOrEqual(220);
      expect(distance).toBeLessThanOrEqual(260);
    });

    it('calculates cumulative route distance with dynamic stopovers included', () => {
      // Delhi -> Panipat (~85km) -> Chandigarh (~160km)
      const directDist = calculateRouteDistance('Delhi', 'Chandigarh');
      const stopoverDist = calculateRouteDistance('Delhi', 'Chandigarh', ['Panipat']);

      expect(stopoverDist).toBeGreaterThan(0);
      // Cumulative distance via a waypoint on the direct line should be >= direct distance
      expect(stopoverDist).toBeGreaterThanOrEqual(directDist - 5);
    });

    it('returns 0 when fromCity or toCity is empty', () => {
      expect(calculateRouteDistance('', 'Chandigarh')).toBe(0);
      expect(calculateRouteDistance('Delhi', '')).toBe(0);
      expect(calculateRouteDistance('', '')).toBe(0);
    });

    it('suggests relevant intermediate stopovers for NH-44 corridor', () => {
      const suggestions = getSuggestedStopovers('Delhi', 'Chandigarh', []);
      expect(suggestions).toContain('Sonipat');
      expect(suggestions).toContain('Panipat');
      expect(suggestions).toContain('Karnal');
    });

    it('filters out already added stopovers from suggestions', () => {
      const suggestions = getSuggestedStopovers('Delhi', 'Chandigarh', ['Panipat', 'Karnal']);
      expect(suggestions).not.toContain('Panipat');
      expect(suggestions).not.toContain('Karnal');
      expect(suggestions).toContain('Sonipat');
    });
  });

  describe('Commute Mode Configuration & Chips', () => {
    it('supports all 5 required transport modes with proper capacity boundaries', () => {
      const types = VEHICLES.map((v) => v.type);
      expect(types).toContain('car');
      expect(types).toContain('train');
      expect(types).toContain('bus');
      expect(types).toContain('flight');
      expect(types).toContain('bike');
    });

    it('enforces maximum capacity constraints per vehicle', () => {
      expect(VEHICLE_MAX_CAPACITY.car).toBe(100);
      expect(VEHICLE_MAX_CAPACITY.train).toBe(150);
      expect(VEHICLE_MAX_CAPACITY.bus).toBe(100);
      expect(VEHICLE_MAX_CAPACITY.flight).toBe(25);
      expect(VEHICLE_MAX_CAPACITY.bike).toBe(15);
    });

    it('provides valid defaults within capacity limits for all vehicles', () => {
      for (const vehicle of VEHICLES) {
        const def = VEHICLE_QUICK_DEFAULTS[vehicle.type];
        expect(Number(def.capacity)).toBeLessThanOrEqual(VEHICLE_MAX_CAPACITY[vehicle.type]);
        expect(Number(def.price)).toBeGreaterThan(0);
      }
    });
  });

  describe('Negotiable Price Algorithm & Short Route Overcharge Prevention', () => {
    it('recommends lower rates for short routes (<= 60 km) to prevent overcharging', () => {
      const shortDistance = 50; // e.g. Gurugram to Delhi / Bahadurgarh
      const guidance = calculatePriceGuidance(shortDistance, 'car');

      expect(guidance.suggested).toBeLessThanOrEqual(50);
      expect(guidance.max).toBeLessThanOrEqual(70);
      expect(guidance.min).toBeGreaterThanOrEqual(25);
    });

    it('scales suggested rates reasonably for medium (120-250 km) and long (> 250 km) routes', () => {
      const shortGuidance = calculatePriceGuidance(50, 'car');
      const medGuidance = calculatePriceGuidance(200, 'car');
      const longGuidance = calculatePriceGuidance(350, 'car');

      expect(medGuidance.suggested).toBeGreaterThan(shortGuidance.suggested);
      expect(longGuidance.suggested).toBeGreaterThan(medGuidance.suggested);
    });

    it('applies vehicle mode multipliers (flight premium, train discount)', () => {
      const dist = 200;
      const carGuidance = calculatePriceGuidance(dist, 'car');
      const flightGuidance = calculatePriceGuidance(dist, 'flight');
      const trainGuidance = calculatePriceGuidance(dist, 'train');

      // Flight is premium express transit
      expect(flightGuidance.suggested).toBeGreaterThan(carGuidance.suggested);
      // Train is economical high-capacity transit
      expect(trainGuidance.suggested).toBeLessThanOrEqual(carGuidance.suggested);
    });

    it('flags overpriced charges on short routes to protect senders and increase booking rate', () => {
      const shortDistance = 50; // 50 km short corridor
      // Traveler attempts to charge ₹180/kg for a 50 km trip
      const guidance = calculatePriceGuidance(shortDistance, 'car', '180');

      expect(guidance.health).toBe('overpriced');
      expect(guidance.healthLabel).toMatch(/High for this Short Route/i);
      expect(guidance.healthDescription).toMatch(/Overcharging/i);
    });

    it('validates fair & competitive rates within the optimal corridor bracket', () => {
      const distance = 160;
      const guidance = calculatePriceGuidance(distance, 'car', '85');

      expect(guidance.health).toBe('fair');
      expect(guidance.healthLabel).toMatch(/Fair & Competitive/i);
    });

    it('identifies budget rates that guarantee rapid bookings', () => {
      const distance = 160;
      // Below min fair price (e.g. ₹30)
      const guidance = calculatePriceGuidance(distance, 'car', '30');

      expect(guidance.health).toBe('budget');
      expect(guidance.healthLabel).toMatch(/Budget/i);
    });
  });
});
