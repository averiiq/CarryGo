import {
  isRequestIncoming,
  isRequestOutgoing,
  updateRequestStatus,
  cancelRequest,
} from '@/services/requests.service';
import { getSupabaseClient } from '@/template';
import { Request } from '@/types';

jest.mock('@/template', () => ({
  getSupabaseClient: jest.fn(),
}));

jest.mock('@/services/notifications.service', () => ({
  notifyNewRequest: jest.fn().mockResolvedValue({}),
  notifyNewCarryOffer: jest.fn().mockResolvedValue({}),
  notifyRequestAccepted: jest.fn().mockResolvedValue({}),
  notifyRequestDeclined: jest.fn().mockResolvedValue({}),
  notifyOfferAccepted: jest.fn().mockResolvedValue({}),
  notifyOfferDeclined: jest.fn().mockResolvedValue({}),
}));

jest.mock('@/lib/server-rate-limit', () => ({
  enforceRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
}));

describe('Request Ownership and Authorization Security', () => {
  const SENDER_ID = '11111111-1111-4111-a111-111111111111';
  const TRAVELLER_ID = '22222222-2222-4222-a222-222222222222';
  const THIRD_PARTY_ID = '33333333-3333-4333-a333-333333333333';
  const REQUEST_ID = '99999999-9999-4999-a999-999999999999';

  describe('isRequestIncoming and isRequestOutgoing', () => {
    it('correctly partitions a sender-created request', () => {
      const request: Request = {
        id: REQUEST_ID,
        parcelId: 'p-1',
        tripId: 't-1',
        senderId: SENDER_ID,
        senderName: 'Sender User',
        travellerId: TRAVELLER_ID,
        travellerName: 'Traveller User',
        createdBy: SENDER_ID,
        status: 'pending',
        price: 250,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Sender (creator) should see it in Outgoing, not Incoming
      expect(isRequestOutgoing(request, SENDER_ID)).toBe(true);
      expect(isRequestIncoming(request, SENDER_ID)).toBe(false);

      // Traveller (recipient) should see it in Incoming, not Outgoing
      expect(isRequestIncoming(request, TRAVELLER_ID)).toBe(true);
      expect(isRequestOutgoing(request, TRAVELLER_ID)).toBe(false);

      // Third party sees neither
      expect(isRequestIncoming(request, THIRD_PARTY_ID)).toBe(false);
      expect(isRequestOutgoing(request, THIRD_PARTY_ID)).toBe(false);
    });

    it('correctly partitions a traveller-created carry offer', () => {
      const carryOffer: Request = {
        id: REQUEST_ID,
        parcelId: 'p-1',
        tripId: 't-1',
        senderId: SENDER_ID,
        senderName: 'Sender User',
        travellerId: TRAVELLER_ID,
        travellerName: 'Traveller User',
        createdBy: TRAVELLER_ID,
        status: 'pending',
        price: 250,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Traveller (creator) should see it in Outgoing, not Incoming
      expect(isRequestOutgoing(carryOffer, TRAVELLER_ID)).toBe(true);
      expect(isRequestIncoming(carryOffer, TRAVELLER_ID)).toBe(false);

      // Sender (intended recipient) should see it in Incoming, not Outgoing
      expect(isRequestIncoming(carryOffer, SENDER_ID)).toBe(true);
      expect(isRequestOutgoing(carryOffer, SENDER_ID)).toBe(false);

      // Third party sees neither
      expect(isRequestIncoming(carryOffer, THIRD_PARTY_ID)).toBe(false);
      expect(isRequestOutgoing(carryOffer, THIRD_PARTY_ID)).toBe(false);
    });

    it('gracefully handles legacy requests without createdBy', () => {
      const legacyRequest: Request = {
        id: REQUEST_ID,
        parcelId: 'p-1',
        tripId: 't-1',
        senderId: SENDER_ID,
        senderName: 'Sender User',
        travellerId: TRAVELLER_ID,
        travellerName: 'Traveller User',
        status: 'pending',
        price: 250,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(isRequestOutgoing(legacyRequest, SENDER_ID)).toBe(true);
      expect(isRequestIncoming(legacyRequest, SENDER_ID)).toBe(false);
      expect(isRequestIncoming(legacyRequest, TRAVELLER_ID)).toBe(true);
      expect(isRequestOutgoing(legacyRequest, TRAVELLER_ID)).toBe(false);
    });
  });

  describe('updateRequestStatus Authorization Guards', () => {
    let mockSingle: jest.Mock;
    let mockEq: jest.Mock;
    let mockSelect: jest.Mock;
    let mockFrom: jest.Mock;
    let mockRpc: jest.Mock;

    beforeEach(() => {
      jest.clearAllMocks();

      mockSingle = jest.fn();
      mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockFrom = jest.fn().mockReturnValue({ select: mockSelect });
      mockRpc = jest.fn();

      (getSupabaseClient as jest.Mock).mockReturnValue({
        from: mockFrom,
        rpc: mockRpc,
      });
    });

    it('blocks requester from accepting their own request', async () => {
      // Mock existing request: created by sender
      mockSingle.mockResolvedValueOnce({
        data: {
          id: REQUEST_ID,
          parcel_id: 'p-1',
          trip_id: 't-1',
          sender_id: SENDER_ID,
          sender_name: 'Sender',
          traveller_id: TRAVELLER_ID,
          traveller_name: 'Traveller',
          created_by: SENDER_ID,
          status: 'pending',
          price: 300,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      });

      // Sender tries to accept their own request
      const res = await updateRequestStatus(REQUEST_ID, 'accepted', SENDER_ID);
      expect(res.data).toBeNull();
      expect(res.error).toMatch(/Requesters cannot accepted their own request/i);
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('blocks carrier from accepting their own carry offer', async () => {
      // Mock existing carry offer: created by traveller
      mockSingle.mockResolvedValueOnce({
        data: {
          id: REQUEST_ID,
          parcel_id: 'p-1',
          trip_id: 't-1',
          sender_id: SENDER_ID,
          sender_name: 'Sender',
          traveller_id: TRAVELLER_ID,
          traveller_name: 'Traveller',
          created_by: TRAVELLER_ID,
          status: 'pending',
          price: 300,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      });

      // Traveller tries to accept their own offer
      const res = await updateRequestStatus(REQUEST_ID, 'accepted', TRAVELLER_ID);
      expect(res.data).toBeNull();
      expect(res.error).toMatch(/Requesters cannot accepted their own request/i);
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('blocks non-participants from updating request', async () => {
      mockSingle.mockResolvedValueOnce({
        data: {
          id: REQUEST_ID,
          parcel_id: 'p-1',
          trip_id: 't-1',
          sender_id: SENDER_ID,
          sender_name: 'Sender',
          traveller_id: TRAVELLER_ID,
          traveller_name: 'Traveller',
          created_by: SENDER_ID,
          status: 'pending',
          price: 300,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      });

      const res = await updateRequestStatus(REQUEST_ID, 'accepted', THIRD_PARTY_ID);
      expect(res.data).toBeNull();
      expect(res.error).toMatch(/Only the sender or assigned traveller can update this request/i);
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('blocks recipient from cancelling request they did not create', async () => {
      mockSingle.mockResolvedValueOnce({
        data: {
          id: REQUEST_ID,
          parcel_id: 'p-1',
          trip_id: 't-1',
          sender_id: SENDER_ID,
          sender_name: 'Sender',
          traveller_id: TRAVELLER_ID,
          traveller_name: 'Traveller',
          created_by: SENDER_ID,
          status: 'pending',
          price: 300,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      });

      // Traveller (recipient) tries to cancel sender's request
      const res = await cancelRequest(REQUEST_ID, TRAVELLER_ID);
      expect(res.data).toBeNull();
      expect(res.error).toMatch(/Only the user who created this request can cancel it/i);
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('allows intended recipient to accept request via transition_request_status RPC', async () => {
      mockSingle.mockResolvedValueOnce({
        data: {
          id: REQUEST_ID,
          parcel_id: 'p-1',
          trip_id: 't-1',
          sender_id: SENDER_ID,
          sender_name: 'Sender',
          traveller_id: TRAVELLER_ID,
          traveller_name: 'Traveller',
          created_by: SENDER_ID,
          status: 'pending',
          price: 300,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      });

      mockRpc.mockReturnValueOnce({
        single: jest.fn().mockResolvedValueOnce({
          data: {
            id: REQUEST_ID,
            parcel_id: 'p-1',
            trip_id: 't-1',
            sender_id: SENDER_ID,
            sender_name: 'Sender',
            traveller_id: TRAVELLER_ID,
            traveller_name: 'Traveller',
            created_by: SENDER_ID,
            status: 'accepted',
            price: 300,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          error: null,
        }),
      });

      const res = await updateRequestStatus(REQUEST_ID, 'accepted', TRAVELLER_ID);
      expect(mockRpc).toHaveBeenCalledWith('transition_request_status', {
        p_request_id: REQUEST_ID,
        p_next_status: 'accepted',
      });
      expect(res.data?.status).toBe('accepted');
      expect(res.error).toBeNull();
    });

    it('allows sender to accept a carrier offer via transition_request_status RPC', async () => {
      mockSingle.mockResolvedValueOnce({
        data: {
          id: REQUEST_ID,
          parcel_id: 'p-1',
          trip_id: 't-1',
          sender_id: SENDER_ID,
          sender_name: 'Sender',
          traveller_id: TRAVELLER_ID,
          traveller_name: 'Traveller',
          created_by: TRAVELLER_ID, // Created by traveller!
          status: 'pending',
          price: 300,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      });

      mockRpc.mockReturnValueOnce({
        single: jest.fn().mockResolvedValueOnce({
          data: {
            id: REQUEST_ID,
            parcel_id: 'p-1',
            trip_id: 't-1',
            sender_id: SENDER_ID,
            sender_name: 'Sender',
            traveller_id: TRAVELLER_ID,
            traveller_name: 'Traveller',
            created_by: TRAVELLER_ID,
            status: 'accepted',
            price: 300,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          error: null,
        }),
      });

      // Sender is the intended recipient of carrier offer
      const res = await updateRequestStatus(REQUEST_ID, 'accepted', SENDER_ID);
      expect(mockRpc).toHaveBeenCalledWith('transition_request_status', {
        p_request_id: REQUEST_ID,
        p_next_status: 'accepted',
      });
      expect(res.data?.status).toBe('accepted');
      expect(res.error).toBeNull();
    });

    it('does NOT fallback to direct table update when RPC fails (strict security)', async () => {
      mockSingle.mockResolvedValueOnce({
        data: {
          id: REQUEST_ID,
          parcel_id: 'p-1',
          trip_id: 't-1',
          sender_id: SENDER_ID,
          sender_name: 'Sender',
          traveller_id: TRAVELLER_ID,
          traveller_name: 'Traveller',
          created_by: SENDER_ID,
          status: 'pending',
          price: 300,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      });

      mockRpc.mockReturnValueOnce({
        single: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'Security violation: intended recipient required' },
        }),
      });

      const res = await updateRequestStatus(REQUEST_ID, 'accepted', TRAVELLER_ID);
      expect(res.data).toBeNull();
      expect(res.error).toBe('Security violation: intended recipient required');

      // Verify no direct update call was issued to supabase
      const updateCalls = mockFrom.mock.calls.filter(([table]: [string]) => table === 'requests');
      // Only the initial fetch should have occurred
      expect(updateCalls.length).toBe(1);
    });
  });
});
