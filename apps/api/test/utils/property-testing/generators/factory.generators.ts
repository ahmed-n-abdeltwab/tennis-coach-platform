/**
 * Factory-specific generators for property-based testing
 *
 * These generators create random factory inputs and overrides
 * for testing mock factory operations.
 */

import * as fc from 'fast-check';

import { partialUserEntityArbitrary } from './database.generators';

/**
 * Generate factory override options
 * These are partial objects that can override factory defaults
 */
export function factoryOverridesArbitrary<T>(): fc.Arbitrary<Partial<T>> {
  return fc.dictionary(
    fc.string({ minLength: 1, maxLength: 20 }),
    fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null), fc.constant(undefined))
  ) as fc.Arbitrary<Partial<T>>;
}

/**
 * Generate a count for createMany operations
 */
export function createManyCountArbitrary(): fc.Arbitrary<number> {
  return fc.integer({ min: 1, max: 20 });
}

/**
 * Generate user factory overrides
 */
export function userFactoryOverridesArbitrary(): fc.Arbitrary<
  Partial<{
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  }>
> {
  return partialUserEntityArbitrary();
}

/**
 * Generate coach factory overrides
 */
export function coachFactoryOverridesArbitrary(): fc.Arbitrary<
  Partial<{
    bio: string;
    hourlyRate: number;
  }>
> {
  return fc.record({
    bio: fc.option(fc.string({ maxLength: 500 })),
    hourlyRate: fc.option(fc.integer({ min: 10, max: 500 })),
  });
}

/**
 * Generate session factory overrides
 */
export function sessionFactoryOverridesArbitrary(): fc.Arbitrary<
  Partial<{
    title: string;
    description: string;
    duration: number;
    price: number;
  }>
> {
  return fc.record({
    title: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
    description: fc.option(fc.string({ maxLength: 1000 })),
    duration: fc.option(fc.constantFrom(30, 60, 90, 120)),
    price: fc.option(fc.integer({ min: 10, max: 500 })),
  });
}

/**
 * Generate booking factory overrides
 */
export function bookingFactoryOverridesArbitrary(): fc.Arbitrary<
  Partial<{
    status: string;
  }>
> {
  return fc.record({
    status: fc.option(fc.constantFrom('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED')),
  });
}

/**
 * Generate invalid factory data (for testing validation)
 */
export function invalidFactoryDataArbitrary(): fc.Arbitrary<Record<string, unknown>> {
  return fc.dictionary(
    fc.string({ minLength: 1, maxLength: 20 }),
    fc.oneof(
      fc.constant(null),
      fc.constant(undefined),
      fc.constant(''),
      fc.constant(-1),
      fc.constant({}),
      fc.constant([])
    )
  );
}

/**
 * Generate a factory entity type
 */
export function factoryEntityTypeArbitrary(): fc.Arbitrary<
  'user' | 'coach' | 'session' | 'booking'
> {
  return fc.constantFrom('user', 'coach', 'session', 'booking');
}
