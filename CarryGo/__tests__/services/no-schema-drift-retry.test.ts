/**
 * BN-5 / BN-6: No schema-drift retry on create or fetch.
 *
 * Behaviour under test: createTrip, createParcel (no retry without columns),
 *   fetchTrips (no retry without stopovers clause).
 * Existing test files: TripDetailsStep.test.ts, TripReviewStep.test.ts (component-level, not service)
 * User instruction: "right now keeping the both but for initial launch we use supabse and fix all
 * bottelneck issues and use these appproches. unit testing, integration testing, tdd(test driven
 * development), after completing the feature then break that feature and tell me what is break in points."
 */
import { getSupabaseClient } from '@/template';

jest.mock('@/template', () => ({ getSupabaseClient: jest.fn() }));
jest.mock('@/lib/backend/provider', () => ({ isAwsBackendEnabled: () => false }));
jest.mock('@/lib/server-rate-limit', () => ({ enforceRateLimit: jest.fn().mockResolvedValue({ allowed: true }) }));
jest.mock('@/lib/sanitize', () => ({ sanitizeLikeInput: (v: string) => v, sanitizeTextInput: (v: string) => v }));
jest.mock('@/lib/validation', () => ({ validateUUID: () => ({ valid: true }), validateAmount: () => ({ valid: true }), validateDescription: () => ({ valid: true }) }));
jest.mock('@/services/listing-expiry.service', () => ({ expireStaleUnmatchedListings: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/services/avatar-enrichment.service', () => ({ enrichMissingUserAvatars: jest.fn((items: any[]) => Promise.resolve(items)) }));
jest.mock('@/services/marketplace-relevance.service', () => ({ fetchCityMarketplaceTrips: jest.fn(), fetchCityMarketplaceParcels: jest.fn() }));
jest.mock('@/constants/listingFlow', () => ({ getUnmatchedListingCutoffIso: () => '2026-01-01T00:00:00.000Z' }));

function createInsertChain(data: any = null, error: any = null) {
  const chain: Record<string, jest.Mock> = {};
  chain.select = jest.fn().mockReturnValue(chain);
  chain.single = jest.fn().mockResolvedValue({ data, error });
  return chain;
}

function createQueryChain(data: any[] = [], error: any = null) {
  const terminal = { data, error, count: data.length };
  const chain: Record<string, jest.Mock> = {};
  const methods = ['select', 'eq', 'neq', 'gt', 'gte', 'lte', 'lt', 'in', 'or', 'ilike', 'order', 'range', 'limit', 'single', 'maybeSingle', 'not', 'filter', 'is'];
  for (const m of methods) chain[m] = jest.fn().mockReturnValue(chain);
  (chain as any).then = (resolve: Function) => resolve(terminal);
  return chain;
}

describe('BN-5: createTrip — no schema-drift retry', () => {
  it('does NOT retry insert when first insert fails with column error', async () => {
    const insertChain = createInsertChain(null, { message: 'column "stopovers" does not exist' });
    const mockFrom = jest.fn().mockReturnValue({ insert: jest.fn().mockReturnValue(insertChain) });
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const { createTrip } = require('@/services/trips.service');
    const result = await createTrip({
      userId: 'u1', userName: 'Bob', fromCity: 'Mumbai', toCity: 'Delhi',
      date: '2026-08-01', time: '10:00', vehicleType: 'car',
      availableCapacity: 10, pricePerKg: 50, status: 'active',
      stopovers: ['Jaipur'],
    });

    // Should return error, NOT retry
    expect(result.error).toBeTruthy();
    // insert should be called exactly once (no retry)
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});

describe('BN-5: createParcel — no schema-drift retry', () => {
  it('does NOT retry insert when first insert fails with column error', async () => {
    const insertChain = createInsertChain(null, { message: 'column "user_avatar" does not exist' });
    const mockFrom = jest.fn().mockReturnValue({ insert: jest.fn().mockReturnValue(insertChain) });
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const { createParcel } = require('@/services/parcels.service');
    const result = await createParcel({
      userId: 'u1', userName: 'Alice', fromCity: 'Mumbai', toCity: 'Delhi',
      category: 'electronics', description: 'Laptop', weight: 2,
      priceOffer: 100, status: 'open', userAvatar: 'https://cdn.example.com/avatar.jpg',
    });

    expect(result.error).toBeTruthy();
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});

describe('BN-6: fetchTrips — no schema-drift retry', () => {
  it('does NOT retry query when stopovers clause causes error', async () => {
    const chain = createQueryChain([], { message: 'column "stopovers" does not exist' });
    const mockFrom = jest.fn().mockReturnValue(chain);
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const { fetchTrips } = require('@/services/trips.service');
    const result = await fetchTrips({ fromCity: 'Mumbai' });

    // Should return error, NOT retry
    expect(result.error).toBeTruthy();
    // .from('trips') should be called exactly once
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});
