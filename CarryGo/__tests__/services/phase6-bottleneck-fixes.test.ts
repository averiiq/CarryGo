/**
 * Phase 6 Bottleneck Fixes: BN-31 through BN-42
 *
 * BN-31: requests.service fetchRequestsByTripId/ParcelId select('*') → explicit columns
 * BN-32: parcels.service fetchParcelById/fetchParcelsByIds select('*') → explicit columns
 * BN-33: conversations.service fetchConversations/fetchMessages/fetchMessagesPage select('*') → explicit columns
 * BN-34: support.service getUserSupportTickets/getSupportTicketById select('*') → explicit columns
 * BN-35: subscriptions.service fetchSubscriptions select('*') → explicit columns
 * BN-36: storage.service empty catch {} at lines 191, 209 → console.warn
 * BN-37: kyc.service empty catch {} at lines 278, 477 → console.warn
 * BN-38: parcels.service parseImageUris empty catch {} → console.warn
 * BN-39: payments.service fetchPaymentByRequestOrId delivery fallback select('*') → explicit columns
 * BN-40: kyc.service fetchLatestKycSession select('*') → explicit columns (kyc_sessions + kyc_documents)
 * BN-41: promotional-banners.service fetchActivePromotionalBanners select('*') → explicit columns
 * BN-42: parcels.service fetchUserParcels select('*') → explicit columns (if present)
 */
import { getSupabaseClient } from '@/template';

jest.mock('@/template', () => ({ getSupabaseClient: jest.fn() }));
jest.mock('@/lib/server-rate-limit', () => ({ enforceRateLimit: jest.fn().mockResolvedValue({ allowed: true }) }));
jest.mock('@/lib/validation', () => ({
  validateUUID: (id: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id)) return { valid: true };
    return { valid: false, error: 'Invalid UUID format' };
  },
}));
jest.mock('@/lib/error-handler', () => ({ getUserErrorMessage: (_e: any, fb: string) => fb }));
jest.mock('@/lib/secure-storage', () => ({
  storageGet: jest.fn().mockResolvedValue(null),
  storageSet: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/services/listing-expiry.service', () => ({ expireStaleUnmatchedListings: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/services/avatar-enrichment.service', () => ({ enrichMissingUserAvatars: jest.fn((arr: any[]) => Promise.resolve(arr)) }));
jest.mock('@/lib/backend/provider', () => ({ isAwsBackendEnabled: () => false }));
jest.mock('@/constants/listingFlow', () => ({ getUnmatchedListingCutoffIso: () => '2026-01-01T00:00:00.000Z' }));
jest.mock('@/constants/featureFlags', () => ({
  FeatureFlags: { payments: true },
  disabledFeatureMessage: { payments: 'Payments disabled' },
}));
jest.mock('@/lib/sanitize', () => ({
  sanitizeLikeInput: (v: string) => v.slice(0, 200).replace(/[%_\\\\]/g, '\\\\$&'),
  sanitizeTextInput: (v: string, max: number = 1000) => v.slice(0, max).trim(),
  sanitizeMessageText: (v: string) => v.slice(0, 5000).trim(),
  isValidUuid: (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
}));

function createQueryChain(data: any = null, error: any = null) {
  const terminal = { data, error, count: Array.isArray(data) ? data.length : undefined };
  const chain: Record<string, jest.Mock> = {};
  const methods = ['select', 'eq', 'neq', 'gt', 'gte', 'lte', 'lt', 'in', 'or', 'ilike', 'order', 'range', 'limit', 'single', 'maybeSingle', 'not', 'filter', 'is', 'update', 'head', 'insert', 'delete', 'contains'];
  for (const m of methods) chain[m] = jest.fn().mockReturnValue(chain);
  (chain as any).then = (resolve: Function) => resolve(terminal);
  return chain;
}

// ── BN-31: requests.service — explicit columns ──────────────────────────────

describe('BN-31: fetchRequestsByTripId/ParcelId — explicit select columns', () => {
  it('fetchRequestsByTripId uses explicit column list', async () => {
    const chain = createQueryChain([]);
    const mockFrom = jest.fn().mockReturnValue(chain);
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const { fetchRequestsByTripId } = require('@/services/requests.service');
    await fetchRequestsByTripId('trip-1');

    expect(chain.select).toHaveBeenCalled();
    const selectArg = chain.select.mock.calls[0][0] as string;
    expect(selectArg).not.toBe('*');
    expect(selectArg).toContain('id');
    expect(selectArg).toContain('trip_id');
    expect(selectArg).toContain('parcel_id');
  });

  it('fetchRequestsByParcelId uses explicit column list', async () => {
    const chain = createQueryChain([]);
    const mockFrom = jest.fn().mockReturnValue(chain);
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const { fetchRequestsByParcelId } = require('@/services/requests.service');
    await fetchRequestsByParcelId('parcel-1');

    expect(chain.select).toHaveBeenCalled();
    const selectArg = chain.select.mock.calls[0][0] as string;
    expect(selectArg).not.toBe('*');
    expect(selectArg).toContain('id');
    expect(selectArg).toContain('parcel_id');
  });
});

// ── BN-32: parcels.service — explicit columns ───────────────────────────────

describe('BN-32: fetchParcelById/fetchParcelsByIds — explicit select columns', () => {
  it('fetchParcelById uses explicit column list', async () => {
    const chain = createQueryChain({ id: 'p1', user_id: 'u1', from_city: 'A', to_city: 'B', weight: 5, price_offer: 100, status: 'active', created_at: '2026-01-01' });
    const mockFrom = jest.fn().mockReturnValue(chain);
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const { fetchParcelById } = require('@/services/parcels.service');
    await fetchParcelById('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');

    expect(chain.select).toHaveBeenCalled();
    const selectArg = chain.select.mock.calls[0][0] as string;
    expect(selectArg).not.toBe('*');
    expect(selectArg).toContain('id');
    expect(selectArg).toContain('from_city');
    expect(selectArg).toContain('weight');
  });

  it('fetchParcelsByIds uses explicit column list', async () => {
    const chain = createQueryChain([]);
    const mockFrom = jest.fn().mockReturnValue(chain);
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const { fetchParcelsByIds } = require('@/services/parcels.service');
    await fetchParcelsByIds(['aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee']);

    expect(chain.select).toHaveBeenCalled();
    const selectArg = chain.select.mock.calls[0][0] as string;
    expect(selectArg).not.toBe('*');
    expect(selectArg).toContain('id');
  });
});

// ── BN-33: conversations.service — explicit columns ─────────────────────────

describe('BN-33: conversations — explicit select columns', () => {
  it('fetchConversations uses explicit column list', async () => {
    const chain = createQueryChain([]);
    const mockFrom = jest.fn().mockReturnValue(chain);
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const { fetchConversations } = require('@/services/conversations.service');
    await fetchConversations('user-1');

    expect(chain.select).toHaveBeenCalled();
    const selectArg = chain.select.mock.calls[0][0] as string;
    expect(selectArg).not.toBe('*');
    expect(selectArg).toContain('id');
    expect(selectArg).toContain('participant_ids');
  });

  it('fetchMessages uses explicit column list', async () => {
    const chain = createQueryChain([]);
    const mockFrom = jest.fn().mockReturnValue(chain);
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const { fetchMessages } = require('@/services/conversations.service');
    await fetchMessages('conv-1');

    expect(chain.select).toHaveBeenCalled();
    const selectArg = chain.select.mock.calls[0][0] as string;
    expect(selectArg).not.toBe('*');
    expect(selectArg).toContain('id');
    expect(selectArg).toContain('text');
    expect(selectArg).toContain('sender_id');
  });

  it('fetchMessagesPage uses explicit column list', async () => {
    const chain = createQueryChain([]);
    const mockFrom = jest.fn().mockReturnValue(chain);
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const { fetchMessagesPage } = require('@/services/conversations.service');
    await fetchMessagesPage('conv-1');

    expect(chain.select).toHaveBeenCalled();
    const selectArg = chain.select.mock.calls[0][0] as string;
    expect(selectArg).not.toBe('*');
    expect(selectArg).toContain('id');
    expect(selectArg).toContain('text');
  });
});

// ── BN-34: support.service — explicit columns ───────────────────────────────

describe('BN-34: support tickets — explicit select columns', () => {
  it('getUserSupportTickets uses explicit column list', async () => {
    const chain = createQueryChain([]);
    const mockFrom = jest.fn().mockReturnValue(chain);
    const uid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const mockAuth = { getUser: jest.fn().mockResolvedValue({ data: { user: { id: uid } } }) };
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom, auth: mockAuth });

    const { getUserSupportTickets } = require('@/services/support.service');
    await getUserSupportTickets(uid);

    expect(chain.select).toHaveBeenCalled();
    const selectArg = chain.select.mock.calls[0][0] as string;
    expect(selectArg).not.toBe('*');
    expect(selectArg).toContain('id');
    expect(selectArg).toContain('subject');
    expect(selectArg).toContain('status');
  });

  it('getSupportTicketById uses explicit column list', async () => {
    const chain = createQueryChain({ id: 't1', user_id: 'u1', subject: 'test', status: 'open', created_at: '2026-01-01' });
    const mockFrom = jest.fn().mockReturnValue(chain);
    const mockAuth = { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' } } }) };
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom, auth: mockAuth });

    const { getSupportTicketById } = require('@/services/support.service');
    await getSupportTicketById('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');

    expect(chain.select).toHaveBeenCalled();
    const selectArg = chain.select.mock.calls[0][0] as string;
    expect(selectArg).not.toBe('*');
    expect(selectArg).toContain('id');
  });
});

// ── BN-35: subscriptions.service — explicit columns ─────────────────────────

describe('BN-35: fetchSubscriptions — explicit select columns', () => {
  it('uses explicit column list', async () => {
    const chain = createQueryChain([]);
    const mockFrom = jest.fn().mockReturnValue(chain);
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const { fetchSubscriptions } = require('@/services/subscriptions.service');
    await fetchSubscriptions('user-1');

    expect(chain.select).toHaveBeenCalled();
    const selectArg = chain.select.mock.calls[0][0] as string;
    expect(selectArg).not.toBe('*');
    expect(selectArg).toContain('id');
    expect(selectArg).toContain('from_city');
    expect(selectArg).toContain('to_city');
  });
});

// ── BN-38: parcels.service parseImageUris catch {} → console.warn ───────────

describe('BN-38: parseImageUris — empty catch logs warning', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('logs warning when JSON.parse fails in parseImageUris', async () => {
    // parseImageUris is internal, but exercised through fetchParcelById with bad image_url
    const chain = createQueryChain({
      id: 'p1', user_id: 'u1', from_city: 'A', to_city: 'B',
      weight: 5, price_offer: 100, status: 'active', created_at: '2026-01-01',
      image_url: '{not-valid-json',
    });
    const mockFrom = jest.fn().mockReturnValue(chain);
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const { fetchParcelById } = require('@/services/parcels.service');
    await fetchParcelById('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');

    const warnCalls = consoleSpy.mock.calls.map((c: any[]) => c.join(' '));
    const hasWarn = warnCalls.some((msg: string) =>
      msg.includes('parseImageUris') || msg.includes('image') || msg.includes('JSON')
    );
    expect(hasWarn).toBe(true);
  });
});

// ── BN-40: kyc.service fetchLatestKycSession — explicit columns ─────────────

describe('BN-40: fetchLatestKycSession — explicit select columns', () => {
  it('uses explicit column list for kyc_sessions', async () => {
    const sessionChain = createQueryChain({ id: 's1', user_id: 'u1', status: 'pending', created_at: '2026-01-01', full_name: 'Test', id_type: 'aadhaar', submission_attempt: 1 });
    const docsChain = createQueryChain([]);
    const mockFrom = jest.fn().mockImplementation((table: string) => {
      if (table === 'kyc_sessions') return sessionChain;
      if (table === 'kyc_documents') return docsChain;
      return createQueryChain();
    });
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const { fetchLatestKycSession } = require('@/services/kyc.service');
    await fetchLatestKycSession('u1');

    // kyc_sessions select
    expect(sessionChain.select).toHaveBeenCalled();
    const sessionSelect = sessionChain.select.mock.calls[0][0] as string;
    expect(sessionSelect).not.toBe('*');
    expect(sessionSelect).toContain('id');
    expect(sessionSelect).toContain('user_id');

    // kyc_documents select
    expect(docsChain.select).toHaveBeenCalled();
    const docsSelect = docsChain.select.mock.calls[0][0] as string;
    expect(docsSelect).not.toBe('*');
    expect(docsSelect).toContain('id');
    expect(docsSelect).toContain('session_id');
  });
});

// ── BN-41: promotional-banners.service — explicit columns ───────────────────

describe('BN-41: fetchActivePromotionalBanners — explicit select columns', () => {
  it('uses explicit column list', async () => {
    const chain = createQueryChain([]);
    const mockFrom = jest.fn().mockReturnValue(chain);
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const { fetchActivePromotionalBanners } = require('@/services/promotional-banners.service');
    await fetchActivePromotionalBanners();

    expect(chain.select).toHaveBeenCalled();
    const selectArg = chain.select.mock.calls[0][0] as string;
    expect(selectArg).not.toBe('*');
    expect(selectArg).toContain('id');
    expect(selectArg).toContain('title');
  });
});
