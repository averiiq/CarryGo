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
  notifyRequestAccepted: jest.fn().mockResolvedValue({}),
  notifyRequestDeclined: jest.fn().mockResolvedValue({}),
  notifyOfferAccepted: jest.fn().mockResolvedValue({}),
  notifyOfferDeclined: jest.fn().mockResolvedValue({}),
}));

jest.mock('@/lib/server-rate-limit', () => ({
  enforceRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
}));

describe('Request & Accept Flow Specification Implementation', () => {
  const SENDER_ID = '11111111-1111-4111-a111-111111111111';
  const TRAVELLER_ID = '22222222-2222-4222-a222-222222222222';
  const UNRELATED_USER_ID = '33333333-3333-4333-a333-333333333333';
  const REQUEST_ID = '99999999-9999-4999-a999-999999999999';

  const baseSenderRequest: Request = {
    id: REQUEST_ID,
    parcelId: 'p-1',
    tripId: 't-1',
    senderId: SENDER_ID,
    senderName: 'Sender User',
    travellerId: TRAVELLER_ID,
    travellerName: 'Traveller User',
    createdBy: SENDER_ID,
    status: 'pending',
    price: 350,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Role & Activity Partitioning', () => {
    it('shows sent request under Sender Outgoing/Sent section and NOT in Incoming', () => {
      expect(isRequestOutgoing(baseSenderRequest, SENDER_ID)).toBe(true);
      expect(isRequestIncoming(baseSenderRequest, SENDER_ID)).toBe(false);
    });

    it('shows incoming request under Traveler Incoming section and NOT in Sent/Outgoing', () => {
      expect(isRequestIncoming(baseSenderRequest, TRAVELLER_ID)).toBe(true);
      expect(isRequestOutgoing(baseSenderRequest, TRAVELLER_ID)).toBe(false);
    });

    it('hides request from unrelated third party', () => {
      expect(isRequestIncoming(baseSenderRequest, UNRELATED_USER_ID)).toBe(false);
      expect(isRequestOutgoing(baseSenderRequest, UNRELATED_USER_ID)).toBe(false);
    });
  });

  describe('2. Permission Rules on Accept/Reject', () => {
    it('strictly prevents the Sender from accepting their own sent request', async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: {
          id: REQUEST_ID,
          parcel_id: 'p-1',
          trip_id: 't-1',
          sender_id: SENDER_ID,
          sender_name: 'Sender User',
          traveller_id: TRAVELLER_ID,
          traveller_name: 'Traveller User',
          created_by: SENDER_ID,
          status: 'pending',
          price: 350,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      });

      (getSupabaseClient as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: mockSingle,
            }),
          }),
        }),
      });

      const result = await updateRequestStatus(REQUEST_ID, 'accepted', SENDER_ID);
      expect(result.data).toBeNull();
      expect(result.error).toMatch(/Requesters cannot accepted their own request|Only the intended recipient/);
    });

    it('strictly prevents an unrelated user from accepting the request', async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: {
          id: REQUEST_ID,
          parcel_id: 'p-1',
          trip_id: 't-1',
          sender_id: SENDER_ID,
          sender_name: 'Sender User',
          traveller_id: TRAVELLER_ID,
          traveller_name: 'Traveller User',
          created_by: SENDER_ID,
          status: 'pending',
          price: 350,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      });

      (getSupabaseClient as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: mockSingle,
            }),
          }),
        }),
      });

      const result = await updateRequestStatus(REQUEST_ID, 'accepted', UNRELATED_USER_ID);
      expect(result.data).toBeNull();
      expect(result.error).toBe('Only the sender or assigned traveller can update this request.');
    });

    it('allows the assigned Traveler to accept the incoming request', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: REQUEST_ID,
              parcel_id: 'p-1',
              trip_id: 't-1',
              sender_id: SENDER_ID,
              sender_name: 'Sender User',
              traveller_id: TRAVELLER_ID,
              traveller_name: 'Traveller User',
              created_by: SENDER_ID,
              status: 'pending',
              price: 350,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            error: null,
          }),
        }),
      });

      const mockRpc = jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: REQUEST_ID,
            parcel_id: 'p-1',
            trip_id: 't-1',
            sender_id: SENDER_ID,
            sender_name: 'Sender User',
            traveller_id: TRAVELLER_ID,
            traveller_name: 'Traveller User',
            created_by: SENDER_ID,
            status: 'accepted',
            price: 350,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          error: null,
        }),
      });

      (getSupabaseClient as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: mockSelect,
        }),
        rpc: mockRpc,
      });

      const result = await updateRequestStatus(REQUEST_ID, 'accepted', TRAVELLER_ID);
      expect(result.error).toBeNull();
      expect(result.data?.status).toBe('accepted');
      expect(mockRpc).toHaveBeenCalledWith('transition_request_status', {
        p_request_id: REQUEST_ID,
        p_next_status: 'accepted',
      });
    });

    it('allows the assigned Traveler to reject the incoming request', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: REQUEST_ID,
              parcel_id: 'p-1',
              trip_id: 't-1',
              sender_id: SENDER_ID,
              sender_name: 'Sender User',
              traveller_id: TRAVELLER_ID,
              traveller_name: 'Traveller User',
              created_by: SENDER_ID,
              status: 'pending',
              price: 350,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            error: null,
          }),
        }),
      });

      const mockRpc = jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: REQUEST_ID,
            parcel_id: 'p-1',
            trip_id: 't-1',
            sender_id: SENDER_ID,
            sender_name: 'Sender User',
            traveller_id: TRAVELLER_ID,
            traveller_name: 'Traveller User',
            created_by: SENDER_ID,
            status: 'rejected',
            price: 350,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          error: null,
        }),
      });

      (getSupabaseClient as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: mockSelect,
        }),
        rpc: mockRpc,
      });

      const result = await updateRequestStatus(REQUEST_ID, 'rejected', TRAVELLER_ID);
      expect(result.error).toBeNull();
      expect(result.data?.status).toBe('rejected');
    });

    it('allows the Sender who initiated the request to withdraw/cancel it before response', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: REQUEST_ID,
              parcel_id: 'p-1',
              trip_id: 't-1',
              sender_id: SENDER_ID,
              sender_name: 'Sender User',
              traveller_id: TRAVELLER_ID,
              traveller_name: 'Traveller User',
              created_by: SENDER_ID,
              status: 'pending',
              price: 350,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            error: null,
          }),
        }),
      });

      const mockRpc = jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: REQUEST_ID,
            parcel_id: 'p-1',
            trip_id: 't-1',
            sender_id: SENDER_ID,
            sender_name: 'Sender User',
            traveller_id: TRAVELLER_ID,
            traveller_name: 'Traveller User',
            created_by: SENDER_ID,
            status: 'cancelled',
            price: 350,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          error: null,
        }),
      });

      (getSupabaseClient as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: mockSelect,
        }),
        rpc: mockRpc,
      });

      const result = await cancelRequest(REQUEST_ID, SENDER_ID);
      expect(result.error).toBeNull();
      expect(result.data?.status).toBe('cancelled');
    });
  });
});
