import Redis, { RedisOptions } from 'ioredis';
import { randomUUID } from 'crypto';

export interface RedisRateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  totalHits: number;
}

export interface RedisTelemetry {
  status: 'connected' | 'connecting' | 'disconnected' | 'disabled';
  hits: number;
  misses: number;
  sets: number;
  errors: number;
  latencyMs: number;
}

/**
 * Atomic sliding-window rate limiter in Lua:
 * KEYS[1]: rate limit key
 * ARGV[1]: current timestamp in milliseconds
 * ARGV[2]: window duration in milliseconds
 * ARGV[3]: max allowed requests
 * ARGV[4]: unique request member ID
 */
const SLIDING_WINDOW_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local maxRequests = tonumber(ARGV[3])
local member = ARGV[4]

local clearBefore = now - windowMs
redis.call('ZREMRANGEBYSCORE', key, '-inf', clearBefore)

local currentCount = redis.call('ZCARD', key)
if currentCount < maxRequests then
  redis.call('ZADD', key, now, member)
  redis.call('PEXPIRE', key, windowMs)
  return {1, maxRequests - currentCount - 1, 0, currentCount + 1}
else
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local retryAfterMs = 0
  if #oldest >= 2 then
    retryAfterMs = math.max(0, math.ceil((tonumber(oldest[2]) + windowMs - now) / 1000))
  else
    retryAfterMs = math.ceil(windowMs / 1000)
  end
  return {0, 0, retryAfterMs, currentCount}
end
`;

/**
 * Atomic lock release in Lua: only deletes if the lock token matches
 */
const RELEASE_LOCK_LUA = `
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('del', KEYS[1])
else
  return 0
end
`;

export class RedisService {
  private client: Redis | null = null;
  private isAvailable = false;
  private isConnecting = false;
  private hits = 0;
  private misses = 0;
  private sets = 0;
  private errors = 0;
  private lastLatencyMs = 0;
  private namespace = 'carrygo:v1:';

  constructor() {
    this.initClient();
  }

  private initClient(): void {
    const redisUrl = process.env.REDIS_URL;
    const redisHost = process.env.REDIS_HOST;

    if (!redisUrl && !redisHost) {
      // Redis is not configured in this environment; memory cache will be used
      return;
    }

    try {
      const options: RedisOptions = {
        lazyConnect: true,
        enableOfflineQueue: false, // Fail fast on partition to prevent unbounded memory growth
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        commandTimeout: 1500,
        retryStrategy(times) {
          if (times > 10) return null; // Stop retrying after 10 attempts
          return Math.min(times * 150, 2000); // Exponential backoff capped at 2s
        },
      };

      if (redisUrl) {
        this.client = new Redis(redisUrl, options);
      } else {
        this.client = new Redis({
          host: redisHost || '127.0.0.1',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          password: process.env.REDIS_PASSWORD || undefined,
          ...options,
        });
      }

      this.client.on('connect', () => {
        this.isAvailable = true;
        this.isConnecting = false;
      });

      this.client.on('ready', () => {
        this.isAvailable = true;
      });

      this.client.on('error', (err) => {
        this.errors++;
        this.isAvailable = false;
        // Log cleanly without noisy crash traces during offline development
        if (process.env.NODE_ENV !== 'test') {
          console.warn(`[Redis:Warn] Connection issue (${err.message}). Falling back to local L1 cache.`);
        }
      });

      this.client.on('close', () => {
        this.isAvailable = false;
      });

      // Attempt initial connection asynchronously
      this.connect();
    } catch (err) {
      console.warn('[Redis] Initialization error, falling back to L1 MemoryCache:', err);
      this.client = null;
      this.isAvailable = false;
    }
  }

  public async connect(): Promise<boolean> {
    if (!this.client || this.isAvailable || this.isConnecting) {
      return this.isAvailable;
    }

    this.isConnecting = true;
    try {
      await this.client.connect();
      this.isAvailable = true;
      return true;
    } catch {
      this.isAvailable = false;
      return false;
    } finally {
      this.isConnecting = false;
    }
  }

  public isConnected(): boolean {
    return this.isAvailable && this.client !== null;
  }

  private formatKey(key: string): string {
    return `${this.namespace}${key}`;
  }

  public async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected() || !this.client) {
      this.misses++;
      return null;
    }

    const start = performance.now();
    try {
      const raw = await this.client.get(this.formatKey(key));
      this.lastLatencyMs = Math.round(performance.now() - start);

      if (raw === null) {
        this.misses++;
        return null;
      }

      this.hits++;
      return JSON.parse(raw) as T;
    } catch (err) {
      this.errors++;
      this.isAvailable = false;
      return null;
    }
  }

  public async set<T>(key: string, value: T, ttlSeconds: number): Promise<boolean> {
    if (!this.isConnected() || !this.client) {
      return false;
    }

    try {
      const payload = JSON.stringify(value);
      const formattedKey = this.formatKey(key);
      if (ttlSeconds > 0) {
        await this.client.set(formattedKey, payload, 'EX', ttlSeconds);
      } else {
        await this.client.set(formattedKey, payload);
      }
      this.sets++;
      return true;
    } catch (err) {
      this.errors++;
      return false;
    }
  }

  public async del(key: string | string[]): Promise<boolean> {
    if (!this.isConnected() || !this.client) {
      return false;
    }

    try {
      if (Array.isArray(key)) {
        if (key.length === 0) return true;
        const keys = key.map((k) => this.formatKey(k));
        await this.client.del(...keys);
      } else {
        await this.client.del(this.formatKey(key));
      }
      return true;
    } catch {
      this.errors++;
      return false;
    }
  }

  /**
   * Safely deletes keys matching a pattern using non-blocking SCAN (prevents Redis freeze)
   */
  public async delByPattern(pattern: string): Promise<number> {
    if (!this.isConnected() || !this.client) {
      return 0;
    }

    try {
      const fullPattern = this.formatKey(pattern);
      let cursor = '0';
      let deletedCount = 0;

      do {
        const [nextCursor, keys] = await this.client.scan(
          cursor,
          'MATCH',
          fullPattern,
          'COUNT',
          100,
        );
        cursor = nextCursor;

        if (keys.length > 0) {
          await this.client.del(...keys);
          deletedCount += keys.length;
        }
      } while (cursor !== '0');

      return deletedCount;
    } catch {
      this.errors++;
      return 0;
    }
  }

  /**
   * High-speed atomic distributed sliding-window rate limiter
   */
  public async checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RedisRateLimitResult | null> {
    if (!this.isConnected() || !this.client) {
      return null;
    }

    try {
      const formattedKey = this.formatKey(`ratelimit:${key}`);
      const now = Date.now();
      const windowMs = windowSeconds * 1000;
      const member = `${now}-${randomUUID().slice(0, 8)}`;

      const result = (await this.client.eval(
        SLIDING_WINDOW_LUA,
        1,
        formattedKey,
        now,
        windowMs,
        limit,
        member,
      )) as [number, number, number, number];

      const allowed = result[0] === 1;
      const remaining = Number(result[1]);
      const retryAfterSeconds = Number(result[2]);
      const totalHits = Number(result[3]);

      return {
        allowed,
        remaining,
        retryAfterSeconds,
        totalHits,
      };
    } catch {
      this.errors++;
      return null;
    }
  }

  /**
   * Distributed locking for concurrent state transitions & idempotency
   */
  public async acquireLock(key: string, ttlSeconds = 10): Promise<string | null> {
    if (!this.isConnected() || !this.client) {
      return null;
    }

    try {
      const lockToken = randomUUID();
      const formattedKey = this.formatKey(`lock:${key}`);
      const acquired = await this.client.set(formattedKey, lockToken, 'EX', ttlSeconds, 'NX');
      return acquired === 'OK' ? lockToken : null;
    } catch {
      this.errors++;
      return null;
    }
  }

  public async releaseLock(key: string, lockToken: string): Promise<boolean> {
    if (!this.isConnected() || !this.client) {
      return false;
    }

    try {
      const formattedKey = this.formatKey(`lock:${key}`);
      const res = await this.client.eval(RELEASE_LOCK_LUA, 1, formattedKey, lockToken);
      return res === 1;
    } catch {
      this.errors++;
      return false;
    }
  }

  public getTelemetry(): RedisTelemetry {
    let status: RedisTelemetry['status'] = 'disabled';
    if (this.client) {
      if (this.isAvailable) status = 'connected';
      else if (this.isConnecting) status = 'connecting';
      else status = 'disconnected';
    }

    return {
      status,
      hits: this.hits,
      misses: this.misses,
      sets: this.sets,
      errors: this.errors,
      latencyMs: this.lastLatencyMs,
    };
  }

  public async close(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        this.client.disconnect();
      }
      this.isAvailable = false;
      this.client = null;
    }
  }
}

// Global Redis singleton instance
export const redisService = new RedisService();
