/**
 * Performance Monitoring Utilities
 *
 * Provides tools for tracking and reporting test performance including:
 * - Test execution time tracking
 * - Database operation timing
 * - Slow test detection and warnings
 * - Performance reports and statistics
 *
 * These utilities remain recommended for monitoring test suite performance
 * and identifying performance bottlenecks.
 *
 * @example Tracking database operations
 * ```typescript
 * import { performanceMonitor } from '@test-utils/performance';
 *
 * await performanceMonitor.trackDatabaseOperation('create-user', async () => {
 *   return await prisma.account.create({ data: userData });
 * });
 * ```
 *
 * @example Tracking test execution
 * ```typescript
 * import { performanceMonitor } from '@test-utils/performance';
 *
 * await performanceMonitor.trackTest('user-creation-test', async () => {
 *   // Test code here
 * });
 * ```
 *
 * @example Generating performance reports
 * ```typescript
 * import { performanceMonitor } from '@test-utils/performance';
 *
 * const report = performanceMonitor.generateReport();
 * console.log(report);
 * // Shows slowest operations, average times, etc.
 * ```
 *
 * @module performance
 */

export * from './test-performance-monitor';
