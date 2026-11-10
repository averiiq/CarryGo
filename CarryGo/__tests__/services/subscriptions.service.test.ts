import { createSubscription, isUserSubscribedToRoute } from '@/services/subscriptions.service';
import { getSupabaseClient } from '@/template';

jest.mock('@/template', () => ({
  getSupabaseClient: jest.fn(),
}));

jest.mock('@/lib/server-rate-limit', () => ({
  enforceRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
}));

describe('subscriptions.service', () => {
  const mockFrom = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: mockFrom,
    });
  });

  describe('createSubscription', () => {
    it('rejects empty cities', async () => {
      const res = await createSubscription('user-1', '', 'Delhi');
      expect(res.error).toBe('Origin and destination cities are required');
    });

    it('rejects identical origin and destination cities', async () => {
      const res = await createSubscription('user-1', 'Delhi', 'delhi');
      expect(res.error).toBe('Origin and destination cities cannot be identical');
    });

    it('returns existing active subscription without re-inserting', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockIlike = jest.fn().mockReturnThis();
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: {
          id: 'sub-1',
          user_id: 'user-1',
          from_city: 'Delhi',
          to_city: 'Jaipur',
          active: true,
          created_at: '2026-11-09T00:00:00Z',
        },
        error: null,
      });

      mockFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        ilike: mockIlike,
        maybeSingle: mockMaybeSingle,
      });

      const res = await createSubscription('user-1', 'Delhi', 'Jaipur');
      expect(res.error).toBeNull();
      expect(res.data?.id).toBe('sub-1');
      expect(res.data?.active).toBe(true);
    });

    it('reactivates an inactive subscription', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockIlike = jest.fn().mockReturnThis();
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: {
          id: 'sub-2',
          user_id: 'user-1',
          from_city: 'Delhi',
          to_city: 'Jaipur',
          active: false,
          created_at: '2026-11-09T00:00:00Z',
        },
        error: null,
      });

      const mockUpdate = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: {
          id: 'sub-2',
          user_id: 'user-1',
          from_city: 'Delhi',
          to_city: 'Jaipur',
          active: true,
          created_at: '2026-11-09T00:00:00Z',
        },
        error: null,
      });

      mockFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        ilike: mockIlike,
        maybeSingle: mockMaybeSingle,
        update: mockUpdate,
        single: mockSingle,
      });

      const res = await createSubscription('user-1', 'Delhi', 'Jaipur');
      expect(res.error).toBeNull();
      expect(res.data?.active).toBe(true);
    });

    it('inserts a new subscription when none exists', async () => {
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // find existing query
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            ilike: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        // insert query
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'sub-new',
              user_id: 'user-1',
              from_city: 'Mumbai',
              to_city: 'Pune',
              active: true,
              created_at: '2026-11-09T00:00:00Z',
            },
            error: null,
          }),
        };
      });

      const res = await createSubscription('user-1', 'Mumbai', 'Pune');
      expect(res.error).toBeNull();
      expect(res.data?.id).toBe('sub-new');
      expect(res.data?.fromCity).toBe('Mumbai');
      expect(res.data?.toCity).toBe('Pune');
    });
  });

  describe('isUserSubscribedToRoute', () => {
    it('returns false for empty parameters', async () => {
      expect(await isUserSubscribedToRoute(undefined, 'Delhi', 'Agra')).toBe(false);
      expect(await isUserSubscribedToRoute('user-1', '', 'Agra')).toBe(false);
    });

    it('returns true when an active subscription exists', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [{ id: 'sub-existing' }],
          error: null,
        }),
      });

      const res = await isUserSubscribedToRoute('user-1', 'Delhi', 'Agra');
      expect(res).toBe(true);
    });

    it('returns false when no active subscription exists', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      const res = await isUserSubscribedToRoute('user-1', 'Delhi', 'Agra');
      expect(res).toBe(false);
    });
  });
});

