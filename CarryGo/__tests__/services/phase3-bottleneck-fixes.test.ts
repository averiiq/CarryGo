/**
 * Phase 3 Bottleneck Fixes: BN-12 through BN-17
 *
 * BN-12: fetchDelivery must NOT retry on column errors (schema-drift)
 * BN-13: fetchPaymentByRequestOrId — reduce 3 sequential queries to 2
 * BN-14: resolveRequestId — parallelized lookups
 * BN-15: fetchNotifications must accept limit/offset pagination
 * BN-16: deliveries.service .or() calls must validate UUID to prevent injection
 * BN-17: fetchOrCreateDelivery must surface errors alongside fallback shell
 *
 * Modules under test: deliveries.service.ts, payments.service.ts, notifications.service.ts
 * Existing tests: deliveries.test.ts, payments.test.ts, phase2-bottleneck-fixes.test.ts
 * User instruction: "right now keeping the both but for initial launch we use supabse and fix all
 * bottelneck issues and use these appproches. unit testing, integration testing, tdd(test driven
 * development), after completing the feature then break that feature and tell me what is break in points."
 */
import { getSupabaseClient } from '@/template';

jest.mock('@/template', () => ({ getSupabaseClient: jest.fn() }));
jest.mock('@/lib/server-rate-limit', () => ({ enforceRateLimit: jest.fn().mockResolvedValue({ allowed: true }) }));
jest.mock('@/lib/validation', () => ({
  validateUUID: (id: string) => {
    // Accept standard UUID format, reject obvious injection attempts
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

function createQueryChain(data: any = null, error: any = null) {
  const terminal = { data, error, count: Array.isArray(data) ? data.length : undefined };
  const chain: Record<string, jest.Mock> = {};
  const methods = ['select', 'eq', 'neq', 'gt', 'gte', 'lte', 'lt', 'in', 'or', 'ilike', 'order', 'range', 'limit', 'single', 'maybeSingle', 'not', 'filter', 'is', 'update', 'head'];
  for (const m of methods) chain[m] = jest.fn().mockReturnValue(chain);
  (chain as any).then = (resolve: Function) => resolve(terminal);
  return chain;
}

// ── BN-12: fetchDelivery — no schema-drift retry ──────────────────────────────

describe('BN-12: fetchDelivery — no schema-drift retry on column error', () => {
  it('returns error instead of retrying when column error occurs', async () => {
    const chain = createQueryChain(null, { message: 'column "pickup_otp" does not exist' });
    const mockFrom = jest.fn().mockReturnValue(chain);
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const { fetchDelivery } = require('@/services/deliveries.service');
    // Use a valid UUID so it passes the new UUID validation gate (BN-16)
    const result = await fetchDelivery('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', true);

    expect(result.error).toBeTruthy();
    // .from('deliveries') should be called exactly once (no retry)
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});

// ── BN-13: fetchPaymentByRequestOrId — consolidated queries ───────────────────

describe('BN-13: fetchPaymentByRequestOrId — reduced query count', () => {
  it('uses .or() to check request_id and id in a single query', async () => {
    const validId = '123e4567-e89b-12d3-a456-426614174000';
    const chain = createQueryChain({ id: 'pay-1', request_id: validId, sender_id: 's1', traveller_id: 't1', amount: 100, status: 'locked', locked_at: null, released_at: null, razorpay_order_id: null, razorpay_payment_id: null, created_at: '2026-01-01' });
    const mockFrom = jest.fn().mockReturnValue(chain);
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const { fetchPaymentByRequestOrId } = require('@/services/payments.service');
    await fetchPaymentByRequestOrId(validId);

    // Should call .or() to combine request_id and id lookup in one query
    expect(chain.or).toHaveBeenCalled();
    // Should be only 1 call to .from('payments') for the combined query (not 2 sequential)
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});

// ── BN-14: resolveRequestId — efficient lookups ───────────────────────────────

describe('BN-14: resolveRequestId — efficient lookups', () => {
  it('resolves identifier with at most 1 round-trip for the common case', async () => {
    const validReqId = '123e4567-e89b-12d3-a456-426614174001';
    const chain = createQueryChain({ id: validReqId });
    const mockFrom = jest.fn().mockReturnValue(chain);
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const { resolveRequestId } = require('@/services/payments.service');
    const result = await resolveRequestId(validReqId);

    expect(result).toBe(validReqId);
    // For the hit case (request found), should only query requests table
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});

// ── BN-15: fetchNotifications — pagination ────────────────────────────────────

describe('BN-15: fetchNotifications — pagination support', () => {
  it('accepts limit and offset parameters', async () => {
    const chain = createQueryChain([]);
    const mockFrom = jest.fn().mockReturnValue(chain);
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const { fetchNotifications } = require('@/services/notifications.service');
    await fetchNotifications('user-1', { limit: 20, offset: 10 });

    expect(chain.range).toHaveBeenCalledWith(10, 29);
  });

  it('uses defaults when no options provided', async () => {
    const chain = createQueryChain([]);
    const mockFrom = jest.fn().mockReturnValue(chain);
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const { fetchNotifications } = require('@/services/notifications.service');
    await fetchNotifications('user-1');

    // Default: limit=50, offset=0 → range(0, 49)
    expect(chain.range).toHaveBeenCalledWith(0, 49);
  });
});

// ── BN-16: deliveries .or() UUID validation ───────────────────────────────────

describe('BN-16: fetchDelivery — UUID validation prevents injection', () => {
  it('rejects non-UUID identifiers before querying', async () => {
    const mockFrom = jest.fn().mockReturnValue(createQueryChain());
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const { fetchDelivery } = require('@/services/deliveries.service');
    const result = await fetchDelivery("'; DROP TABLE deliveries; --", true);

    expect(result.error).toBeTruthy();
    // Should NOT have called .from() at all
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

// ── BN-17: fetchOrCreateDelivery — error surfacing ────────────────────────────

describe('BN-17: fetchOrCreateDelivery — surfaces error alongside fallback', () => {
  it('returns error string when all paths fail, not just a silent shell', async () => {
    // fetchDelivery returns no data, createDelivery fails, retry also returns no data
    const chain = createQueryChain(null, null); // no data, no error = not found
    const mockFrom = jest.fn().mockReturnValue(chain);
    const mockRpc = jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'RPC failed' } }),
    });
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom, rpc: mockRpc });

    const { fetchOrCreateDelivery } = require('@/services/deliveries.service');
    const result = await fetchOrCreateDelivery('11111111-2222-3333-4444-555555555555', 'user-1', true);

    // Should still return fallback data for UI resilience
    expect(result.data).toBeTruthy();
    // BUT should also surface the error so callers know it's degraded
    expect(result.error).toBeTruthy();
  });
});
