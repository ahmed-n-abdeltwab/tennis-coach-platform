/**
 * Property-Based Testing Utilities
 *
 * Provides configuration, generators (arbitraries), and helpers for
 * property-based testing using the fast-check library.
 *
 * Property-based testing validates that properties hold true across
 * many randomly generated inputs, providing stronger correctness guarantees
 * than example-based tests.
 *
 * This module includes:
 * - defaultPropertyTestConfig: Recommended configuration for property tests
 * - Custom generators (arbitraries) for domain objects:
 *   - jwtPayloadArbitrary: Generate JWT payloads
 *   - accountArbitrary: Generate account objects
 *   - sessionArbitrary: Generate session objects
 *   - bookingTypeArbitrary: Generate booking type objects
 *   - And more...
 *
 * These utilities are essential for implementing correctness properties
 * from the design document and remain the recommended approach for
 * property-based testing.
 *
 * @example Basic property test
 * ```typescript
 * import { defaultPropertyTestConfig } from '@test-utils/property-testing';
 * import * as fc from 'fast-check';
 *
 * it('should maintain token round-trip consistency', () => {
 *   fc.assert(
 *     fc.property(fc.string(), async (input) => {
 *       const encoded = encode(input);
 *       const decoded = decode(encoded);
 *       expect(decoded).toBe(input);
 *     }),
 *     defaultPropertyTestConfig
 *   );
 * });
 * ```
 *
 * @example Using custom generators
 * ```typescript
 * import { jwtPayloadArbitrary, defaultPropertyTestConfig } from '@test-utils/property-testing';
 * import * as fc from 'fast-check';
 *
 * it('should create valid tokens for any payload', () => {
 *   fc.assert(
 *     fc.property(jwtPayloadArbitrary(), async (payload) => {
 *       const token = await authHelper.createToken(payload);
 *       expect(token).toBeDefined();
 *       expect(typeof token).toBe('string');
 *     }),
 *     defaultPropertyTestConfig
 *   );
 * });
 * ```
 *
 * @module property-testing
 */

/**
 * Custom generators (arbitraries) for domain objects
 *
 * Provides fast-check arbitraries for generating random test data
 * that conforms to domain constraints.
 */
export * from './custom-generators';

/**
 * fast-check configuration
 *
 * Provides recommended configuration for property-based tests including:
 * - Number of test runs (default: 100)
 * - Seed for reproducibility
 * - Timeout settings
 * - Verbose mode options
 */
export * from './fast-check.config';
