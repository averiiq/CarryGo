import {
  COIN_TO_RUPEE_CONVERSION_RATE,
  coinsToRupees,
  rupeesToCoins,
  redeemSenderCoinsForCredit,
  getUserCoinSummary,
  getCoinTransactions,
} from '../../services/rewards.service';

// Mock Supabase client
const mockRpc = jest.fn();
const mockFrom = jest.fn();
const mockGetSession = jest.fn();

jest.mock('@/template', () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: mockGetSession,
    },
    rpc: mockRpc,
    from: mockFrom,
  }),
}));

describe('Coins and Rewards System Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'test-user-uuid-123' },
        },
      },
    });
  });

  describe('1. Fixed Conversion Rules (10 Coins = ₹1)', () => {
    it('enforces exact 10 coins per rupee constant', () => {
      expect(COIN_TO_RUPEE_CONVERSION_RATE).toBe(10);
    });

    it('correctly converts coins to rupees at 10 coins = ₹1', () => {
      expect(coinsToRupees(10)).toBe(1.0);
      expect(coinsToRupees(50)).toBe(5.0);
      expect(coinsToRupees(100)).toBe(10.0);
      expect(coinsToRupees(1000)).toBe(100.0);
      expect(coinsToRupees(25)).toBe(2.5);
      expect(coinsToRupees(0)).toBe(0);
      expect(coinsToRupees(-50)).toBe(0);
    });

    it('correctly converts rupees to required coins', () => {
      expect(rupeesToCoins(1)).toBe(10);
      expect(rupeesToCoins(10)).toBe(100);
      expect(rupeesToCoins(50)).toBe(500);
      expect(rupeesToCoins(0)).toBe(0);
      expect(rupeesToCoins(-10)).toBe(0);
    });
  });

  describe('2. Sender Parcel Credit Redemption Validation', () => {
    it('rejects redemptions below the 10-coin minimum', async () => {
      const res = await redeemSenderCoinsForCredit(5);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Minimum redemption is 10 coins');
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('rejects redemptions that are not integer multiples of 10', async () => {
      const res = await redeemSenderCoinsForCredit(15);
      expect(res.success).toBe(false);
      expect(res.error).toContain('multiples of 10');
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('successfully calls RPC for valid multiples of 10', async () => {
      mockRpc.mockResolvedValueOnce({
        data: {
          success: true,
          coins_redeemed: 100,
          rupee_credit: 10.0,
          new_balance: 150,
        },
        error: null,
      });

      const res = await redeemSenderCoinsForCredit(100, 'req-999');
      expect(res.success).toBe(true);
      expect(res.coinsRedeemed).toBe(100);
      expect(res.rupeeCredit).toBe(10.0);
      expect(res.newBalance).toBe(150);
      expect(mockRpc).toHaveBeenCalledWith('redeem_sender_coins_for_credit', {
        p_coins: 100,
        p_request_id: 'req-999',
      });
    });

    it('handles backend insufficient balance error gracefully', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Insufficient coin balance' },
      });

      const res = await redeemSenderCoinsForCredit(500);
      expect(res.success).toBe(false);
      expect(res.error).toBe('Insufficient coin balance');
    });

    it('handles unauthenticated state safely', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session: null } });
      const res = await redeemSenderCoinsForCredit(50);
      expect(res.success).toBe(false);
      expect(res.error).toBe('Authentication required');
    });
  });

  describe('3. User Coin Balance and Summary', () => {
    it('fetches summary from RPC get_user_coin_summary', async () => {
      mockRpc.mockResolvedValueOnce({
        data: {
          balance: 350,
          total_earned: 500,
          total_redeemed: 150,
          rupee_value: 35.0,
        },
        error: null,
      });

      const res = await getUserCoinSummary();
      expect(res.data.balance).toBe(350);
      expect(res.data.totalEarned).toBe(500);
      expect(res.data.totalRedeemed).toBe(150);
      expect(res.data.rupeeValue).toBe(35.0);
    });

    it('returns default zero balance when user has no session', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session: null } });
      const res = await getUserCoinSummary();
      expect(res.data.balance).toBe(0);
      expect(res.error).toBe('Authentication required');
    });
  });

  describe('4. Coin Transaction History Ledger', () => {
    it('fetches and maps ledger transactions for current user', async () => {
      const mockRows = [
        {
          id: 'tx-1',
          user_id: 'test-user-uuid-123',
          transaction_type: 'delivery_reward',
          amount: 50,
          balance_after: 50,
          reference_id: 'deliv-1',
          reference_type: 'delivery',
          description: 'Delivery reward for completed parcel handover #deliv-1',
          created_at: '2026-10-21T10:00:00Z',
        },
        {
          id: 'tx-2',
          user_id: 'test-user-uuid-123',
          transaction_type: 'parcel_credit_redemption',
          amount: -20,
          balance_after: 30,
          reference_id: 'req-1',
          reference_type: 'request',
          description: 'Redeemed 20 coins for ₹2.00 parcel sending credit',
          created_at: '2026-10-21T10:30:00Z',
        },
      ];

      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const orderMock = jest.fn().mockReturnThis();
      const limitMock = jest.fn().mockResolvedValueOnce({ data: mockRows, error: null });

      mockFrom.mockReturnValueOnce({
        select: selectMock,
      });
      selectMock.mockReturnValueOnce({
        eq: eqMock,
      });
      eqMock.mockReturnValueOnce({
        order: orderMock,
      });
      orderMock.mockReturnValueOnce({
        limit: limitMock,
      });

      const res = await getCoinTransactions(10);
      expect(res.data.length).toBe(2);
      expect(res.data[0].amount).toBe(50);
      expect(res.data[0].transactionType).toBe('delivery_reward');
      expect(res.data[1].amount).toBe(-20);
      expect(res.data[1].transactionType).toBe('parcel_credit_redemption');
    });
  });
});
