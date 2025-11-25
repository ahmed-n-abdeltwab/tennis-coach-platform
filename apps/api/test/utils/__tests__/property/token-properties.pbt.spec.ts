/**
 * Property-Based Tests for JWT Token Operations
 *
 * Thess tokes validate correctness properties for JWT token creation,
 * verification, and decoding across a wide range of inputs.
 */

import * as fc from 'fast-check';

import { AuthTestHelper } from '../../auth/auth-test-helper';
import { jwtPayloadArbitrary, roleArbitrary } from '../../property-testing';

describe('Property-Based Tests: JWT Token Operations', () => {
  let authHelper: AuthTestHelper;

  beforeEach(() => {
    authHelper = new AuthTestHelper();
  });

  describe('Property 3: Token creation round-trip consistency', () => {
    /**
     * **Feature: test-infrastructure-improvement, Property 3: Token creation round-trip consistency**
     * **Validates: Requirements 2.5, 10.2**
     *
     * For any valid JWT payload, creating a token and then decoding it should
     * return a payload that matches the original input.
     */
    it('should decode to original payload for any valid JWT payload', async () => {
      await fc.assert(
        fc.asyncProperty(jwtPayloadArbitrary(), async payload => {
          // Create token from payload
          const token = await authHelper.createToken(payload);

          // Decode token
          const decoded = await authHelper.decodeToken(token);

          // Verify decoded payload matches original
          expect(decoded).not.toBeNull();
          expect(decoded?.sub).toBe(payload.sub);
          expect(decoded?.email).toBe(payload.email);
          expect(decoded?.role).toBe(payload.role);
        }),
        { numRuns: 100, verbose: true }
      );
    });
  });

  describe('Property 12: Role tokens contain correct role', () => {
    /**
     * **Feature: test-infrastructure-improvement, Property 12: Role tokens contain correct role**
     * **Validates: Requirements 6.1**
     *
     * For any role, creating a role-specific token should produce a token
     * whose decoded payload contains that exact role.
     */
    it('should create tokens with correct role for any role type', async () => {
      await fc.assert(
        fc.asyncProperty(roleArbitrary(), async role => {
          // Create role-specific token
          const token = await authHelper.createRoleToken(role);

          // Decode token
          const decoded = await authHelper.decodeToken(token);

          // Verify role matches
          expect(decoded).not.toBeNull();
          expect(decoded?.role).toBe(role);
        }),
        { numRuns: 100, verbose: true }
      );
    });
  });

  describe('Property 13: Token verification validates correctly', () => {
    /**
     * **Feature: test-infrastructure-improvement, Property 13: Token verification validates correctly**
     * **Validates: Requirements 6.3**
     *
     * For any valid token, verification should succeed and return the payload.
     * For any invalid or expired token, verification should fail and return null.
     */
    it('should verify valid tokens successfully', async () => {
      await fc.assert(
        fc.asyncProperty(jwtPayloadArbitrary(), async payload => {
          // Create valid token
          const token = await authHelper.createToken(payload);

          // Verify token
          const verified = await authHelper.verifyToken(token);

          // Should succeed
          expect(verified).not.toBeNull();
          expect(verified?.sub).toBe(payload.sub);
          expect(verified?.email).toBe(payload.email);
          expect(verified?.role).toBe(payload.role);
        }),
        { numRuns: 100, verbose: true }
      );
    });

    it('should reject expired tokens', async () => {
      await fc.assert(
        fc.asyncProperty(jwtPayloadArbitrary(), async payload => {
          // Create expired token
          const token = await authHelper.createExpiredToken(payload);

          // Verify token
          const verified = await authHelper.verifyToken(token);

          // Should fail
          expect(verified).toBeNull();
        }),
        { numRuns: 100, verbose: true }
      );
    });
  });

  describe('Property 14: Authentication headers are properly formatted', () => {
    /**
     * **Feature: test-infrastructure-improvement, Property 14: Authentication headers are properly formatted**
     * **Validates: Requirements 6.4**
     *
     * For any token, creating authentication headers should produce an object
     * with an Authorization field formatted as "Bearer <token>".
     */
    it('should format auth headers correctly for any token', async () => {
      await fc.assert(
        fc.asyncProperty(jwtPayloadArbitrary(), async payload => {
          // Create token
          const token = await authHelper.createToken(payload);

          // Create auth headers
          const headers = await authHelper.createAuthHeaders(token);

          // Verify format
          expect(headers).toHaveProperty('Authorization');
          expect(headers.Authorization).toMatch(/^Bearer .+$/);
          expect(headers.Authorization).toBe(`Bearer ${token}`);
        }),
        { numRuns: 100, verbose: true }
      );
    });

    it('should format auth headers for all role types', async () => {
      await fc.assert(
        fc.asyncProperty(roleArbitrary(), async role => {
          // Create role-specific headers
          const headers = await authHelper.createRoleAuthHeaders(role);

          // Verify format
          expect(headers).toHaveProperty('Authorization');
          expect(headers.Authorization).toMatch(/^Bearer .+$/);

          // Extract and verify token
          const token = headers.Authorization.substring(7);
          const decoded = await authHelper.decodeToken(token);
          expect(decoded?.role).toBe(role);
        }),
        { numRuns: 100, verbose: true }
      );
    });
  });
});
