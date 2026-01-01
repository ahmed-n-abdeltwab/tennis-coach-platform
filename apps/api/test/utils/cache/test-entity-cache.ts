/**
 * Test Entity Cache
 *
 * Internal cache used by DatabaseMixin to optimize test performance by:
 * - Avoiding redundant database queries for common test entities
 * - Reusing cached users, coaches, booking types
 * - Automatic cache invalidation on cleanup
 *
 * This is NOT a mock of Redis - it's a test infrastructure optimization.
 * For Redis mocking, see `utils/mocks/redis.mock.ts`
 */

import { Account } from '@prisma/client';

interface CacheEntry<T> {
  data: T;
  createdAt: Date;
  lastAccessedAt: Date;
  accessCount: number;
  ttl?: number;
}

export class TestEntityCache {
  private static instance: TestEntityCache;
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private maxSize = 100;
  private defaultTtl = 300000; // 5 minutes

  private constructor() {}

  public static getInstance(): TestEntityCache {
    if (!TestEntityCache.instance) {
      TestEntityCache.instance = new TestEntityCache();
    }
    return TestEntityCache.instance;
  }

  /**
   * Get data from cache
   */
  private get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (entry.ttl) {
      const age = Date.now() - entry.createdAt.getTime();
      if (age > entry.ttl) {
        this.cache.delete(key);
        return undefined;
      }
    }

    // Update access stats
    entry.lastAccessedAt = new Date();
    entry.accessCount++;

    return entry.data as T;
  }

  /**
   * Set data in cache
   */
  private set<T>(key: string, data: T, ttl?: number): void {
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLeastRecentlyUsed();
    }

    const entry: CacheEntry<T> = {
      data,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      accessCount: 0,
      ttl: ttl ?? this.defaultTtl,
    };

    this.cache.set(key, entry);
  }

  /**
   * Clear all cache entries
   */
  public clear(): void {
    this.cache.clear();
  }

  public cacheUser(user: Account): void {
    this.set(`user:${user.id}`, user);
    this.set(`user:email:${user.email}`, user);
  }

  public getUserByEmail(email: string): Account | undefined {
    return this.get<Account>(`user:email:${email}`);
  }

  public cacheCoach(coach: Account): void {
    this.set(`coach:${coach.id}`, coach);
    this.set(`coach:email:${coach.email}`, coach);
  }

  public getCoachByEmail(email: string): Account | undefined {
    return this.get<Account>(`coach:email:${email}`);
  }

  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | undefined;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      const lastAccessed = entry.lastAccessedAt.getTime();
      if (lastAccessed < oldestTime) {
        oldestTime = lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}

// Export singleton instance
export const testEntityCache = TestEntityCache.getInstance();
