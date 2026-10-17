import {
  confirmDelivery,
  confirmPickupWithOtp,
  fetchDelivery,
  fetchOrCreateDelivery,
  getOrIssuePickupOtp,
  getOrIssueDeliveryOtp,
  issueDeliveryOtp,
  updateTripProgress,
} from '@/services/deliveries.service';
import { getSupabaseClient } from '@/template';
import { enforceRateLimit } from '@/lib/server-rate-limit';

jest.mock('@/template', () => ({
  getSupabaseClient: jest.fn(),
}));

jest.mock('@/lib/server-rate-limit', () => ({
  enforceRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
}));

jest.mock('@/services/notifications.service', () => ({
  notifyPickupConfirmed: jest.fn().mockResolvedValue({ success: true }),
  notifyDeliveryCompleted: jest.fn().mockResolvedValue({ success: true }),
  notifyDeliveryOtpReady: jest.fn().mockResolvedValue({ success: true }),
  notifyTripMilestone: jest.fn().mockResolvedValue({ success: true }),
  notifyPayoutReleased: jest.fn().mockResolvedValue({ success: true }),
}));

describe('Deliveries Service - Strict Security & Anti-Backdoor Verification', () => {
  const mockRpc = jest.fn();
  const mockFrom = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue({
      rpc: mockRpc,
      from: mockFrom,
    });
  });

  describe('confirmDelivery (Final 6-digit OTP)', () => {
    const deliveryId = '11111111-2222-3333-4444-555555555555';
    const userId = 'user-traveller-123';

    it('rejects OTP codes with invalid length or non-numeric characters before hitting RPC', async () => {
      const res1 = await confirmDelivery(deliveryId, '12345', userId);
      expect(res1.success).toBe(false);
      expect(res1.error).toContain('6-digit delivery code');
      expect(mockRpc).not.toHaveBeenCalled();

      const res2 = await confirmDelivery(deliveryId, '1234567', userId);
      expect(res2.success).toBe(false);
      expect(mockRpc).not.toHaveBeenCalled();

      const res3 = await confirmDelivery(deliveryId, '12A456', userId);
      expect(res3.success).toBe(false);
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('STRICTLY rejects fake OTPs and returns RPC error without any wildcard or fallback updates', async () => {
      // Mock RPC throwing invalid code error (as Postgres does for fake OTPs)
      mockRpc.mockReturnValue({
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Invalid delivery code. Please check with the recipient.' },
        }),
      });

      const fakeOtps = ['123456', '000000', '712871', '933536', '999999'];

      for (const fakeOtp of fakeOtps) {
        const result = await confirmDelivery(deliveryId, fakeOtp, userId);

        // Must fail with exact error message from DB
        expect(result.success).toBe(false);
        expect(result.data).toBeNull();
        expect(result.error).toBe('Invalid delivery code. Please check with the recipient.');

        // MUST NOT attempt any direct fallback table updates on deliveries
        expect(mockFrom).not.toHaveBeenCalled();
      }
    });

    it('succeeds and maps delivery when genuine OTP is verified by complete_delivery_command', async () => {
      mockRpc.mockReturnValue({
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            id: deliveryId,
            request_id: 'req-abc',
            pickup_confirmed: true,
            pickup_confirmed_at: '2026-10-14T10:00:00Z',
            delivery_confirmed: true,
            delivery_confirmed_at: '2026-10-14T12:00:00Z',
            status: 'delivered',
            created_at: '2026-10-14T09:00:00Z',
          },
          error: null,
        }),
      });

      const result = await confirmDelivery(deliveryId, '839201', userId);

      expect(mockRpc).toHaveBeenCalledWith('complete_delivery_command', {
        p_delivery_id: deliveryId,
        p_otp: '839201',
      });
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('delivered');
      expect(result.data?.deliveryConfirmed).toBe(true);
      expect(result.error).toBeNull();
    });

    it('handles rate limit rejection gracefully', async () => {
      (enforceRateLimit as jest.Mock).mockResolvedValueOnce({
        allowed: false,
        error: 'Too many attempts. Please wait 15 minutes.',
      });

      const result = await confirmDelivery(deliveryId, '123456', userId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Too many attempts');
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  describe('confirmPickupWithOtp (4-digit pickup code)', () => {
    const deliveryId = '11111111-2222-3333-4444-555555555555';

    it('rejects pickup codes with non-4-digit length', async () => {
      const res1 = await confirmPickupWithOtp(deliveryId, '123');
      expect(res1.data).toBeNull();
      expect(res1.error).toContain('4-digit pickup code');

      const res2 = await confirmPickupWithOtp(deliveryId, '12345');
      expect(res2.data).toBeNull();

      const res3 = await confirmPickupWithOtp(deliveryId, 'abcd');
      expect(res3.data).toBeNull();
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('STRICTLY rejects fake pickup OTPs without virtual transitions or fallback table updates', async () => {
      mockRpc.mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Invalid pickup code. Ask sender for the 4-digit pickup code displayed on their app.' },
        }),
      });

      const fakeCodes = ['0000', '1234', '9999'];

      for (const fakeCode of fakeCodes) {
        const result = await confirmPickupWithOtp(deliveryId, fakeCode);

        expect(result.data).toBeNull();
        expect(result.error).toBe('Invalid pickup code. Ask sender for the 4-digit pickup code displayed on their app.');

        // MUST NOT perform any fallback direct table updates or return virtual in_transit
        expect(mockFrom).not.toHaveBeenCalled();
      }
    });

    it('succeeds when genuine pickup OTP is verified by confirm_delivery_pickup_with_otp', async () => {
      mockRpc.mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: deliveryId,
            request_id: 'req-abc',
            pickup_confirmed: true,
            pickup_confirmed_at: '2026-10-14T10:00:00Z',
            delivery_confirmed: false,
            status: 'in_transit',
            trip_status: 'Picked Up - On Journey',
            created_at: '2026-10-14T09:00:00Z',
          },
          error: null,
        }),
      });

      const result = await confirmPickupWithOtp(deliveryId, '4821');

      expect(mockRpc).toHaveBeenCalledWith('confirm_delivery_pickup_with_otp', {
        p_delivery_id: deliveryId,
        p_otp: '4821',
      });
      expect(result.error).toBeNull();
      expect(result.data?.pickupConfirmed).toBe(true);
      expect(result.data?.status).toBe('in_transit');
    });
  });

  describe('fetchDelivery (Privacy & Passkey Protection)', () => {
    const requestId = 'req-xyz-987';

    it('strips delivery_otp and pickup_otp when fetched by traveller (isSender = false)', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: 'deliv-1',
                request_id: requestId,
                pickup_confirmed: false,
                delivery_confirmed: false,
                status: 'awaiting_pickup',
                pickup_otp: '4821',
                delivery_otp: '839201',
                created_at: '2026-10-14T09:00:00Z',
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await fetchDelivery(requestId, false);

      expect(result.error).toBeNull();
      expect(result.data?.id).toBe('deliv-1');
      // Secret passkeys must NEVER be exposed to traveller
      expect(result.data?.deliveryOtp).toBeUndefined();
      expect(result.data?.pickupOtp).toBeUndefined();
    });

    it('preserves passkeys when fetched by sender (isSender = true)', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: 'deliv-1',
                request_id: requestId,
                pickup_confirmed: false,
                delivery_confirmed: false,
                status: 'awaiting_pickup',
                pickup_otp: '4821',
                delivery_otp: '839201',
                created_at: '2026-10-14T09:00:00Z',
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await fetchDelivery(requestId, true);

      expect(result.error).toBeNull();
      expect(result.data?.pickupOtp).toBe('4821');
      expect(result.data?.deliveryOtp).toBe('839201');
    });
  });

  describe('getOrIssuePickupOtp & getOrIssueDeliveryOtp', () => {
    const deliveryId = 'deliv-123';

    it('calls get_or_create_pickup_otp RPC and returns generated code', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null }),
          }),
        }),
      });

      mockRpc.mockResolvedValueOnce({ data: '5912', error: null });

      const res = await getOrIssuePickupOtp(deliveryId, true);

      expect(mockRpc).toHaveBeenCalledWith('get_or_create_pickup_otp', {
        p_delivery_id: deliveryId,
      });
      expect(res.data).toBe('5912');
      expect(res.error).toBeNull();
    });

    it('returns error when sender is unauthorized to issue OTP', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Only the parcel sender can view the delivery code' },
      });

      const res = await getOrIssueDeliveryOtp(deliveryId);

      expect(res.data).toBeNull();
      expect(res.error).toBe('Only the parcel sender can view the delivery code');
    });
  });

  describe('updateTripProgress', () => {
    const deliveryId = 'deliv-123';

    it('calls update_delivery_trip_progress RPC with valid status', async () => {
      mockRpc.mockResolvedValueOnce({ error: null });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null }),
          }),
        }),
      });

      const res = await updateTripProgress(deliveryId, 'On Highway', 'Traffic clear', '45 mins');

      expect(mockRpc).toHaveBeenCalledWith('update_delivery_trip_progress', {
        p_delivery_id: deliveryId,
        p_trip_status: 'On Highway',
        p_trip_note: 'Traffic clear',
        p_eta_text: '45 mins',
      });
      expect(res.success).toBe(true);
      expect(res.error).toBeNull();
    });
  });
});
