import {
  enrichMissingUserAvatars,
  fetchUserAvatars,
  clearAvatarCache,
  getCachedAvatar,
  setCachedAvatar,
} from '@/services/avatar-enrichment.service';
import { getSupabaseClient } from '@/template';

jest.mock('@/template', () => ({
  getSupabaseClient: jest.fn(),
}));

describe('avatar-enrichment.service', () => {
  const mockSelect = jest.fn();
  const mockIn = jest.fn();
  const mockFrom = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    clearAvatarCache();

    mockIn.mockResolvedValue({
      data: [
        { id: 'user-2', avatar_url: 'https://cloudinary.com/u2-avatar.jpg' },
        { id: 'user-3', avatar_url: 'https://cloudinary.com/u3-avatar.jpg' },
      ],
      error: null,
    });

    mockSelect.mockReturnValue({ in: mockIn });
    mockFrom.mockReturnValue({ select: mockSelect });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: mockFrom,
    });
  });

  it('preserves existing userAvatar and caches it without querying DB', async () => {
    const items = [
      { id: 't1', userId: 'user-1', userAvatar: 'https://cloudinary.com/u1-avatar.jpg' },
    ];

    const result = await enrichMissingUserAvatars(items);

    expect(result).toHaveLength(1);
    expect(result[0].userAvatar).toBe('https://cloudinary.com/u1-avatar.jpg');
    expect(mockFrom).not.toHaveBeenCalled();
    expect(getCachedAvatar('user-1')).toBe('https://cloudinary.com/u1-avatar.jpg');
  });

  it('fetches missing avatars from user_profiles for other users', async () => {
    const items = [
      { id: 't1', userId: 'user-1', userAvatar: 'https://cloudinary.com/u1-avatar.jpg' },
      { id: 't2', userId: 'user-2', userAvatar: undefined },
      { id: 't3', userId: 'user-3', userAvatar: '' },
    ];

    const result = await enrichMissingUserAvatars(items);

    expect(result[0].userAvatar).toBe('https://cloudinary.com/u1-avatar.jpg');
    expect(result[1].userAvatar).toBe('https://cloudinary.com/u2-avatar.jpg');
    expect(result[2].userAvatar).toBe('https://cloudinary.com/u3-avatar.jpg');

    expect(mockFrom).toHaveBeenCalledWith('user_profiles');
    expect(mockSelect).toHaveBeenCalledWith('id, avatar_url');
    expect(mockIn).toHaveBeenCalledWith('id', expect.arrayContaining(['user-2', 'user-3']));
  });

  it('uses in-memory cache on subsequent calls without querying DB again', async () => {
    setCachedAvatar('user-4', 'https://cloudinary.com/cached-u4.jpg');

    const items = [
      { id: 't4', userId: 'user-4', userAvatar: undefined },
    ];

    const result = await enrichMissingUserAvatars(items);

    expect(result[0].userAvatar).toBe('https://cloudinary.com/cached-u4.jpg');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('handles database errors gracefully and returns original items without crashing', async () => {
    mockIn.mockResolvedValueOnce({
      data: null,
      error: { message: 'Network timeout' },
    });

    const items = [
      { id: 't5', userId: 'user-5', userAvatar: undefined },
    ];

    const result = await enrichMissingUserAvatars(items);

    expect(result).toHaveLength(1);
    expect(result[0].userAvatar).toBeUndefined();
  });

  it('handles empty items array gracefully', async () => {
    const result = await enrichMissingUserAvatars([]);
    expect(result).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  describe('fetchUserAvatars', () => {
    it('returns empty object when provided empty array or invalid IDs', async () => {
      const res1 = await fetchUserAvatars([]);
      const res2 = await fetchUserAvatars(['', '   ']);
      expect(res1).toEqual({});
      expect(res2).toEqual({});
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('returns cached avatars immediately without querying database', async () => {
      setCachedAvatar('user-cached-1', 'https://cloudinary.com/cached-1.jpg');
      setCachedAvatar('user-cached-2', 'https://cloudinary.com/cached-2.jpg');

      const result = await fetchUserAvatars(['user-cached-1', 'user-cached-2']);
      expect(result).toEqual({
        'user-cached-1': 'https://cloudinary.com/cached-1.jpg',
        'user-cached-2': 'https://cloudinary.com/cached-2.jpg',
      });
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('fetches missing avatars from user_profiles and updates cache', async () => {
      mockIn.mockResolvedValueOnce({
        data: [
          { id: 'user-db-1', avatar_url: 'https://cloudinary.com/db-1.jpg' },
        ],
        error: null,
      });

      const result = await fetchUserAvatars(['user-db-1']);
      expect(result).toEqual({
        'user-db-1': 'https://cloudinary.com/db-1.jpg',
      });
      expect(getCachedAvatar('user-db-1')).toBe('https://cloudinary.com/db-1.jpg');
      expect(mockFrom).toHaveBeenCalledWith('user_profiles');
    });

    it('handles query error gracefully without crashing', async () => {
      mockIn.mockRejectedValueOnce(new Error('DB failure'));

      const result = await fetchUserAvatars(['user-fail-1']);
      expect(result).toEqual({});
    });
  });
});

