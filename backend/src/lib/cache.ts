interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * High-performance In-Memory L1 Cache with:
 * 1. Bounded size & LRU eviction (prevents memory leaks).
 * 2. TTL expiration (stale data prevention).
 * 3. SingleFlight promise deduplication (prevents cache stampede / thundering herd on cold misses).
 */
export class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private inFlight = new Map<string, Promise<unknown>>();
  private readonly maxEntries: number;

  constructor(maxEntries = 1000) {
    this.maxEntries = maxEntries;
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    // Refresh LRU order (delete & re-insert)
    this.store.delete(key);
    this.store.set(key, entry);

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    if (this.store.size >= this.maxEntries) {
      // Evict oldest entry (first item in Map iterator)
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) {
        this.store.delete(oldestKey);
      }
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * SingleFlight: If a key is currently being fetched, concurrent callers wait
   * on the same in-flight Promise instead of thundering the database.
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number,
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Check if an in-flight fetch already exists for this key
    const ongoing = this.inFlight.get(key);
    if (ongoing) {
      return (await ongoing) as T;
    }

    // Initiate new fetch
    const fetchPromise = (async () => {
      try {
        const result = await fetcher();
        this.set(key, result, ttlMs);
        return result;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, fetchPromise);
    return (await fetchPromise) as T;
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
    this.inFlight.clear();
  }

  size(): number {
    return this.store.size;
  }
}

// Global L1 singleton for Lambda runtime container reuse
export const l1Cache = new MemoryCache(2000);
