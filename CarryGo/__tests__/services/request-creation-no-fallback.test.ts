/**
 * BN-3: createRequest must NOT fall back to direct insert when RPC fails.
 *
 * Tests written FIRST (RED) — implementation follows.
 *
 * Behaviour under test: createRequest in requests.service.ts
 * Existing test files for this module: requests-authorization.test.ts, request-accept-flow.test.ts
 * User instruction: "right now keeping the both but for initial launch we use supabse and fix all
 * bottelneck issues and use these appproches. unit testing, integration testing, tdd(test driven
 * development), after completing the feature then break that feature and tell me what is break in points."
 */
import { getSupabaseClient } from '@/template';

jest.mock('@/template', () => ({
  getSupabaseClient: jest.fn(),
}));

jest.mock('@/lib/backend/provider', () => ({
  isAwsBackendEnabled: () => false,
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

jest.mock('@/services/notifications.service', () => ({
  notifyNewRequest: jest.fn().mockResolvedValue(undefined),
  notifyNewCarryOffer: jest.fn().mockResolvedValue(undefined),
  notifyRequestAccepted: jest.fn().mockResolvedValue(undefined),
  notifyRequestDeclined: jest.fn().mockResolvedValue(undefined),
  notifyOfferAccepted: jest.fn().mockResolvedValue(undefined),
  notifyOfferDeclined: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/services/parcels.service', () => ({
  fetchParcelById: jest.fn(),
  MAX_PAGE_SIZE: 100,
}));

jest.mock('@/services/trips.service', () => ({
  fetchTripById: jest.fn(),
  MAX_PAGE_SIZE: 100,
}));

jest.mock('@/services/avatar-enrichment.service', () => ({
  enrichMissingUserAvatars: jest.fn((items: any[]) => Promise.resolve(items)),
}));

jest.mock('@/constants/listingFlow', () => ({
  getUnmatchedListingCutoffIso: () => '2026-01-01T00:00:00.000Z',
}));

jest.mock('@/services/listing-expiry.service', () => ({
  expireStaleUnmatchedListings: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/services/marketplace-relevance.service', () => ({
  fetchCityMarketplaceTrips: jest.fn(),
  fetchCityMarketplaceParcels: jest.fn(),
}));

describe('BN-3: createRequest — no direct-insert fallback', () => {
  const mockRpc = jest.fn();
  const mockFrom = jest.fn();
  const mockInsert = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // RPC will fail
    mockRpc.mockReturnValue({
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'RPC permission denied: only parcel owner or trip traveller may create requests' },
      }),
    });

    // Direct insert chain — should NOT be called after fix
    const insertChain: any = {};
    insertChain.select = jest.fn().mockReturnValue(insertChain);
    insertChain.single = jest.fn().mockResolvedValue({ data: { id: 'should-not-exist' }, error: null });
    mockInsert.mockReturnValue(insertChain);
    mockFrom.mockReturnValue({ insert: mockInsert, select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), in: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      rpc: mockRpc,
      from: mockFrom,
    });
  });

  it('returns error when RPC fails instead of falling back to direct insert', async () => {
    const { createRequest } = require('@/services/requests.service');

    const result = await createRequest({
      parcelId: 'p1',
      tripId: 't1',
      senderId: 's1',
      senderName: 'Sender',
      travellerId: 'tr1',
      travellerName: 'Traveller',
      status: 'pending' as const,
      price: 100,
    }, 's1');

    // Should propagate the RPC error
    expect(result.error).toBeTruthy();
    expect(result.data).toBeNull();

    // CRITICAL: The direct insert path must NOT be reached
    expect(mockFrom).not.toHaveBeenCalledWith('requests');
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('does NOT call fetchParcelById or fetchTripById on RPC failure', async () => {
    const { fetchParcelById } = require('@/services/parcels.service');
    const { fetchTripById } = require('@/services/trips.service');
    const { createRequest } = require('@/services/requests.service');

    await createRequest({
      parcelId: 'p1',
      tripId: 't1',
      senderId: 's1',
      senderName: 'Sender',
      travellerId: 'tr1',
      travellerName: 'Traveller',
      status: 'pending' as const,
      price: 100,
    }, 's1');

    // Fallback path fetches parcel+trip to do client-side validation.
    // After fix, this should NOT happen.
    expect(fetchParcelById).not.toHaveBeenCalled();
    expect(fetchTripById).not.toHaveBeenCalled();
  });

  it('still succeeds when RPC returns valid data', async () => {
    // Reset RPC to succeed
    mockRpc.mockReturnValue({
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'req-1',
          parcel_id: 'p1',
          trip_id: 't1',
          sender_id: 's1',
          sender_name: 'Sender',
          traveller_id: 'tr1',
          traveller_name: 'Traveller',
          status: 'pending',
          price: 100,
          message: null,
          created_by: 's1',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
        error: null,
      }),
    });

    const { createRequest } = require('@/services/requests.service');

    const result = await createRequest({
      parcelId: 'p1',
      tripId: 't1',
      senderId: 's1',
      senderName: 'Sender',
      travellerId: 'tr1',
      travellerName: 'Traveller',
      status: 'pending' as const,
      price: 100,
    }, 's1');

    expect(result.data).toBeTruthy();
    expect(result.data.id).toBe('req-1');
    expect(result.error).toBeNull();
  });

  it('gracefully recovers via direct insert when Postgres emits a 42883 schema mismatch', async () => {
    mockRpc.mockReturnValue({
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { code: '42883', message: 'function public.emit_domain_event(uuid, unknown, jsonb) does not exist' },
      }),
    });

    const fallbackRow = {
      id: 'req-fallback-1',
      parcel_id: 'p1',
      trip_id: 't1',
      sender_id: 's1',
      sender_name: 'Sender',
      traveller_id: 'tr1',
      traveller_name: 'Traveller',
      status: 'pending',
      price: 100,
      message: null,
      created_by: 's1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };

    mockInsert.mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: fallbackRow,
          error: null,
        }),
      }),
    });

    const { createRequest } = require('@/services/requests.service');

    const result = await createRequest({
      parcelId: 'p1',
      tripId: 't1',
      senderId: 's1',
      senderName: 'Sender',
      travellerId: 'tr1',
      travellerName: 'Traveller',
      status: 'pending' as const,
      price: 100,
    }, 's1');

    expect(result.data).toBeTruthy();
    expect(result.data.id).toBe('req-fallback-1');
    expect(result.error).toBeNull();
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });
});
