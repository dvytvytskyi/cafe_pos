import Redis from 'ioredis';

/**
 * Global Cache Interface
 * This abstracts the underlying cache implementation (Redis, In-Memory, etc.)
 */
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: any, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(prefix?: string): Promise<void>;
}

// Redis Cache Service
export class RedisCacheService implements ICacheService {
  private client: Redis;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      connectTimeout: 2000,
      commandTimeout: 2000,
      enableOfflineQueue: false,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 100, 1000);
      },
    });

    this.client.on('error', (err) => {
      console.error('Redis Cache Connection Error:', err);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.client.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      console.error(`Error reading from Redis cache for key [${key}]:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      console.error(`Error writing to Redis cache for key [${key}]:`, error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error(`Error deleting Redis cache key [${key}]:`, error);
    }
  }

  async clear(prefix?: string): Promise<void> {
    try {
      if (!prefix) {
        await this.client.flushdb();
        return;
      }

      // Use SCAN to clean keys matching a prefix without blocking the Redis event loop
      let cursor = '0';
      do {
        const reply = await this.client.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
        cursor = reply[0];
        const keys = reply[1];
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } while (cursor !== '0');
    } catch (error) {
      console.error(`Error clearing Redis cache with prefix [${prefix}]:`, error);
    }
  }

  // Get the underlying Redis instance (needed for BullMQ, WebSockets, etc.)
  getClient(): Redis {
    return this.client;
  }
}

// Global cache instance (single instance reused throughout the app)
export const cache = new RedisCacheService();
export const redisClient = cache.getClient();
