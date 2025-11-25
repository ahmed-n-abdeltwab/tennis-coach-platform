/**
 * JWT-specific generators for property-based testing
 *
 * These generators create random JWT payloads and related data
 * for testing authentication utilities.
 */

import * as fc from 'fast-check';

import { emailArbitrary, uuidArbitrary } from './common.generators';

/**
 * User roles in the system
 */
export const USER_ROLES = ['USER', 'COACH', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/**
 * Generate a valid user role
 */
export function userRoleArbitrary(): fc.Arbitrary<UserRole> {
  return fc.constantFrom(...USER_ROLES);
}

/**
 * Generate a basic JWT payload
 */
export function jwtPayloadArbitrary(): fc.Arbitrary<{
  sub: string;
  email: string;
  role: UserRole;
}> {
  return fc.record({
    sub: uuidArbitrary(),
    email: emailArbitrary(),
    role: userRoleArbitrary(),
  });
}

/**
 * Generate a JWT payload with expiration
 */
export function jwtPayloadWithExpirationArbitrary(): fc.Arbitrary<{
  sub: string;
  email: string;
  role: UserRole;
  exp: number;
  iat: number;
}> {
  return fc
    .record({
      sub: uuidArbitrary(),
      email: emailArbitrary(),
      role: userRoleArbitrary(),
      iat: fc.integer({
        min: Math.floor(Date.now() / 1000) - 3600,
        max: Math.floor(Date.now() / 1000),
      }),
    })
    .chain(base =>
      fc.integer({ min: base.iat + 60, max: base.iat + 86400 }).map(exp => ({
        ...base,
        exp,
      }))
    );
}

/**
 * Generate an expired JWT payload
 */
export function expiredJwtPayloadArbitrary(): fc.Arbitrary<{
  sub: string;
  email: string;
  role: UserRole;
  exp: number;
  iat: number;
}> {
  return fc
    .record({
      sub: uuidArbitrary(),
      email: emailArbitrary(),
      role: userRoleArbitrary(),
    })
    .chain(base => {
      const now = Math.floor(Date.now() / 1000);
      return fc.record({
        sub: fc.constant(base.sub),
        email: fc.constant(base.email),
        role: fc.constant(base.role),
        iat: fc.integer({ min: now - 7200, max: now - 3600 }),
        exp: fc.integer({ min: now - 3600, max: now - 60 }),
      });
    });
}

/**
 * Generate a JWT token string (mock format)
 * Note: This generates a mock JWT format for testing, not a real signed token
 */
export function jwtTokenStringArbitrary(): fc.Arbitrary<string> {
  return fc
    .tuple(
      fc.base64String({ minLength: 20, maxLength: 40 }),
      fc.base64String({ minLength: 20, maxLength: 40 }),
      fc.base64String({ minLength: 20, maxLength: 40 })
    )
    .map(([header, payload, signature]) => `${header}.${payload}.${signature}`);
}

/**
 * Generate authentication headers
 */
export function authHeadersArbitrary(): fc.Arbitrary<{ Authorization: string }> {
  return jwtTokenStringArbitrary().map(token => ({
    Authorization: `Bearer ${token}`,
  }));
}
