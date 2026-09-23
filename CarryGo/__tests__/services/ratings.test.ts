import { submitRating, hasRated } from '@/services/ratings.service';
import { getSupabaseClient } from '@/template';

jest.mock('@/template', () => ({
  getSupabaseClient: jest.fn(),
}));

describe('Ratings Service', () => {
  const mockRpc = jest.fn();
  const mockFrom = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue({
      rpc: mockRpc,
      from: mockFrom,
    });
  });

  describe('submitRating validation', () => {
    it('rejects ratings less than 1', async () => {
      const res = await submitRating({
        fromUserId: 'user-1',
        toUserId: 'user-2',
        requestId: 'req-1',
        rating: 0,
      });
      expect(res.error).toBe('Rating must be an integer between 1 and 5');
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('rejects ratings greater than 5', async () => {
      const res = await submitRating({
        fromUserId: 'user-1',
        toUserId: 'user-2',
        requestId: 'req-1',
        rating: 6,
      });
      expect(res.error).toBe('Rating must be an integer between 1 and 5');
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('rejects non-integer ratings', async () => {
      const res = await submitRating({
        fromUserId: 'user-1',
        toUserId: 'user-2',
        requestId: 'req-1',
        rating: 4.5,
      });
      expect(res.error).toBe('Rating must be an integer between 1 and 5');
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  describe('submitRating execution & fallback', () => {
    it('successfully records rating via submit_rating_command RPC', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{
          id: 'rating-1',
          from_user_id: 'user-1',
          to_user_id: 'user-2',
          request_id: 'req-1',
          rating: 5,
          comment: 'Great traveller!',
          created_at: '2026-09-23T10:00:00Z',
        }],
        error: null,
      });

      const res = await submitRating({
        fromUserId: 'user-1',
        toUserId: 'user-2',
        requestId: 'req-1',
        rating: 5,
        comment: 'Great traveller!',
      });

      expect(res.error).toBeNull();
      expect(res.data?.id).toBe('rating-1');
      expect(res.data?.rating).toBe(5);
      expect(res.data?.fromUserId).toBe('user-1');
      expect(res.data?.toUserId).toBe('user-2');
    });

    it('gracefully falls back to direct table insertion when RPC encounters column ambiguity error', async () => {
      // Simulate the RPC returning ambiguous error
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'column reference "request_id" is ambiguous' },
      });

      // Mock direct insert fallback
      const mockSingle = jest.fn().mockResolvedValueOnce({
        data: {
          id: 'fallback-rating-1',
          from_user_id: 'user-1',
          to_user_id: 'user-2',
          request_id: 'req-1',
          rating: 4,
          comment: 'Delivered safely',
          created_at: '2026-09-23T10:05:00Z',
        },
        error: null,
      });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
      mockFrom.mockReturnValue({ insert: mockInsert });

      const res = await submitRating({
        fromUserId: 'user-1',
        toUserId: 'user-2',
        requestId: 'req-1',
        rating: 4,
        comment: 'Delivered safely',
      });

      expect(mockFrom).toHaveBeenCalledWith('ratings');
      expect(mockInsert).toHaveBeenCalledWith({
        from_user_id: 'user-1',
        to_user_id: 'user-2',
        request_id: 'req-1',
        rating: 4,
        comment: 'Delivered safely',
      });
      expect(res.error).toBeNull();
      expect(res.data?.id).toBe('fallback-rating-1');
      expect(res.data?.rating).toBe(4);
    });
  });

  describe('hasRated', () => {
    it('returns true if a rating row exists', async () => {
      const mockSingle = jest.fn().mockResolvedValueOnce({
        data: { id: 'rating-1' },
        error: null,
      });
      const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
      mockFrom.mockReturnValue({ select: mockSelect });

      const result = await hasRated('user-1', 'req-1');
      expect(result).toBe(true);
    });

    it('returns false if no rating row exists', async () => {
      const mockSingle = jest.fn().mockResolvedValueOnce({
        data: null,
        error: null,
      });
      const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
      mockFrom.mockReturnValue({ select: mockSelect });

      const result = await hasRated('user-1', 'req-1');
      expect(result).toBe(false);
    });
  });
});
