/**
 * BN-4: fetchUserAvatars must NOT do secondary fallback queries to parcels/trips tables.
 *
 * Behaviour under test: fetchUserAvatars in avatar-enrichment.service.ts
 * Existing test file: __tests__/services/avatar-enrichment.test.ts
 * User instruction: "right now keeping the both but for initial launch we use supabse and fix all
 * bottelneck issues and use these appproches. unit testing, integration testing, tdd(test driven
 * development), after completing the feature then break that feature and tell me what is break in points."
 */
import {
  fetchUserAvatars,
  clearAvatarCache,
} from '@/services/avatar-enrichment.service';
import { getSupabaseClient } from '@/template';

jest.mock('@/template', () => ({
  getSupabaseClient: jest.fn(),
}));

describe('BN-4: fetchUserAvatars — no N+1 fallback queries', () => {
  const mockSelect = jest.fn();
  const mockIn = jest.fn();
  const mockNot = jest.fn();
  const mockLimit = jest.fn();
  const mockFrom = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    clearAvatarCache();

    // user_profiles returns only user-1 avatar, NOT user-2
    mockIn.mockResolvedValue({
      data: [
        { id: 'user-1', avatar_url: 'https://cdn.example.com/u1.jpg' },
      ],
      error: null,
    });

    mockLimit.mockResolvedValue({ data: [{ user_id: 'user-2', user_avatar: 'https://cdn.example.com/u2-from-parcels.jpg' }], error: null });
    mockNot.mockReturnValue({ limit: mockLimit });
    mockSelect.mockReturnValue({ in: mockIn, not: mockNot });
    mockFrom.mockReturnValue({ select: mockSelect });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: mockFrom,
    });
  });

  it('only queries user_profiles — never queries parcels or trips tables', async () => {
    const result = await fetchUserAvatars(['user-1', 'user-2']);

    // user_profiles should be queried
    expect(mockFrom).toHaveBeenCalledWith('user_profiles');

    // parcels and trips should NEVER be queried as fallback
    expect(mockFrom).not.toHaveBeenCalledWith('parcels');
    expect(mockFrom).not.toHaveBeenCalledWith('trips');

    // user-1 found, user-2 NOT found (and that's OK — no fallback)
    expect(result['user-1']).toBe('https://cdn.example.com/u1.jpg');
    expect(result['user-2']).toBeUndefined();
  });

  it('makes exactly 1 DB call for uncached users', async () => {
    await fetchUserAvatars(['user-1', 'user-2']);

    // Only 1 call to .from() total (user_profiles)
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});
