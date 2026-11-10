/**
 * BN-1 / BN-2 / BN-7: Pagination & hard limit guards
 *
 * Tests written FIRST (RED) — implementation follows.
 * Covers: fetchUserParcels, fetchUserTrips, fetchRequestsByTripId,
 *         fetchRequestsByParcelId, and the shared MAX_PAGE_SIZE guard.
 */
import { getSupabaseClient } from '@/template';

jest.mock('@/template', () => ({
  getSupabaseClient: jest.fn(),
}));

jest.mock('@/lib/backend/provider', () => ({
  isAwsBackendEnabled: () => false,
}));

jest.mock('@/services/listing-expiry.service', () => ({
  expireStaleUnmatchedListings: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/services/avatar-enrichment.service', () => ({
  enrichMissingUserAvatars: jest.fn((items: any[]) => Promise.resolve(items)),
}));

jest.mock('@/services/marketplace-relevance.service', () => ({
  fetchCityMarketplaceTrips: jest.fn(),
  fetchCityMarketplaceParcels: jest.fn(),
}));

jest.mock('@/lib/server-rate-limit', () => ({
  enforceRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
}));

jest.mock('@/lib/sanitize', () => ({
  sanitizeLikeInput: (v: string) => v,
  sanitizeTextInput: (v: string) => v,
}));

jest.mock('@/lib/validation', () => ({
  validateUUID: () => ({ valid: true }),
  validateAmount: () => ({ valid: true }),
  validateDescription: () => ({ valid: true }),
}));

jest.mock('@/constants/listingFlow', () => ({
  getUnmatchedListingCutoffIso: () => '2026-01-01T00:00:00.000Z',
}));

// ── Supabase mock builder ──────────────────────────────────────────────────
function createChainMock(resolvedData: any[] = [], resolvedCount: number | null = null) {
  const terminal = {
    data: resolvedData,
    error: null,
    count: resolvedCount,
  };

  // Every chained method returns itself so .select().eq().order().range() works
  const chain: Record<string, jest.Mock> = {};
  const methods = ['select', 'eq', 'neq', 'gt', 'gte', 'lte', 'lt', 'in', 'or', 'ilike',
    'order', 'range', 'limit', 'single', 'maybeSingle', 'not', 'filter', 'is'];

  for (const m of methods) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }

  // Terminal — when awaited, resolve to data
  (chain as any).then = (resolve: Function) => resolve(terminal);

  return chain;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('BN-1: fetchUserParcels pagination', () => {
  let chain: ReturnType<typeof createChainMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    chain = createChainMock([
      { id: 'p1', user_id: 'u1', user_name: 'Alice', from_city: 'Mumbai', to_city: 'Delhi', category: 'electronics', description: 'Laptop', weight: 2, price_offer: 100, status: 'open', created_at: '2026-01-01' },
    ]);
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: jest.fn().mockReturnValue(chain) });
  });

  it('applies default limit of 50 and offset of 0 when no options passed', async () => {
    const { fetchUserParcels } = require('@/services/parcels.service');
    await fetchUserParcels('u1');

    expect(chain.range).toHaveBeenCalledWith(0, 49);
  });

  it('respects custom limit and offset', async () => {
    const { fetchUserParcels } = require('@/services/parcels.service');
    await fetchUserParcels('u1', { limit: 20, offset: 40 });

    expect(chain.range).toHaveBeenCalledWith(40, 59);
  });

  it('clamps limit to MAX_PAGE_SIZE (100) even if caller requests more', async () => {
    const { fetchUserParcels } = require('@/services/parcels.service');
    await fetchUserParcels('u1', { limit: 500 });

    // Should clamp to 100, so range(0, 99)
    expect(chain.range).toHaveBeenCalledWith(0, 99);
  });

  it('returns total count for UI pagination', async () => {
    chain = createChainMock(
      [{ id: 'p1', user_id: 'u1', user_name: 'A', from_city: 'X', to_city: 'Y', category: 'documents', description: 'd', weight: 1, price_offer: 10, status: 'open', created_at: '2026-01-01' }],
      42,
    );
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: jest.fn().mockReturnValue(chain) });

    const { fetchUserParcels } = require('@/services/parcels.service');
    const result = await fetchUserParcels('u1');

    expect(result.total).toBe(42);
  });

  it('returns empty array for empty userId', async () => {
    const { fetchUserParcels } = require('@/services/parcels.service');
    const result = await fetchUserParcels('');
    expect(result.data).toEqual([]);
  });
});

describe('BN-1: fetchUserTrips pagination', () => {
  let chain: ReturnType<typeof createChainMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    chain = createChainMock([
      { id: 't1', user_id: 'u1', user_name: 'Bob', from_city: 'Mumbai', to_city: 'Delhi', date: '2026-08-01', time: '10:00', vehicle_type: 'car', available_capacity: 10, price_per_kg: 50, status: 'active', created_at: '2026-01-01' },
    ]);
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: jest.fn().mockReturnValue(chain) });
  });

  it('applies default limit of 50 and offset of 0 when no options passed', async () => {
    const { fetchUserTrips } = require('@/services/trips.service');
    await fetchUserTrips('u1');

    expect(chain.range).toHaveBeenCalledWith(0, 49);
  });

  it('respects custom limit and offset', async () => {
    const { fetchUserTrips } = require('@/services/trips.service');
    await fetchUserTrips('u1', { limit: 10, offset: 20 });

    expect(chain.range).toHaveBeenCalledWith(20, 29);
  });

  it('clamps limit to MAX_PAGE_SIZE (100) even if caller requests more', async () => {
    const { fetchUserTrips } = require('@/services/trips.service');
    await fetchUserTrips('u1', { limit: 999 });

    expect(chain.range).toHaveBeenCalledWith(0, 99);
  });
});

describe('BN-2: fetchRequestsByTripId pagination', () => {
  let chain: ReturnType<typeof createChainMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    chain = createChainMock([
      { id: 'r1', parcel_id: 'p1', trip_id: 't1', sender_id: 's1', sender_name: 'S', traveller_id: 'tr1', traveller_name: 'T', status: 'pending', price: 100, created_at: '2026-01-01', updated_at: '2026-01-01' },
    ]);
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: jest.fn().mockReturnValue(chain) });
  });

  it('applies default limit and offset', async () => {
    const { fetchRequestsByTripId } = require('@/services/requests.service');
    await fetchRequestsByTripId('t1');

    expect(chain.range).toHaveBeenCalledWith(0, 49);
  });

  it('respects custom pagination params', async () => {
    const { fetchRequestsByTripId } = require('@/services/requests.service');
    await fetchRequestsByTripId('t1', { limit: 10, offset: 5 });

    expect(chain.range).toHaveBeenCalledWith(5, 14);
  });

  it('clamps limit to MAX_PAGE_SIZE', async () => {
    const { fetchRequestsByTripId } = require('@/services/requests.service');
    await fetchRequestsByTripId('t1', { limit: 200 });

    expect(chain.range).toHaveBeenCalledWith(0, 99);
  });
});

describe('BN-2: fetchRequestsByParcelId pagination', () => {
  let chain: ReturnType<typeof createChainMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    chain = createChainMock([
      { id: 'r2', parcel_id: 'p1', trip_id: 't1', sender_id: 's1', sender_name: 'S', traveller_id: 'tr1', traveller_name: 'T', status: 'pending', price: 200, created_at: '2026-01-01', updated_at: '2026-01-01' },
    ]);
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: jest.fn().mockReturnValue(chain) });
  });

  it('applies default limit and offset', async () => {
    const { fetchRequestsByParcelId } = require('@/services/requests.service');
    await fetchRequestsByParcelId('p1');

    expect(chain.range).toHaveBeenCalledWith(0, 49);
  });

  it('clamps limit to MAX_PAGE_SIZE', async () => {
    const { fetchRequestsByParcelId } = require('@/services/requests.service');
    await fetchRequestsByParcelId('p1', { limit: 300 });

    expect(chain.range).toHaveBeenCalledWith(0, 99);
  });
});

describe('BN-7: MAX_PAGE_SIZE exported constant', () => {
  it('exports MAX_PAGE_SIZE = 100 from parcels service', () => {
    const { MAX_PAGE_SIZE } = require('@/services/parcels.service');
    expect(MAX_PAGE_SIZE).toBe(100);
  });

  it('exports MAX_PAGE_SIZE = 100 from trips service', () => {
    const { MAX_PAGE_SIZE } = require('@/services/trips.service');
    expect(MAX_PAGE_SIZE).toBe(100);
  });

  it('exports MAX_PAGE_SIZE = 100 from requests service', () => {
    const { MAX_PAGE_SIZE } = require('@/services/requests.service');
    expect(MAX_PAGE_SIZE).toBe(100);
  });
});
