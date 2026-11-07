import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  createRazorpayPaymentLink,
  checkRazorpayPaymentLinkStatus,
  fetchPaymentById,
  fetchPaymentByRequestOrId,
  releasePayment,
  refundPayment,
  confirmMockBookingPayment,
} from '@/services/payments.service';
import { getSupabaseClient } from '@/template';
import { enforceRateLimit } from '@/lib/server-rate-limit';

jest.mock('@/template', () => ({
  getSupabaseClient: jest.fn(),
}));

jest.mock('@/lib/server-rate-limit', () => ({
  enforceRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
}));

describe('Payments Service - Gateway Verification & Anti-Bypass Audit Tests', () => {
  const mockRpc = jest.fn();
  const mockFrom = jest.fn();
  const mockInvoke = jest.fn();
  const mockGetSession = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue({
      rpc: mockRpc,
      from: mockFrom,
      functions: { invoke: mockInvoke },
      auth: { getSession: mockGetSession },
    });
  });

  describe('checkRazorpayPaymentLinkStatus', () => {
    it('returns paid: false when gateway status is unpaid or created', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: {
          paid: false,
          status: 'created',
          paymentId: undefined,
        },
        error: null,
      });

      const res = await checkRazorpayPaymentLinkStatus('plink_123456');
      expect(res.paid).toBe(false);
      expect(res.status).toBe('created');
      expect(res.paymentId).toBeUndefined();
      expect(mockInvoke).toHaveBeenCalledWith('verify-razorpay-payment', {
        body: {
          checkOnly: true,
          razorpayOrderId: 'plink_123456',
        },
      });
    });

    it('returns paid: false when invoke fails or user closes browser without paying', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: 'Unable to check payment link status' },
      });

      const res = await checkRazorpayPaymentLinkStatus('plink_cancelled');
      expect(res.paid).toBe(false);
      expect(res.status).toBe('error');
    });

    it('returns paid: true and real payment ID only when gateway has confirmed payment capture', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: {
          paid: true,
          status: 'paid',
          paymentId: 'pay_realCaptured123',
        },
        error: null,
      });

      const res = await checkRazorpayPaymentLinkStatus('plink_paid123');
      expect(res.paid).toBe(true);
      expect(res.status).toBe('paid');
      expect(res.paymentId).toBe('pay_realCaptured123');
    });
  });

  describe('verifyRazorpayPayment', () => {
    it('returns error when edge function rejects invalid payment or fake ID', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: 'Payment does not match the original order or was not captured' },
      });

      const res = await verifyRazorpayPayment({
        razorpayOrderId: 'order_123',
        razorpayPaymentId: 'pay_fake999',
        razorpaySignature: 'invalid_sig',
        requestId: 'req_123',
      });

      expect(res.data).toBeNull();
      expect(res.error).toBe('Payment does not match the original order or was not captured');
    });

    it('returns payment record when gateway confirms genuine transaction', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: {
          paymentId: 'pay_db_record_uuid',
          status: 'locked',
          amount: 500,
        },
        error: null,
      });

      const res = await verifyRazorpayPayment({
        razorpayOrderId: 'order_genuine',
        razorpayPaymentId: 'pay_genuine',
        razorpaySignature: 'valid_hmac_sig',
        requestId: 'req_123',
      });

      expect(res.error).toBeNull();
      expect(res.data?.paymentId).toBe('pay_db_record_uuid');
      expect(res.data?.status).toBe('locked');
      expect(res.data?.amount).toBe(500);
    });
  });

  describe('createRazorpayPaymentLink', () => {
    it('requires authentication session before generating link', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session: null } });

      const res = await createRazorpayPaymentLink({
        requestId: 'req_123',
        amount: 250,
      });

      expect(res.data).toBeNull();
      expect(res.error).toBe('Authentication required');
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('successfully calls edge function and returns shortUrl and paymentLinkId', async () => {
      mockGetSession.mockResolvedValueOnce({
        data: { session: { user: { id: 'sender_123' } } },
      });
      mockInvoke.mockResolvedValueOnce({
        data: {
          paymentLinkId: 'plink_abc123',
          shortUrl: 'https://rzp.io/rzp/abc123',
        },
        error: null,
      });

      const res = await createRazorpayPaymentLink({
        requestId: 'req_123',
        amount: 250,
        customerName: 'Jatin',
      });

      expect(res.error).toBeNull();
      expect(res.data?.paymentLinkId).toBe('plink_abc123');
      expect(res.data?.shortUrl).toBe('https://rzp.io/rzp/abc123');
    });
  });

  describe('releasePayment & refundPayment Atomic Security', () => {
    it('strictly calls release_payment_atomic RPC and checks rate limit', async () => {
      mockRpc.mockResolvedValueOnce({ data: true, error: null });

      const res = await releasePayment('pay_uuid_1', 'user_traveller');
      expect(res.error).toBeNull();
      expect(enforceRateLimit).toHaveBeenCalledWith('user_traveller', 'release_payment');
      expect(mockRpc).toHaveBeenCalledWith('release_payment_atomic', {
        p_payment_id: 'pay_uuid_1',
        p_actor_id: 'user_traveller',
      });
    });

    it('strictly calls refund_payment_atomic RPC and checks rate limit', async () => {
      mockRpc.mockResolvedValueOnce({ data: true, error: null });

      const res = await refundPayment('pay_uuid_1', 'user_sender');
      expect(res.error).toBeNull();
      expect(enforceRateLimit).toHaveBeenCalledWith('user_sender', 'refund_payment');
      expect(mockRpc).toHaveBeenCalledWith('refund_payment_atomic', {
        p_payment_id: 'pay_uuid_1',
        p_actor_id: 'user_sender',
      });
    });
  });

  describe('confirmMockBookingPayment', () => {
    it('creates a locked payment record with demo gateway IDs and updates request state', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session: { user: { id: 'sender_1' } } } });
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: {
          id: 'req_test_1',
          sender_id: 'sender_1',
          traveller_id: 'trav_1',
          price: 350,
          status: 'pending',
        },
        error: null,
      });

      mockFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        maybeSingle: mockMaybeSingle,
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const res = await confirmMockBookingPayment({
        requestId: 'req_test_1',
        amount: 350,
        senderId: 'sender_1',
        travellerId: 'trav_1',
      });

      expect(res.error).toBeNull();
      expect(res.data).toBeDefined();
      expect(res.data?.status).toBe('locked');
      expect(res.data?.amount).toBe(350);
      expect(res.data?.requestId).toBe('req_test_1');
      expect(res.data?.razorpayPaymentId).toContain('pay_demo_');
    });
  });
});
