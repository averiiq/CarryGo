import { getSupabaseClient } from '@/template';

/**
 * In-memory LRU/short-lived cache for user avatars to minimize roundtrips
 * during scrolling and frequent refreshes.
 */
const avatarCache = new Map<string, { avatarUrl: string; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function getCachedAvatar(userId: string): string | undefined {
  const cached = avatarCache.get(userId);
  if (!cached) return undefined;
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    avatarCache.delete(userId);
    return undefined;
  }
  return cached.avatarUrl;
}

export function setCachedAvatar(userId: string, avatarUrl: string) {
  if (!userId || !avatarUrl) return;
  avatarCache.set(userId, { avatarUrl, timestamp: Date.now() });
}

export function clearAvatarCache() {
  avatarCache.clear();
}

/**
 * Enriches an array of items (Trips or Parcels) by filling in `userAvatar`
 * from `user_profiles` when it's missing on the listing row.
 */
export async function enrichMissingUserAvatars<T extends { userId?: string; userAvatar?: string }>(
  items: T[]
): Promise<T[]> {
  if (!items || items.length === 0) return items;

  // 1. Check in-memory cache first
  const missingUserIds = new Set<string>();
  const enrichedFromCache = items.map((item) => {
    if (item.userAvatar?.trim()) {
      if (item.userId) setCachedAvatar(item.userId, item.userAvatar.trim());
      return item;
    }
    if (item.userId) {
      const cached = getCachedAvatar(item.userId);
      if (cached) {
        return { ...item, userAvatar: cached };
      }
      missingUserIds.add(item.userId);
    }
    return item;
  });

  if (missingUserIds.size === 0) {
    return enrichedFromCache;
  }

  // 2. Fetch missing avatars in a single query
  try {
    const sb = getSupabaseClient();
    const ids = Array.from(missingUserIds);
    const { data, error } = await sb
      .from('user_profiles')
      .select('id, avatar_url')
      .in('id', ids);

    if (!error && data && data.length > 0) {
      const dbAvatarMap = new Map<string, string>();
      for (const p of data) {
        if (p.avatar_url?.trim()) {
          dbAvatarMap.set(p.id, p.avatar_url.trim());
          setCachedAvatar(p.id, p.avatar_url.trim());
        }
      }

      return enrichedFromCache.map((item) => {
        if (!item.userAvatar && item.userId && dbAvatarMap.has(item.userId)) {
          return {
            ...item,
            userAvatar: dbAvatarMap.get(item.userId),
          };
        }
        return item;
      });
    }
  } catch (err) {
    // Non-blocking fallback: return items even if enrichment query encounters an issue
    console.warn('enrichMissingUserAvatars non-blocking error:', err);
  }

  return enrichedFromCache;
}

/**
 * Fetches user avatar URLs for an array of user IDs, checking cache first,
 * then querying `user_profiles.avatar_url`, with secondary fallback to `parcels` and `trips`.
 */
export async function fetchUserAvatars(userIds: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  if (!userIds || userIds.length === 0) return result;

  const validIds = Array.from(
    new Set(userIds.filter((id) => Boolean(id && typeof id === 'string' && id.trim().length > 0)))
  );
  if (validIds.length === 0) return result;

  const missingIds: string[] = [];
  for (const id of validIds) {
    const cached = getCachedAvatar(id);
    if (cached) {
      result[id] = cached;
    } else {
      missingIds.push(id);
    }
  }

  if (missingIds.length === 0) return result;

  try {
    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('user_profiles')
      .select('id, avatar_url')
      .in('id', missingIds);

    if (!error && data) {
      for (const row of data) {
        if (row.avatar_url && typeof row.avatar_url === 'string' && row.avatar_url.trim()) {
          const trimmed = row.avatar_url.trim();
          result[row.id] = trimmed;
          setCachedAvatar(row.id, trimmed);
        }
      }
    }

    // Secondary fallback: check parcels and trips for any users still without an avatar
    const stillMissing = missingIds.filter((id) => !result[id]);
    if (stillMissing.length > 0) {
      const [parcelsRes, tripsRes] = await Promise.all([
        sb.from('parcels').select('user_id, user_avatar').in('user_id', stillMissing).not('user_avatar', 'is', null).limit(20),
        sb.from('trips').select('user_id, user_avatar').in('user_id', stillMissing).not('user_avatar', 'is', null).limit(20),
      ]);
      if (parcelsRes.data) {
        for (const p of parcelsRes.data) {
          if (p.user_avatar && p.user_id && !result[p.user_id]) {
            const trimmed = p.user_avatar.trim();
            result[p.user_id] = trimmed;
            setCachedAvatar(p.user_id, trimmed);
          }
        }
      }
      if (tripsRes.data) {
        for (const t of tripsRes.data) {
          if (t.user_avatar && t.user_id && !result[t.user_id]) {
            const trimmed = t.user_avatar.trim();
            result[t.user_id] = trimmed;
            setCachedAvatar(t.user_id, trimmed);
          }
        }
      }
    }
  } catch (err) {
    console.warn('fetchUserAvatars non-blocking error:', err);
  }

  return result;
}

