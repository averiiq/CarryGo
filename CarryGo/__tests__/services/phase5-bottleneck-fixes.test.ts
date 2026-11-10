/**
 * Phase 5 Bottleneck Fixes: BN-24 through BN-30
 *
 * BN-24: notifications.service unregisterPushToken empty catch {} must log
 * BN-25: deleteConversation direct delete fallback bypasses RLS — remove it
 * BN-26: fetchNotifications select('*') → explicit columns
 * BN-27: fetchPaymentById/ByRequestOrId select('*') → explicit columns
 * BN-28: fetchTripById select('*') → explicit columns
 * BN-29: sendMessage rate limit fail-open catch should log warning
 * BN-30: payments extractFunctionErrorMessage line 49 empty catch {} must log
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
jest.mock('@/constants/featureFlags', () => ({
  FeatureFlags: { payments: true },
  disabledFeatureMessage: { payments: 'Payments disabled' },
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
jest.mock('@/services/notifications.service', () => ({
  ...jest.requireActual('@/services/notifications.service'),
  notifyChatMessage: jest.fn().mockResolvedValue({ success: true }),
}));
jest.mock('@/lib/sanitize', () => ({
  sanitizeLikeInput: (v: string) => v.slice(0, 200).replace(/[%_\\]/g, '\\$&'),
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

// ── BN-25: deleteConversation — no direct delete fallback ───────────────────

describe('BN-25: deleteConversation — no direct delete fallback bypassing RLS', () => {
  it('does NOT attempt direct .delete() when RPC fails', async () => {
    const mockRpc = jest.fn().mockResolvedValue({
      error: { message: 'RPC failed' },
    });
    const fromMock = jest.fn().mockReturnValue(createQueryChain());
    (getSupabaseClient as jest.Mock).mockReturnValue({ rpc: mockRpc, from: fromMock });

    const { deleteConversation } = require('@/services/conversations.service');
    const result = await deleteConversation('conv-1');

    expect(result.error).toBeTruthy();
    // Must NOT fall back to direct .from('conversations').delete()
    expect(fromMock).not.toHaveBeenCalledWith('conversations');
  });
});

// ── BN-26: fetchNotifications — explicit columns ────────────────────────────

describe('BN-26: fetchNotifications — explicit select columns instead of *', () => {
  it('uses explicit column list in select()', async () => {
    const chain = createQueryChain([]);
    const mockFrom = jest.fn().mockReturnValue(chain);
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const { fetchNotifications } = require('@/services/notifications.service');
    await fetchNotifications('user-1');

    expect(chain.select).toHaveBeenCalled();
    const selectArg = chain.select.mock.calls[0][0] as string;
    // Should NOT be '*'
    expect(selectArg).not.toBe('*');
    // Should contain essential columns
    expect(selectArg).toContain('id');
    expect(selectArg).toContain('user_id');
    expect(selectArg).toContain('title');
  });
});

// ── BN-27: fetchPaymentById — explicit columns ──────────────────────────────

describe('BN-27: fetchPaymentById — explicit select columns instead of *', () => {
  it('uses explicit column list in select()', async () => {
    const chain = createQueryChain(null, null);
    const mockFrom = jest.fn().mockReturnValue(chain);
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const { fetchPaymentById } = require('@/services/payments.service');
    await fetchPaymentById('pay-1');

    expect(chain.select).toHaveBeenCalled();
    const selectArg = chain.select.mock.calls[0][0] as string;
    expect(selectArg).not.toBe('*');
    expect(selectArg).toContain('id');
    expect(selectArg).toContain('request_id');
    expect(selectArg).toContain('amount');
  });
});

// ── BN-28: fetchTripById — explicit columns ─────────────────────────────────

describe('BN-28: fetchTripById — explicit select columns instead of *', () => {
  it('uses explicit column list in select()', async () => {
    const chain = createQueryChain({ id: 't1', user_id: 'u1', from_city: 'A', to_city: 'B', date: '2026-12-01', time: '10:00', vehicle_type: 'car', available_capacity: 10, price_per_kg: 50, status: 'active', created_at: '2026-01-01' });
    const mockFrom = jest.fn().mockReturnValue(chain);
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const { fetchTripById } = require('@/services/trips.service');
    await fetchTripById('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');

    expect(chain.select).toHaveBeenCalled();
    const selectArg = chain.select.mock.calls[0][0] as string;
    expect(selectArg).not.toBe('*');
    expect(selectArg).toContain('id');
    expect(selectArg).toContain('from_city');
  });
});

// ── BN-29: sendMessage rate limit catch — logs warning ──────────────────────

describe('BN-29: sendMessage rate limit catch logs warning instead of silent fail-open', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('logs warning when rate limit check throws', async () => {
    const { enforceRateLimit } = require('@/lib/server-rate-limit');
    (enforceRateLimit as jest.Mock).mockRejectedValueOnce(new Error('rate limit RPC error'));

    const mockRpc = jest.fn().mockResolvedValue({ data: [{ id: 'msg-1', conversation_id: 'c1', sender_id: 's1', sender_name: 'Test', text: 'hi', created_at: '2026-01-01', read: false }], error: null });
    const mockFrom = jest.fn().mockReturnValue(createQueryChain());
    (getSupabaseClient as jest.Mock).mockReturnValue({ rpc: mockRpc, from: mockFrom });

    const { sendMessage } = require('@/services/conversations.service');
    await sendMessage({
      conversationId: 'c1',
      senderId: 's1',
      senderName: 'Test',
      text: 'Hello',
    });

    const warnCalls = consoleSpy.mock.calls.map((c: any[]) => c.join(' '));
    const hasRateWarn = warnCalls.some((msg: string) =>
      msg.includes('rate') || msg.includes('limit') || msg.includes('sendMessage')
    );
    expect(hasRateWarn).toBe(true);
  });
});

// ── BN-30: extractFunctionErrorMessage empty catch {} — logs warning ────────

describe('BN-30: extractFunctionErrorMessage — empty catch logs warning', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('logs warning when error context parsing fails', async () => {
    const mockAuth = { getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: 'u1' } } } }) };
    const mockFunctions = {
      invoke: jest.fn().mockResolvedValue({
        data: null,
        error: {
          message: 'edge function error',
          context: {
            json: jest.fn().mockRejectedValue(new Error('JSON parse failed')),
            text: jest.fn().mockRejectedValue(new Error('text read failed')),
          },
        },
      }),
    };
    (getSupabaseClient as jest.Mock).mockReturnValue({ auth: mockAuth, functions: mockFunctions });

    const { createRazorpayOrder } = require('@/services/payments.service');
    await createRazorpayOrder('req-1');

    const warnCalls = consoleSpy.mock.calls.map((c: any[]) => c.join(' '));
    const hasContextWarn = warnCalls.some((msg: string) =>
      msg.includes('context') || msg.includes('extract') || msg.includes('error')
    );
    expect(hasContextWarn).toBe(true);
  });
});
