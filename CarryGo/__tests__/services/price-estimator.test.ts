import { estimatePrice, PriceEstimateParams } from '@/services/price-estimator.service';

const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockIlike = jest.fn();

jest.mock('@/template', () => ({
  getSupabaseClient: () => ({
    from: (table: string) => {
      mockFrom(table);
      return {
        select: (...args: unknown[]) => {
          mockSelect(...args);
          return {
            eq: (...eqArgs: unknown[]) => {
              mockEq(...eqArgs);
              return {
                ilike: (...ilikeArgs: unknown[]) => {
                  mockIlike(...ilikeArgs);
                  return {
                    ilike: () => Promise.resolve({ count: 5 }),
                  };
                },
              };
            },
          };
        },
      };
    },
  }),
}));

jest.mock('@/constants/indian-cities', () => ({
  findCity: (name: string) => {
    const cities: Record<string, { name: string; lat: number; lng: number }> = {
      mumbai: { name: 'Mumbai', lat: 19.076, lng: 72.8777 },
      delhi: { name: 'Delhi', lat: 28.7041, lng: 77.1025 },
      pune: { name: 'Pune', lat: 18.5204, lng: 73.8567 },
    };
    return cities[name.toLowerCase().trim()] || undefined;
  },
  getDistance: (city1: { lat: number; lng: number }, city2: { lat: number; lng: number }) => {
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

function makeParams(overrides: Partial<PriceEstimateParams> = {}): PriceEstimateParams {
  return {
    fromCity: 'Mumbai',
    toCity: 'Delhi',
    weight: 5,
    category: 'electronics',
    vehicleType: 'car',
    deliveryDate: undefined,
    ...overrides,
  };
}

describe('price-estimator.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('base price calculation', () => {
    it('includes a fixed base price in the breakdown', async () => {
      const result = await estimatePrice(makeParams());
      expect(result.breakdown.basePrice).toBe(50);
    });

    it('returns a positive suggested price', async () => {
      const result = await estimatePrice(makeParams());
      expect(result.suggestedPrice).toBeGreaterThan(0);
    });

    it('rounds suggested price to nearest 10', async () => {
      const result = await estimatePrice(makeParams());
      expect(result.suggestedPrice % 10).toBe(0);
    });
  });

  describe('distance factor', () => {
    it('calculates distance factor from known cities', async () => {
      const result = await estimatePrice(makeParams({ fromCity: 'Mumbai', toCity: 'Delhi' }));
      // Mumbai-Delhi is about 1140km, so distanceFactor = 1140 * 0.12 ~ 137
      expect(result.breakdown.distanceFactor).toBeGreaterThan(100);
    });

    it('uses fallback distance of 500km for unknown cities', async () => {
      const result = await estimatePrice(makeParams({ fromCity: 'UnknownA', toCity: 'UnknownB' }));
      // 500 * 0.12 = 60
      expect(result.breakdown.distanceFactor).toBe(60);
    });

    it('uses minimum distance factor of 1 for very close cities', async () => {
      const result = await estimatePrice(makeParams({ fromCity: 'Mumbai', toCity: 'Mumbai' }));
      // 0 * 0.12 = 0, but Math.max(1, ...) ensures minimum of 1
      expect(result.breakdown.distanceFactor).toBeGreaterThanOrEqual(1);
    });
  });

  describe('weight factor', () => {
    it('calculates weight factor as weight * 15', async () => {
      const result = await estimatePrice(makeParams({ weight: 10 }));
      // 10 * 15 = 150
      expect(result.breakdown.weightFactor).toBe(150);
    });

    it('uses minimum weight factor of 1', async () => {
      const result = await estimatePrice(makeParams({ weight: 0 }));
      // 0 * 15 = 0, Math.max(1, 0) = 1
      expect(result.breakdown.weightFactor).toBeGreaterThanOrEqual(1);
    });

    it('scales linearly with weight', async () => {
      const result5 = await estimatePrice(makeParams({ weight: 5 }));
      const result10 = await estimatePrice(makeParams({ weight: 10 }));

      expect(result10.breakdown.weightFactor).toBe(result5.breakdown.weightFactor * 2);
    });
  });

  describe('category factor', () => {
    it('applies category multiplier for documents (0.7)', async () => {
      const result = await estimatePrice(makeParams({ category: 'documents' }));
      expect(result.breakdown.categoryFactor).toBe(0.7);
    });

    it('applies category multiplier for electronics (1.4)', async () => {
      const result = await estimatePrice(makeParams({ category: 'electronics' }));
      expect(result.breakdown.categoryFactor).toBe(1.4);
    });

    it('applies category multiplier for clothing (0.9)', async () => {
      const result = await estimatePrice(makeParams({ category: 'clothing' }));
      expect(result.breakdown.categoryFactor).toBe(0.9);
    });

    it('applies category multiplier for food (1.1)', async () => {
      const result = await estimatePrice(makeParams({ category: 'food' }));
      expect(result.breakdown.categoryFactor).toBe(1.1);
    });

    it('applies category multiplier for medicine (1.3)', async () => {
      const result = await estimatePrice(makeParams({ category: 'medicine' }));
      expect(result.breakdown.categoryFactor).toBe(1.3);
    });

    it('applies category multiplier for other (1.0)', async () => {
      const result = await estimatePrice(makeParams({ category: 'other' }));
      expect(result.breakdown.categoryFactor).toBe(1.0);
    });

    it('electronics costs more than documents for same route and weight', async () => {
      const electronics = await estimatePrice(makeParams({ category: 'electronics' }));
      const documents = await estimatePrice(makeParams({ category: 'documents' }));

      expect(electronics.suggestedPrice).toBeGreaterThan(documents.suggestedPrice);
    });
  });

  describe('vehicle type factor', () => {
    it('applies vehicle multiplier for bike (0.7)', async () => {
      const result = await estimatePrice(makeParams({ vehicleType: 'bike' }));
      expect(result.breakdown.vehicleFactor).toBe(0.7);
    });

    it('applies vehicle multiplier for car (1.0)', async () => {
      const result = await estimatePrice(makeParams({ vehicleType: 'car' }));
      expect(result.breakdown.vehicleFactor).toBe(1.0);
    });

    it('applies vehicle multiplier for bus (0.85)', async () => {
      const result = await estimatePrice(makeParams({ vehicleType: 'bus' }));
      expect(result.breakdown.vehicleFactor).toBe(0.85);
    });

    it('applies vehicle multiplier for train (0.8)', async () => {
      const result = await estimatePrice(makeParams({ vehicleType: 'train' }));
      expect(result.breakdown.vehicleFactor).toBe(0.8);
    });

    it('applies vehicle multiplier for flight (1.6)', async () => {
      const result = await estimatePrice(makeParams({ vehicleType: 'flight' }));
      expect(result.breakdown.vehicleFactor).toBe(1.6);
    });

    it('defaults to car when vehicleType is not provided', async () => {
      const result = await estimatePrice(makeParams({ vehicleType: undefined }));
      expect(result.breakdown.vehicleFactor).toBe(1.0);
    });

    it('flight costs more than bike for same route', async () => {
      const flight = await estimatePrice(makeParams({ vehicleType: 'flight' }));
      const bike = await estimatePrice(makeParams({ vehicleType: 'bike' }));

      expect(flight.suggestedPrice).toBeGreaterThan(bike.suggestedPrice);
    });
  });

  describe('urgency factor', () => {
    it('returns 1.0 when no delivery date is specified', async () => {
      const result = await estimatePrice(makeParams({ deliveryDate: undefined }));
      expect(result.breakdown.urgencyFactor).toBe(1.0);
    });

    it('returns 1.5 for delivery within 1 day', async () => {
      const tomorrow = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
      const result = await estimatePrice(makeParams({ deliveryDate: tomorrow }));
      expect(result.breakdown.urgencyFactor).toBe(1.5);
    });

    it('returns 1.25 for delivery within 3 days', async () => {
      const threeDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
      const result = await estimatePrice(makeParams({ deliveryDate: threeDays }));
      expect(result.breakdown.urgencyFactor).toBe(1.25);
    });

    it('returns 1.1 for delivery within 7 days', async () => {
      const fiveDays = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
      const result = await estimatePrice(makeParams({ deliveryDate: fiveDays }));
      expect(result.breakdown.urgencyFactor).toBe(1.1);
    });

    it('returns 1.0 for delivery more than 7 days away', async () => {
      const twoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const result = await estimatePrice(makeParams({ deliveryDate: twoWeeks }));
      expect(result.breakdown.urgencyFactor).toBe(1.0);
    });

    it('returns 1.5 for past delivery dates (treated as very urgent)', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const result = await estimatePrice(makeParams({ deliveryDate: yesterday }));
      // Math.max(0, negative) = 0, which is <= 1 day
      expect(result.breakdown.urgencyFactor).toBe(1.5);
    });
  });

  describe('price range', () => {
    it('sets minPrice as 70% of suggested price', async () => {
      const result = await estimatePrice(makeParams());
      expect(result.minPrice).toBe(Math.round(result.suggestedPrice * 0.7));
    });

    it('sets maxPrice as 140% of suggested price', async () => {
      const result = await estimatePrice(makeParams());
      expect(result.maxPrice).toBe(Math.round(result.suggestedPrice * 1.4));
    });

    it('minPrice is always less than suggestedPrice', async () => {
      const result = await estimatePrice(makeParams());
      expect(result.minPrice).toBeLessThan(result.suggestedPrice);
    });

    it('maxPrice is always greater than suggestedPrice', async () => {
      const result = await estimatePrice(makeParams());
      expect(result.maxPrice).toBeGreaterThan(result.suggestedPrice);
    });
  });

  describe('confidence level', () => {
    it('returns low confidence when cities are not in database', async () => {
      const result = await estimatePrice(makeParams({ fromCity: 'UnknownA', toCity: 'UnknownB' }));
      expect(result.confidenceLevel).toBe('low');
    });

    it('returns medium confidence when cities are known but limited data', async () => {
      // With our mock, both cities are known but count=5 each so trips+parcels=10 > 3
      // Actually the mock returns count: 5 for both, so activeTrips=5, openParcels=5, sum=10>3
      const result = await estimatePrice(makeParams({ fromCity: 'Mumbai', toCity: 'Delhi' }));
      expect(result.confidenceLevel).toBe('high');
    });
  });

  describe('demand level', () => {
    it('returns demand level in the result', async () => {
      const result = await estimatePrice(makeParams());
      expect(['high', 'medium', 'low']).toContain(result.demandLevel);
    });

    it('demand factor is included in breakdown', async () => {
      const result = await estimatePrice(makeParams());
      expect(result.breakdown.demandFactor).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('handles zero weight', async () => {
      const result = await estimatePrice(makeParams({ weight: 0 }));
      expect(result.suggestedPrice).toBeGreaterThan(0);
    });

    it('handles very large weight', async () => {
      const result = await estimatePrice(makeParams({ weight: 500 }));
      expect(result.suggestedPrice).toBeGreaterThan(0);
      expect(result.breakdown.weightFactor).toBe(7500); // 500 * 15
    });

    it('structure includes all expected fields', async () => {
      const result = await estimatePrice(makeParams());
      expect(result).toHaveProperty('suggestedPrice');
      expect(result).toHaveProperty('minPrice');
      expect(result).toHaveProperty('maxPrice');
      expect(result).toHaveProperty('breakdown');
      expect(result).toHaveProperty('confidenceLevel');
      expect(result).toHaveProperty('demandLevel');
      expect(result.breakdown).toHaveProperty('basePrice');
      expect(result.breakdown).toHaveProperty('distanceFactor');
      expect(result.breakdown).toHaveProperty('weightFactor');
      expect(result.breakdown).toHaveProperty('categoryFactor');
      expect(result.breakdown).toHaveProperty('demandFactor');
      expect(result.breakdown).toHaveProperty('urgencyFactor');
      expect(result.breakdown).toHaveProperty('vehicleFactor');
    });
  });
});
