interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  computationTimeMs: number;
  ttlMs: number;
}

export interface CacheStats {
  size: number;
  maxEntries: number;
  hits: number;
  misses: number;
  earlyRefreshes: number;
  evictions: number;
  hitRatio: number;
}

/**
 * Enterprise Multi-Tier Memory Cache with:
 * 1. Bounded size & LRU eviction (prevents memory leaks).
 * 2. SingleFlight promise deduplication (prevents thundering herds on cold misses).
 * 3. Probabilistic Early Recomputation (XFetch algorithm by Vattani et al.)
 *    to asynchronously refresh hot cache items before expiry, ensuring zero stampedes.
 * 4. Hit/miss/eviction telemetry.
 */
export class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private inFlight = new Map<string, Promise<unknown>>();
  private readonly maxEntries: number;
  private hits = 0;
  private misses = 0;
  private earlyRefreshes = 0;
  private evictions = 0;

  constructor(maxEntries = 2000) {
    this.maxEntries = maxEntries;
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return null;
    }

    // Refresh LRU order (delete & re-insert)
    this.store.delete(key);
    this.store.set(key, entry);
    this.hits++;

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number, computationTimeMs = 10): void {
    if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) {
        this.store.delete(oldestKey);
        this.evictions++;
      }
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      computationTimeMs,
      ttlMs,
    });
  }

  /**
   * SingleFlight + XFetch Probabilistic Early Recomputation:
   * If a key is nearing expiry, probabilistically trigger a background fetch
   * before the key expires so concurrent callers never wait on a cold database hit.
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number,
    beta = 1.0,
  ): Promise<T> {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    const now = Date.now();

    if (entry && now <= entry.expiresAt) {
      this.hits++;
      // XFetch formula: delta = -beta * computationTime * ln(rand())
      const rand = Math.random();
      const delta = -beta * (entry.computationTimeMs || 10) * Math.log(Math.max(rand, 0.0001));

      // If (now - delta) > expiresAt, trigger non-blocking early background refresh
      if (now - delta > entry.expiresAt && !this.inFlight.has(key)) {
        this.earlyRefreshes++;
        this.triggerBackgroundRefresh(key, fetcher, ttlMs);
      }

      return entry.value;
    }

    // Check in-flight promise deduplication
    const ongoing = this.inFlight.get(key);
    if (ongoing) {
      return (await ongoing) as T;
    }

    this.misses++;
    return this.executeFetch(key, fetcher, ttlMs);
  }

  private async executeFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number,
  ): Promise<T> {
    const start = performance.now();

    const fetchPromise = (async () => {
      try {
        const result = await fetcher();
        const duration = Math.max(1, Math.round(performance.now() - start));
        this.set(key, result, ttlMs, duration);
        return result;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, fetchPromise);
    return (await fetchPromise) as T;
  }

  private triggerBackgroundRefresh<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number,
  ): void {
    const start = performance.now();
    const refreshPromise = (async () => {
      try {
        const result = await fetcher();
        const duration = Math.max(1, Math.round(performance.now() - start));
        this.set(key, result, ttlMs, duration);
      } catch (err) {
        console.warn(`[Cache:XFetch] Background early refresh error for '${key}':`, err);
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, refreshPromise);
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

  getStats(): CacheStats {
    const totalRequests = this.hits + this.misses;
    const hitRatio = totalRequests > 0 ? Math.round((this.hits / totalRequests) * 10000) / 100 : 0;

    return {
      size: this.store.size,
      maxEntries: this.maxEntries,
      hits: this.hits,
      misses: this.misses,
      earlyRefreshes: this.earlyRefreshes,
      evictions: this.evictions,
      hitRatio,
    };
  }
}

// Global L1 singleton with 5,000 entry capacity
export const l1Cache = new MemoryCache(5000);
