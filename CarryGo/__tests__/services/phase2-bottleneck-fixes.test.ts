/**
 * Phase 2 Bottleneck Fixes: BN-8 through BN-11
 *
 * BN-8:  confirmMockBookingPayment must be gated behind __DEV__
 * BN-9:  fetchRequests must NOT fallback to basic select on join failure
 * BN-10: fetchRequestById must NOT fallback to basic select on join failure
 * BN-11: fetchUserPayments must accept limit/offset pagination
 *
 * Modules under test: payments.service.ts, requests.service.ts
 * Existing tests: payments.test.ts, request-creation-no-fallback.test.ts
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
jest.mock('@/services/notifications.service', () => ({
  notifyNewRequest: jest.fn().mockResolvedValue(undefined),
  notifyNewCarryOffer: jest.fn().mockResolvedValue(undefined),
  notifyRequestAccepted: jest.fn().mockResolvedValue(undefined),
  notifyRequestDeclined: jest.fn().mockResolvedValue(undefined),
  notifyOfferAccepted: jest.fn().mockResolvedValue(undefined),
  notifyOfferDeclined: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/services/parcels.service', () => ({ fetchParcelById: jest.fn() }));
jest.mock('@/services/trips.service', () => ({ fetchTripById: jest.fn() }));
jest.mock('@/services/deliveries.service', () => ({ fetchOrCreateDelivery: jest.fn().mockResolvedValue({}) }));
jest.mock('@/lib/secure-storage', () => ({
  storageGet: jest.fn().mockResolvedValue(null),
  storageSet: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/constants/featureFlags', () => ({
  FeatureFlags: { payments: true },
  disabledFeatureMessage: { payments: 'Payments disabled' },
}));
jest.mock('@/lib/error-handler', () => ({ getUserErrorMessage: (_e: any, fb: string) => fb }));

function createQueryChain(data: any[] | any = [], error: any = null) {
  const isArray = Array.isArray(data);
  const terminal = { data, error, count: isArray ? data.length : undefined };
  const chain: Record<string, jest.Mock> = {};
  const methods = ['select', 'eq', 'neq', 'gt', 'gte', 'lte', 'lt', 'in', 'or', 'ilike', 'order', 'range', 'limit', 'single', 'maybeSingle', 'not', 'filter', 'is'];
  for (const m of methods) chain[m] = jest.fn().mockReturnValue(chain);
  (chain as any).then = (resolve: Function) => resolve(terminal);
  return chain;
}

// ── BN-8: confirmMockBookingPayment gated behind __DEV__ ──────────────────────

describe('BN-8: confirmMockBookingPayment — dev-only gate', () => {
  it('returns error in production mode (__DEV__ === false)', async () => {
    const originalDev = (global as any).__DEV__;
    (global as any).__DEV__ = false;

    const mockFrom = jest.fn().mockReturnValue(createQueryChain());
    const mockGetSession = jest.fn().mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: mockFrom,
      auth: { getSession: mockGetSession },
    });

    const { confirmMockBookingPayment } = require('@/services/payments.service');
    const result = await confirmMockBookingPayment({
      requestId: 'req_1',
      amount: 100,
      senderId: 'u1',
      travellerId: 'u2',
    });

    expect(result.error).toBeTruthy();
    expect(result.data).toBeNull();
    // Should NOT have queried the DB at all
    expect(mockFrom).not.toHaveBeenCalled();

    (global as any).__DEV__ = originalDev;
  });
});

// ── BN-9: fetchRequests — no embedding fallback ──────────────────────────────

describe('BN-9: fetchRequests — no embedding fallback on join failure', () => {
  it('returns error when join query fails instead of retrying without join', async () => {
    const chain = createQueryChain([], { message: 'relation "parcels" does not exist' });
    const mockFrom = jest.fn().mockReturnValue(chain);
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const { fetchRequests } = require('@/services/requests.service');
    const result = await fetchRequests('user-1');

    // Should return the error, NOT retry
    expect(result.error).toBeTruthy();
    // .from('requests') called exactly once (no fallback)
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});

// ── BN-10: fetchRequestById — no embedding fallback ──────────────────────────

describe('BN-10: fetchRequestById — no embedding fallback on join failure', () => {
  it('returns error when join query fails instead of retrying without join', async () => {
    const chain = createQueryChain(null, { message: 'relation "trips" does not exist' });
    const mockFrom = jest.fn().mockReturnValue(chain);
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const { fetchRequestById } = require('@/services/requests.service');
    const result = await fetchRequestById('req-1');

    expect(result.error).toBeTruthy();
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});

// ── BN-11: fetchUserPayments — pagination ─────────────────────────────────────

describe('BN-11: fetchUserPayments — pagination support', () => {
  it('accepts limit and offset parameters', async () => {
    const chain = createQueryChain([]);
    const mockFrom = jest.fn().mockReturnValue(chain);
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const { fetchUserPayments } = require('@/services/payments.service');
    await fetchUserPayments('user-1', { limit: 20, offset: 10 });

    // Should call .range() for pagination
    expect(chain.range).toHaveBeenCalledWith(10, 29);
  });

  it('clamps limit to MAX_PAGE_SIZE (100)', async () => {
    const chain = createQueryChain([]);
    const mockFrom = jest.fn().mockReturnValue(chain);
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const { fetchUserPayments } = require('@/services/payments.service');
    await fetchUserPayments('user-1', { limit: 500, offset: 0 });

    // Should clamp to 100
    expect(chain.range).toHaveBeenCalledWith(0, 99);
  });

  it('uses defaults when no options provided', async () => {
    const chain = createQueryChain([]);
    const mockFrom = jest.fn().mockReturnValue(chain);
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const { fetchUserPayments } = require('@/services/payments.service');
    await fetchUserPayments('user-1');

    // Default: limit=50, offset=0 → range(0, 49)
    expect(chain.range).toHaveBeenCalledWith(0, 49);
  });
});
