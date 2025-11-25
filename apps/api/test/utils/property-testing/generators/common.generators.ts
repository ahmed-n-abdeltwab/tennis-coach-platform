/**
 * Common generators (arbitraries) for property-based testing
 *
 * These generators create random test data for common types used
 * throughout the test infrastructure.
 */

import * as fc from 'fast-check';

/**
 * Generate a valid UUID v4 string
 */
export function uuidArbitrary(): fc.Arbitrary<string> {
  return fc.uuid();
}

/**
 * Generate a valid email address
 */
export function emailArbitrary(): fc.Arbitrary<string> {
  return fc.emailAddress();
}

/**
 * Generate a non-empty string
 */
export function nonEmptyStringArbitrary(): fc.Arbitrary<string> {
  return fc.string({ minLength: 1, maxLength: 100 });
}

/**
 * Generate a valid URL
 */
export function urlArbitrary(): fc.Arbitrary<string> {
  return fc.webUrl();
}

/**
 * Generate a positive integer
 */
export function positiveIntegerArbitrary(): fc.Arbitrary<number> {
  return fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER });
}

/**
 * Generate a timestamp (Date object)
 */
export function timestampArbitrary(): fc.Arbitrary<Date> {
  return fc.date();
}

/**
 * Generate a future timestamp
 */
export function futureTimestampArbitrary(): fc.Arbitrary<Date> {
  const now = Date.now();
  return fc.date({ min: new Date(now), max: new Date(now + 365 * 24 * 60 * 60 * 1000) });
}

/**
 * Generate a past timestamp
 */
export function pastTimestampArbitrary(): fc.Arbitrary<Date> {
  const now = Date.now();
  return fc.date({ min: new Date(now - 365 * 24 * 60 * 60 * 1000), max: new Date(now) });
}

/**
 * Generate a valid phone number (simple format)
 */
export function phoneNumberArbitrary(): fc.Arbitrary<string> {
  return fc
    .tuple(
      fc.integer({ min: 100, max: 999 }),
      fc.integer({ min: 100, max: 999 }),
      fc.integer({ min: 1000, max: 9999 })
    )
    .map(([area, prefix, line]) => `+1${area}${prefix}${line}`);
}

/**
 * Generate a valid ISO 8601 date string
 */
export function isoDateStringArbitrary(): fc.Arbitrary<string> {
  return fc.date().map(date => date.toISOString());
}

/**
 * Generate an object with string keys and values
 */
export function stringRecordArbitrary(): fc.Arbitrary<Record<string, string>> {
  return fc.dictionary(fc.string({ minLength: 1, maxLength: 20 }), fc.string({ maxLength: 100 }));
}

/**
 * Generate a nullable value
 */
export function nullableArbitrary<T>(arbitrary: fc.Arbitrary<T>): fc.Arbitrary<T | null> {
  return fc.option(arbitrary, { nil: null });
}

/**
 * Generate an optional value (undefined or value)
 */
export function optionalArbitrary<T>(arbitrary: fc.Arbitrary<T>): fc.Arbitrary<T | undefined> {
  return fc.option(arbitrary, { nil: undefined });
}
