import {
  confirmPickupWithOtp,
  confirmDelivery,
  getOrIssuePickupOtp,
} from '@/services/deliveries.service';
import {
  confirmMockBookingPayment,
  fetchPaymentByRequest,
} from '@/services/payments.service';
import { getSupabaseClient } from '@/template';

jest.mock('@/template', () => ({
  getSupabaseClient: jest.fn(),
  useAlert: () => ({ showAlert: jest.fn() }),
}));

jest.mock('@/services/notifications.service', () => ({
  notifyPickupConfirmed: jest.fn().mockResolvedValue(undefined),
  notifyDeliveryCompleted: jest.fn().mockResolvedValue(undefined),
  notifyDeliveryOtpReady: jest.fn().mockResolvedValue(undefined),
  notifyTripMilestone: jest.fn().mockResolvedValue(undefined),
  notifyPayoutReleased: jest.fn().mockResolvedValue(undefined),
  notifyPaymentLocked: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/services/rewards.service', () => ({
  awardDeliveryCoins: jest.fn().mockResolvedValue(undefined),
  getAvailableParcelCredit: jest.fn().mockResolvedValue(0),
}));

describe('Delivery OTP Security & Anti-Bypass Audits', () => {
  const mockRpc = jest.fn();
  const mockFrom = jest.fn();
  const mockGetSession = jest.fn().mockResolvedValue({ data: { session: { user: { id: 'user-sender-1' } } } });

  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue({
      rpc: mockRpc,
      from: mockFrom,
      auth: { getSession: mockGetSession },
    });
  });

  describe('confirmPickupWithOtp', () => {
    it('rejects codes that are not exactly 4 numeric digits before RPC', async () => {
      const res1 = await confirmPickupWithOtp('deliv-1', '12');
      expect(res1.error).toContain('4-digit');
      expect(mockRpc).not.toHaveBeenCalled();

      const res2 = await confirmPickupWithOtp('deliv-1', 'abcd');
      expect(res2.error).toContain('4-digit');
      expect(mockRpc).not.toHaveBeenCalled();

      const res3 = await confirmPickupWithOtp('deliv-1', '12345');
      expect(res3.error).toContain('4-digit');
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('strictly calls confirm_delivery_pickup_with_otp and propagates database rejection on invalid code', async () => {
      mockRpc.mockReturnValueOnce({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Invalid pickup code. Ask sender for the 4-digit pickup code displayed on their app.' },
        }),
      });

      const res = await confirmPickupWithOtp('deliv-uuid-1', '9999');
      expect(mockRpc).toHaveBeenCalledWith('confirm_delivery_pickup_with_otp', {
        p_delivery_id: 'deliv-uuid-1',
        p_otp: '9999',
      });
      expect(res.data).toBeNull();
      expect(res.error).toContain('Invalid pickup code');
    });

    it('successfully confirms pickup when database verifies exact matching OTP', async () => {
      const mockDeliveryRow = {
        id: 'deliv-uuid-1',
        request_id: 'req-uuid-1',
        pickup_confirmed: true,
        pickup_confirmed_at: new Date().toISOString(),
        delivery_confirmed: false,
        delivery_confirmed_at: null,
        status: 'in_transit',
        created_at: new Date().toISOString(),
      };

      mockRpc.mockReturnValueOnce({
        single: jest.fn().mockResolvedValue({
          data: mockDeliveryRow,
          error: null,
        }),
      });

      const res = await confirmPickupWithOtp('deliv-uuid-1', '4821');
      expect(res.error).toBeNull();
      expect(res.data?.pickupConfirmed).toBe(true);
      expect(res.data?.status).toBe('in_transit');
    });
  });

  describe('confirmDelivery', () => {
    it('rejects delivery codes that are not exactly 6 digits', async () => {
      const res = await confirmDelivery('deliv-uuid-1', '1234');
      expect(res.success).toBe(false);
      expect(res.error).toContain('6-digit');
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('calls complete_delivery_command and rejects fake or brute-force codes', async () => {
      mockRpc.mockReturnValueOnce({
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Invalid delivery code. Please check with the recipient.' },
        }),
      });

      const res = await confirmDelivery('deliv-uuid-1', '123456');
      expect(mockRpc).toHaveBeenCalledWith('complete_delivery_command', {
        p_delivery_id: 'deliv-uuid-1',
        p_otp: '123456',
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Invalid delivery code');
    });
  });

  describe('getOrIssuePickupOtp', () => {
    it('strictly delegates to RPC get_or_create_pickup_otp', async () => {
      mockRpc.mockResolvedValueOnce({
        data: '5928',
        error: null,
      });

      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const res = await getOrIssuePickupOtp(validUuid);
      expect(mockRpc).toHaveBeenCalledWith('get_or_create_pickup_otp', {
        p_delivery_id: validUuid,
      });
      expect(res.data).toBe('5928');
    });
  });

  describe('confirmMockBookingPayment & fetchPaymentByRequest', () => {
    it('locks booking payment in Supabase and returns locked payment record', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            id: 'req-uuid-1',
            sender_id: 'sender-1',
            traveller_id: 'traveller-1',
            price: 500,
            status: 'pending',
          },
          error: null,
        }),
      };
      mockFrom.mockReturnValue(mockChain);

      const res = await confirmMockBookingPayment({
        requestId: 'req-uuid-1',
        amount: 500,
        senderId: 'sender-1',
        travellerId: 'traveller-1',
      });

      expect(res.error).toBeNull();
      expect(res.data?.status).toBe('locked');
      expect(res.data?.amount).toBe(500);
      expect(res.data?.requestId).toBe('req-uuid-1');
    });

    it('fetchPaymentByRequest retrieves locked payment record', async () => {
      const mockPayRow = {
        id: 'pay-uuid-1',
        request_id: 'req-uuid-1',
        sender_id: 'sender-1',
        traveller_id: 'traveller-1',
        amount: 500,
        status: 'locked',
        locked_at: new Date().toISOString(),
        released_at: null,
        razorpay_order_id: 'order_test_123',
        razorpay_payment_id: 'pay_test_123',
        created_at: new Date().toISOString(),
      };

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: mockPayRow,
          error: null,
        }),
      };
      mockFrom.mockReturnValue(mockChain);

      const res = await fetchPaymentByRequest('req-uuid-1');
      expect(res.error).toBeNull();
      expect(res.data?.status).toBe('locked');
      expect(res.data?.amount).toBe(500);
    });
  });
});
