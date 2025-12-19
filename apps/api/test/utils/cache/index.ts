/**
 * Cache Utilities
 *
 * Provides caching for frequently used test data to improve performance.
 *
 * Features:
 * - User and coach caching (by ID and email)
 * - Booking type caching
 * - Automatic cache invalidation
 * - Cache statistics and monitoring
 *
 * Note: DatabaseMixin automatically uses testDataCache internally for
 * getCachedUser() and getCachedCoach() methods. These exports are provided
 * for advanced use cases and monitoring.
 *
 * @example Caching test data
 * ```typescript
 * import { testDataCache } from '@test-utils/cache';
 *
 * // Cache a user
 * testDataCache.cacheUser(user);
 *
 * // Get cached user by ID
 * const cachedUser = testDataCache.getUser(userId);
 *
 * // Get cached user by email
 * const cachedUser = testDataCache.getUserByEmail('test@example.com');
 * ```
 *
 * @example Monitoring cache performance
 * ```typescript
 * import { testDataCache } from '@test-utils/cache';
 *
 * // Get cache statistics
 * const stats = testDataCache.getStats();
 * console.log(`Cache hits: ${stats.hits}`);
 * console.log(`Cache misses: ${stats.misses}`);
 * console.log(`Hit rate: ${stats.hitRate}%`);
 * ```
 *
 * @example Clearing cache
 * ```typescript
 * import { testDataCache } from '@test-utils/cache';
 *
 * // Clear all cached data
 * testDataCache.clear();
 *
 * // Clear specific cache
 * testDataCache.clearUsers();
 * testDataCache.clearCoaches();
 * ```
 *
 * @module cache
 */

export * from './test-data-cache';
