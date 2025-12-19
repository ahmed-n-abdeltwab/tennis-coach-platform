/**
 * Common Helper Functions
 *
 * Shared utility functions used across test infrastructure
 */

import { TEST_ENV_CONSTANTS } from '../constants/test-constants';
import { createDatabaseError } from '../errors/test-infrastructure-errors';

/**
 * Validates that the current environment is 'test'
 * @throws Error if not in test environment
 */
export function validateTestEnvironment(): void {
  if (process.env.NODE_ENV !== TEST_ENV_CONSTANTS.REQUIRED_ENV) {
    throw createDatabaseError(
      'validate environment',
      'TestDatabaseManager can only be used in test environment',
      {
        currentEnvironment: process.env.NODE_ENV ?? 'undefined',
        expectedEnvironment: TEST_ENV_CONSTANTS.REQUIRED_ENV,
      }
    );
  }
}

/**
 * Waits for a condition to become true
 * @param condition - Function that returns boolean or Promise<boolean>
 * @param timeout - Maximum time to wait in milliseconds
 * @param interval - Polling interval in milliseconds
 * @throws Error if condition not met within timeout
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  timeout: number = TEST_ENV_CONSTANTS.CONDITION_TIMEOUT_MS,
  interval: number = TEST_ENV_CONSTANTS.CONDITION_INTERVAL_MS
): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error('Condition not met within timeout');
}

/**
 * Generates a unique identifier with timestamp and random component
 * @param prefix - Prefix for the identifier
 * @returns Unique identifier string
 */
export function generateUniqueId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Sanitizes a string for use in database names (removes special characters)
 * @param input - String to sanitize
 * @returns Sanitized string with only alphanumeric and underscores
 */
export function sanitizeForDatabaseName(input: string): string {
  return input.replace(/[^a-zA-Z0-9]/g, '_');
}

/**
 * Creates a promise that rejects after a timeout
 * @param timeoutMs - Timeout in milliseconds
 * @param errorMessage - Error message for timeout
 * @returns Promise that rejects after timeout
 */
export function createTimeoutPromise(timeoutMs: number, errorMessage: string): Promise<never> {
  return new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
  );
}

/**
 * Truncates a string to a maximum length for security/logging purposes
 * @param str - String to truncate
 * @param maxLength - Maximum length
 * @returns Truncated string with ellipsis if needed
 */
export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return `${str.substring(0, maxLength)}...`;
}

/**
 * Calculates a future date by adding hours
 * @param offsetHours - Number of hours to add
 * @returns Future date
 */
export function getFutureDate(offsetHours: number): Date {
  return new Date(Date.now() + offsetHours * 60 * 60 * 1000);
}

/**
 * Calculates a future date by adding days
 * @param offsetDays - Number of days to add
 * @returns Future date
 */
export function getFutureDateByDays(offsetDays: number): Date {
  return new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
}

/**
 * Generates a unique email address for testing
 * @param prefix - Email prefix (e.g., 'test-user', 'test-coach')
 * @param domain - Email domain (defaults to 'example.com')
 * @returns Unique email address
 */
export function generateUniqueEmail(prefix: string, domain = 'example.com'): string {
  return `${prefix}-${Date.now()}@${domain}`;
}

/**
 * Checks if a value is defined (not null or undefined)
 * @param value - Value to check
 * @returns True if value is defined
 * @deprecated Use isDefined from '@test-utils/types' instead
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Safely extracts a nested property from an object
 * @param obj - Object to extract from
 * @param path - Dot-separated path (e.g., 'user.profile.name')
 * @returns Extracted value or undefined
 */
export function getNestedProperty(obj: any, path: string): any {
  const fields = path.split('.');
  let value = obj;
  for (const field of fields) {
    value = value?.[field];
    if (value === undefined) {
      return undefined;
    }
  }
  return value;
}
