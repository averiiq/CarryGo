import { requestAccountDeletion, recreateUserAccount } from '@/services/account.service';
import { fetchProfile, ensureProfile } from '@/services/profile.service';
import { getSupabaseClient } from '@/template';

jest.mock('@/template', () => ({
  getSupabaseClient: jest.fn(),
}));

describe('Account Service - Soft Delete Functionality', () => {
  const mockRpc = jest.fn();
  const mockFrom = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue({
      rpc: mockRpc,
      from: mockFrom,
    });
  });

  describe('requestAccountDeletion', () => {
    it('successfully calls soft_delete_user_account RPC and returns null error', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { success: true, user_id: 'test-user-id', trips_cancelled: 1, parcels_cancelled: 0 },
        error: null,
      });

      const res = await requestAccountDeletion();
      expect(mockRpc).toHaveBeenCalledWith('soft_delete_user_account');
      expect(res).toEqual({ error: null });
    });

    it('returns error message when RPC call encounters an error', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not authenticated' },
      });

      const res = await requestAccountDeletion();
      expect(mockRpc).toHaveBeenCalledWith('soft_delete_user_account');
      expect(res).toEqual({ error: 'Not authenticated' });
    });

    it('returns error when RPC returns an error payload', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { success: false, error: 'User not found' },
        error: null,
      });

      const res = await requestAccountDeletion();
      expect(res).toEqual({ error: 'User not found' });
    });
  });

  describe('fetchProfile with soft deleted user', () => {
    it('returns ACCOUNT_DELETED when is_deleted is true', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockMaybeSingle = jest.fn().mockResolvedValueOnce({
        data: {
          id: 'user-123',
          full_name: 'Deleted User',
          email: 'deleted@test.com',
          is_deleted: true,
          deleted_at: '2026-09-21T18:00:00Z',
        },
        error: null,
      });

      mockFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        maybeSingle: mockMaybeSingle,
      });

      const res = await fetchProfile('user-123');
      expect(res).toEqual({ data: null, error: 'ACCOUNT_DELETED' });
    });

    it('returns valid profile when is_deleted is false', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockMaybeSingle = jest.fn().mockResolvedValueOnce({
        data: {
          id: 'user-456',
          full_name: 'Active User',
          email: 'active@test.com',
          is_deleted: false,
          deleted_at: null,
          rating: 4.8,
        },
        error: null,
      });

      mockFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        maybeSingle: mockMaybeSingle,
      });

      const res = await fetchProfile('user-456');
      expect(res.error).toBeNull();
      expect(res.data?.id).toBe('user-456');
      expect(res.data?.name).toBe('Active User');
      expect(res.data?.isDeleted).toBe(false);
    });
  });

  describe('recreateUserAccount', () => {
    it('successfully calls recreate_user_account RPC and returns null error', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { success: true, user_id: 'test-user-id' },
        error: null,
      });

      const res = await recreateUserAccount();
      expect(mockRpc).toHaveBeenCalledWith('recreate_user_account');
      expect(res).toEqual({ error: null });
    });

    it('returns error message when recreate RPC encounters an error', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not authenticated' },
      });

      const res = await recreateUserAccount();
      expect(mockRpc).toHaveBeenCalledWith('recreate_user_account');
      expect(res).toEqual({ error: 'Not authenticated' });
    });
  });

  describe('ensureProfile with soft-deleted user', () => {
    it('re-creates the account when existing profile is marked as deleted', async () => {
      // First fetchProfile returns deleted
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockMaybeSingle = jest
        .fn()
        .mockResolvedValueOnce({
          data: { id: 'user-789', is_deleted: true, deleted_at: '2026-09-21T18:00:00Z' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 'user-789', email: 'recreated@test.com', is_deleted: false, deleted_at: null },
          error: null,
        });

      mockFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        maybeSingle: mockMaybeSingle,
      });

      mockRpc.mockResolvedValueOnce({
        data: { success: true, user_id: 'user-789' },
        error: null,
      });

      const res = await ensureProfile('user-789', 'recreated@test.com');
      expect(mockRpc).toHaveBeenCalledWith('recreate_user_account', { p_user_id: 'user-789' });
      expect(res.error).toBeNull();
      expect(res.data?.id).toBe('user-789');
      expect(res.data?.isDeleted).toBe(false);
    });
  });
});
