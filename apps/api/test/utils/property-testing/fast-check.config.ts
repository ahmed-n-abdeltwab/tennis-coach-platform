/**
 * fast-check Configuration for Property-Based Testing
 *
 * This configuration file defines the default settings for property-based tests
 * across the test infrastructure. It ensures consistent behavior and reproducibility
 * of property tests.
 */

import * as fc from 'fast-check';

/**
 * Default configuration for property-based tests
 *
 * @property numRuns - Number of iterations to run for each property (minimum 100)
 * @property verbose - Show detailed output on failure for debugging
 * @property seed - Random seed for reproducibility (defaults to current timestamp)
 * @property endOnFailure - Stop on first failure for faster feedback
 */
export const defaultPropertyTestConfig: fc.Parameters<unknown> = {
  numRuns: 100,
  verbose: true,
  seed: Date.now(),
  endOnFailure: true,
};

/**
 * Configuration for quick property tests (useful during development)
 * Runs fewer iterations for faster feedback
 */
export const quickPropertyTestConfig: fc.Parameters<unknown> = {
  numRuns: 20,
  verbose: true,
  seed: Date.now(),
  endOnFailure: true,
};

/**
 * Configuration for thorough property tests (useful for CI/CD)
 * Runs more iterations for comprehensive coverage
 */
export const thoroughPropertyTestConfig: fc.Parameters<unknown> = {
  numRuns: 500,
  verbose: true,
  seed: Date.now(),
  endOnFailure: false, // Run all tests to find multiple issues
};

/**
 * Helper function to run a property test with default configuration
 *
 * @param property - The property to test
 * @param config - Optional configuration overrides
 *
 * @example
 * ```typescript
 * runPropertyTest(
 *   fc.property(fc.string(), (str) => {
 *     expect(str.length).toBeGreaterThanOrEqual(0);
 *   })
 * );
 * ```
 */
export function runPropertyTest(
  property: fc.IProperty<unknown>,
  config?: Partial<fc.Parameters<unknown>>
): void {
  fc.assert(property, { ...defaultPropertyTestConfig, ...config });
}

/**
 * Get configuration based on environment
 * - CI: Use thorough configuration
 * - Development: Use default configuration
 */
export function getPropertyTestConfig(): fc.Parameters<unknown> {
  const isCI = process.env.CI === 'true';
  return isCI ? thoroughPropertyTestConfig : defaultPropertyTestConfig;
}
