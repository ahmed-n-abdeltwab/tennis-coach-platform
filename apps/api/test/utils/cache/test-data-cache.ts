/**
 * Test Data Cache
 *
 * Caches frequently used test data to improve performance by:
 * - Avoiding redundant database queries
 * - Reusing common test entities
 * - Automatic cache invalidation
 * - Memory-efficient storage
 */

import { Account, BookingType, TimeSlot } from '@prisma/client';

export interface CacheEntry<T> {
  data: T;
  createdAt: Date;
  lastAccessedAt: Date;
  accessCount: number;
  ttl?: number; // Time to live in milliseconds
}

export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  cacheSize: number;
}

export class TestDataCache {
  private static instance: TestDataCache;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private hits = 0;
  private misses = 0;
  private maxSize = 100; // Maximum number of cache entries
  private defaultTtl = 300000; // 5 minutes default TTL

  private constructor() {}

  public static getInstance(): TestDataCache {
    if (!TestDataCache.instance) {
      TestDataCache.instance = new TestDataCache();
    }
    return TestDataCache.instance;
  }

  /**
   * Get data from cache
   */
  public get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Check if entry has expired
    if (entry.ttl) {
      const age = Date.now() - entry.createdAt.getTime();
      if (age > entry.ttl) {
        this.cache.delete(key);
        this.misses++;
        return undefined;
      }
    }

    // Update access stats
    entry.lastAccessedAt = new Date();
    entry.accessCount++;
    this.hits++;

    return entry.data as T;
  }

  /**
   * Set data in cache
   */
  public set<T>(key: string, data: T, ttl?: number): void {
    // Check cache size limit
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
   * Check if key exists in cache
   */
  public has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if expired
    if (entry.ttl) {
      const age = Date.now() - entry.createdAt.getTime();
      if (age > entry.ttl) {
        this.cache.delete(key);
        return false;
      }
    }

    return true;
  }

  /**
   * Delete entry from cache
   */
  public delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  public clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get or set cached data
   */
  public async getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const data = await factory();
    this.set(key, data, ttl);
    return data;
  }

  /**
   * Cache a test user
   */
  public cacheUser(user: Account): void {
    this.set(`user:${user.id}`, user);
    this.set(`user:email:${user.email}`, user);
  }

  /**
   * Get cached user by ID
   */
  public getUser(userId: string): Account | undefined {
    return this.get<Account>(`user:${userId}`);
  }

  /**
   * Get cached user by email
   */
  public getUserByEmail(email: string): Account | undefined {
    return this.get<Account>(`user:email:${email}`);
  }

  /**
   * Cache a test coach
   */
  public cacheCoach(coach: Account): void {
    this.set(`coach:${coach.id}`, coach);
    this.set(`coach:email:${coach.email}`, coach);
  }

  /**
   * Get cached coach by ID
   */
  public getCoach(coachId: string): Account | undefined {
    return this.get<Account>(`coach:${coachId}`);
  }

  /**
   * Get cached coach by email
   */
  public getCoachByEmail(email: string): Account | undefined {
    return this.get<Account>(`coach:email:${email}`);
  }

  /**
   * Cache a booking type
   */
  public cacheBookingType(bookingType: BookingType): void {
    this.set(`bookingType:${bookingType.id}`, bookingType);
  }

  /**
   * Get cached booking type
   */
  public getBookingType(bookingTypeId: string): BookingType | undefined {
    return this.get<BookingType>(`bookingType:${bookingTypeId}`);
  }

  /**
   * Cache a time slot
   */
  public cacheTimeSlot(timeSlot: TimeSlot): void {
    this.set(`timeSlot:${timeSlot.id}`, timeSlot);
  }

  /**
   * Get cached time slot
   */
  public getTimeSlot(timeSlotId: string): TimeSlot | undefined {
    return this.get<TimeSlot>(`timeSlot:${timeSlotId}`);
  }

  /**
   * Invalidate all user caches
   */
  public invalidateUsers(): void {
    const keys = Array.from(this.cache.keys()).filter(key => key.startsWith('user:'));
    keys.forEach(key => this.cache.delete(key));
  }

  /**
   * Invalidate all coach caches
   */
  public invalidateCoaches(): void {
    const keys = Array.from(this.cache.keys()).filter(key => key.startsWith('coach:'));
    keys.forEach(key => this.cache.delete(key));
  }

  /**
   * Invalidate all booking type caches
   */
  public invalidateBookingTypes(): void {
    const keys = Array.from(this.cache.keys()).filter(key => key.startsWith('bookingType:'));
    keys.forEach(key => this.cache.delete(key));
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats {
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? this.hits / totalRequests : 0;

    return {
      totalEntries: this.cache.size,
      totalHits: this.hits,
      totalMisses: this.misses,
      hitRate,
      cacheSize: this.calculateCacheSize(),
    };
  }

  /**
   * Set maximum cache size
   */
  public setMaxSize(maxSize: number): void {
    this.maxSize = maxSize;

    // Evict entries if current size exceeds new max
    while (this.cache.size > this.maxSize) {
      this.evictLeastRecentlyUsed();
    }
  }

  /**
   * Set default TTL
   */
  public setDefaultTtl(ttl: number): void {
    this.defaultTtl = ttl;
  }

  /**
   * Evict least recently used entry
   */
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

  /**
   * Calculate approximate cache size in bytes
   */
  private calculateCacheSize(): number {
    let size = 0;
    for (const entry of this.cache.values()) {
      // Rough estimation: JSON stringify the data
      size += JSON.stringify(entry.data).length;
    }
    return size;
  }

  /**
   * Clean up expired entries
   */
  public cleanupExpired(): number {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.ttl) {
        const age = now - entry.createdAt.getTime();
        if (age > entry.ttl) {
          toDelete.push(key);
        }
      }
    }

    toDelete.forEach(key => this.cache.delete(key));
    return toDelete.length;
  }
}

// Export singleton instance
export const testDataCache = TestDataCache.getInstance();
