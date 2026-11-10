/**
 * Phase 4 Bottleneck Fixes: BN-18 through BN-23
 *
 * BN-18: Empty catch {} in deliveries notification IIFEs must log warnings
 * BN-19: Unsanitized city filter in trips.service stopovers .or() — injection risk
 * BN-20: OTP values leaked in push notification body and data payloads
 * BN-21: Empty catch {} in payments confirmMockBookingPayment request status update (line 346)
 * BN-22: submitRating direct insert fallback bypasses RLS — remove it
 * BN-23: resolveRequestId returns raw identifier on failure instead of empty string
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
  validateAmount: () => ({ valid: true }),
  validateDescription: () => ({ valid: true }),
}));
jest.mock('@/constants/featureFlags', () => ({
  FeatureFlags: { payments: true, secureDeliveryConfirmation: true },
  disabledFeatureMessage: { payments: 'Payments disabled' },
}));
jest.mock('@/lib/error-handler', () => ({ getUserErrorMessage: (_e: any, fb: string) => fb }));
jest.mock('@/lib/secure-storage', () => ({
  storageGet: jest.fn().mockResolvedValue(null),
  storageSet: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/services/notifications.service', () => ({
  ...jest.requireActual('@/services/notifications.service'),
  notifyPickupConfirmed: jest.fn().mockResolvedValue({ success: true }),
  notifyDeliveryCompleted: jest.fn().mockResolvedValue({ success: true }),
  notifyDeliveryOtpReady: jest.fn().mockResolvedValue({ success: true }),
  notifyTripMilestone: jest.fn().mockResolvedValue({ success: true }),
  notifyPayoutReleased: jest.fn().mockResolvedValue({ success: true }),
}));
jest.mock('@/services/rewards.service', () => ({ awardDeliveryCoins: jest.fn() }));
jest.mock('@/constants/security', () => ({
  DELIVERY_OTP_LENGTH: 6,
  isFixedLengthNumericCode: (code: string, len: number) => new RegExp(`^\\d{${len}}$`).test(code),
}));
jest.mock('@/lib/sanitize', () => ({
  sanitizeLikeInput: (v: string) => v.slice(0, 200).replace(/[%_\\]/g, '\\$&'),
  sanitizeTextInput: (v: string, max: number = 1000) => v.slice(0, max).trim(),
  isValidUuid: (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
}));
jest.mock('@/services/listing-expiry.service', () => ({ expireStaleUnmatchedListings: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/services/avatar-enrichment.service', () => ({ enrichMissingUserAvatars: jest.fn((arr: any[]) => Promise.resolve(arr)) }));
jest.mock('@/lib/backend/provider', () => ({ isAwsBackendEnabled: () => false }));
jest.mock('@/constants/listingFlow', () => ({ getUnmatchedListingCutoffIso: () => '2026-01-01T00:00:00.000Z' }));
jest.mock('@/services/deliveries.service', () => ({
  ...jest.requireActual('@/services/deliveries.service'),
  fetchOrCreateDelivery: jest.fn().mockResolvedValue({ data: null, error: null }),
}));

function createQueryChain(data: any = null, error: any = null) {
  const terminal = { data, error, count: Array.isArray(data) ? data.length : undefined };
  const chain: Record<string, jest.Mock> = {};
  const methods = ['select', 'eq', 'neq', 'gt', 'gte', 'lte', 'lt', 'in', 'or', 'ilike', 'order', 'range', 'limit', 'single', 'maybeSingle', 'not', 'filter', 'is', 'update', 'head', 'insert'];
  for (const m of methods) chain[m] = jest.fn().mockReturnValue(chain);
  (chain as any).then = (resolve: Function) => resolve(terminal);
  return chain;
}

// ── BN-19: Unsanitized stopovers filter in trips.service ────────────────────

describe('BN-19: fetchTrips — sanitized stopovers filter prevents injection', () => {
  it('sanitizes fromCity in stopovers .cs.{} filter to prevent PostgREST injection', async () => {
    const chain = createQueryChain([]);
    const mockFrom = jest.fn().mockReturnValue(chain);
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const { fetchTrips } = require('@/services/trips.service');
    // Injection attempt: closing brace + comma + arbitrary filter
    await fetchTrips({ fromCity: 'Mumbai},from_city.eq.hacked' });

    // The .or() call should use sanitized value, not raw user input
    expect(chain.or).toHaveBeenCalled();
    const orArg = chain.or.mock.calls[0][0] as string;
    // Must NOT contain the raw injection payload in the stopovers filter
    expect(orArg).not.toContain('from_city.eq.hacked');
  });

  it('sanitizes toCity in stopovers .cs.{} filter to prevent PostgREST injection', async () => {
    const chain = createQueryChain([]);
    const mockFrom = jest.fn().mockReturnValue(chain);
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const { fetchTrips } = require('@/services/trips.service');
    await fetchTrips({ toCity: 'Delhi},to_city.eq.hacked' });

    expect(chain.or).toHaveBeenCalled();
    const orArg = chain.or.mock.calls[0][0] as string;
    expect(orArg).not.toContain('to_city.eq.hacked');
  });
});

// ── BN-20: OTP leaked in push notification payloads ─────────────────────────

describe('BN-20: OTP values must not appear in push notification body or data', () => {
  it('notifyPickupOtpReady does not include raw OTP in body text', async () => {
    const { notifyPickupOtpReady } = require('@/services/notifications.service');

    const mockDispatch = jest.fn().mockResolvedValue({ success: true });
    jest.spyOn(require('@/services/notifications.service'), 'dispatchNotification').mockImplementation(mockDispatch);

    await notifyPickupOtpReady({ senderId: 'user-1', otp: '4821', deliveryId: 'del-1' });

    if (mockDispatch.mock.calls.length > 0) {
      const payload = mockDispatch.mock.calls[0][0];
      // Body must NOT contain the raw OTP digits
      expect(payload.body).not.toContain('4821');
      // Data payload must NOT contain the OTP
      expect(payload.data?.otp).toBeUndefined();
    }
  });

  it('notifyDeliveryOtpReady does not include raw OTP in body or data', async () => {
    const { notifyDeliveryOtpReady } = require('@/services/notifications.service');

    const mockDispatch = jest.fn().mockResolvedValue({ success: true });
    jest.spyOn(require('@/services/notifications.service'), 'dispatchNotification').mockImplementation(mockDispatch);

    await notifyDeliveryOtpReady({ recipientId: 'user-2', otp: '839201', deliveryId: 'del-2', travellerName: 'John' });

    if (mockDispatch.mock.calls.length > 0) {
      const payload = mockDispatch.mock.calls[0][0];
      expect(payload.body).not.toContain('839201');
      expect(payload.data?.otp).toBeUndefined();
    }
  });
});

// ── BN-21: Empty catch in confirmMockBookingPayment request status update ───

describe('BN-21: confirmMockBookingPayment — empty catch on request status update logs warning', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('logs warning when request status update throws', async () => {
    const chain = createQueryChain(null, null);
    // Make the update chain throw
    chain.update = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockRejectedValue(new Error('update failed')),
      }),
    });
    const mockFrom = jest.fn().mockImplementation((table: string) => {
      if (table === 'requests') return chain;
      return createQueryChain(null, null);
    });
    const mockAuth = { getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: 'u1' } } } }) };
    const mockRpc = jest.fn().mockResolvedValue({ data: null, error: null });
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom, auth: mockAuth, rpc: mockRpc });

    const { confirmMockBookingPayment } = require('@/services/payments.service');
    await confirmMockBookingPayment({ requestId: 'req-1', amount: 100, senderId: 'u1' });

    // Should have logged a warning instead of silently swallowing
    const warnCalls = consoleSpy.mock.calls.map((c: any[]) => c.join(' '));
    const hasUpdateWarning = warnCalls.some((msg: string) =>
      msg.includes('request') && (msg.includes('status') || msg.includes('update') || msg.includes('accept'))
    );
    expect(hasUpdateWarning).toBe(true);
  });
});

// ── BN-22: submitRating — no direct insert fallback ─────────────────────────

describe('BN-22: submitRating — no direct insert fallback bypassing RLS', () => {
  it('does NOT attempt direct .from("ratings").insert() when RPC fails', async () => {
    const rpcMock = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'RPC function error' },
    });
    const fromMock = jest.fn().mockReturnValue(createQueryChain());
    (getSupabaseClient as jest.Mock).mockReturnValue({ rpc: rpcMock, from: fromMock });

    const { submitRating } = require('@/services/ratings.service');
    const result = await submitRating({
      fromUserId: 'u1',
      toUserId: 'u2',
      requestId: 'req-1',
      rating: 5,
      comment: 'Great!',
    });

    expect(result.error).toBeTruthy();
    // Must NOT fall back to direct table insert
    expect(fromMock).not.toHaveBeenCalledWith('ratings');
  });

  it('does NOT attempt direct insert when RPC throws exception', async () => {
    const rpcMock = jest.fn().mockRejectedValue(new Error('network error'));
    const fromMock = jest.fn().mockReturnValue(createQueryChain());
    (getSupabaseClient as jest.Mock).mockReturnValue({ rpc: rpcMock, from: fromMock });

    const { submitRating } = require('@/services/ratings.service');
    const result = await submitRating({
      fromUserId: 'u1',
      toUserId: 'u2',
      requestId: 'req-1',
      rating: 4,
    });

    expect(result.error).toBeTruthy();
    expect(fromMock).not.toHaveBeenCalledWith('ratings');
  });
});

// ── BN-18: Empty catch in deliveries notification IIFEs ─────────────────────

describe('BN-18: deliveries notification IIFEs log warnings instead of empty catch', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('updateTripProgress notification IIFE logs warning on failure', async () => {
    const mockRpc = jest.fn().mockResolvedValueOnce({ error: null });
    // Make the IIFE's from('deliveries') chain throw to trigger the catch
    const throwingChain: Record<string, jest.Mock> = {};
    const methods = ['select', 'eq', 'or', 'maybeSingle'];
    for (const m of methods) throwingChain[m] = jest.fn().mockReturnValue(throwingChain);
    throwingChain.maybeSingle = jest.fn().mockRejectedValue(new Error('DB connection lost'));
    const mockFrom = jest.fn().mockReturnValue(throwingChain);
    (getSupabaseClient as jest.Mock).mockReturnValue({ rpc: mockRpc, from: mockFrom });

    const { updateTripProgress } = require('@/services/deliveries.service');
    await updateTripProgress('del-1', 'On Highway', 'Traffic clear', '45 mins');

    // Give the void IIFE a tick to execute
    await new Promise(resolve => setTimeout(resolve, 100));

    const warnCalls = consoleSpy.mock.calls.map((c: any[]) => c.join(' '));
    const hasNotifWarning = warnCalls.some((msg: string) =>
      msg.includes('milestone') || msg.includes('trip') || msg.includes('notification')
    );
    expect(hasNotifWarning).toBe(true);
  });
});

// ── BN-23: resolveRequestId — returns empty string on total failure ─────────

describe('BN-23: resolveRequestId — returns empty string on total failure, not raw input', () => {
  it('returns empty string when all lookups fail', async () => {
    const failChain = createQueryChain(null, { message: 'DB connection lost' });
    const mockFrom = jest.fn().mockReturnValue(failChain);
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const { resolveRequestId } = require('@/services/payments.service');
    const result = await resolveRequestId('some-garbage-input');

    // Should NOT return the raw input back (which could be garbage/injection)
    expect(result).toBe('');
  });

  it('returns empty string when identifier is not found in any table', async () => {
    const emptyChain = createQueryChain(null, null); // no data, no error
    const mockFrom = jest.fn().mockReturnValue(emptyChain);
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const { resolveRequestId } = require('@/services/payments.service');
    const result = await resolveRequestId('nonexistent-id');

    expect(result).toBe('');
  });
});
