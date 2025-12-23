/**
 * Test Infrastructure Helpers
 *
 * Provides common helper functions for test data generation and manipulation.
 *
 * Includes:
 * - generateUniqueEmail: Generate unique email addresses for test users
 * - getFutureDate: Get a date in the future (for scheduling tests)
 * - getFutureDateByDays: Get a date N days in the future
 * - generateUniqueId: Generate unique identifiers
 * - sanitizeForDatabaseName: Sanitize strings for database names
 * - waitForCondition: Wait for a condition to be true (async polling)
 * - truncateString: Truncate strings with ellipsis
 * - getNestedProperty: Safely extract nested properties
 *
 * @example
 * ```typescript
 * import { generateUniqueEmail, getFutureDate } from '@test-infrastructure/helpers';
 *
 * const email = generateUniqueEmail('test-user');
 * const futureDate = getFutureDate(24); // 24 hours from now
 * ```
 *
 * @module infrastructure/helpers
 */

export {
  createTimeoutPromise,
  generateUniqueEmail,
  generateUniqueId,
  getFutureDate,
  getFutureDateByDays,
  getNestedProperty,
  sanitizeForDatabaseName,
  truncateString,
  validateTestEnvironment,
  waitForCondition,
} from './common-helpers';
