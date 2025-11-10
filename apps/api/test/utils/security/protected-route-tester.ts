import { INestApplication } from '@nestjs/common';
import { Role } from '@prisma/client';
import {
  Endpoints,
  ExtractMethods,
  ExtractPaths,
  ExtractRequestType,
  ExtractResponseType,
} from '@test-utils';

import { AuthTestHelper } from '../auth/auth-test-helper';
import { TypeSafeHttpClient, TypedResponse } from '../http/type-safe-http-client';


/**
 * Helper class for testing protected routes
 *
 * This class provides utilities for testing authentication and Authorization:
 * - Test that routes require authentication
 * - Test that routes reject expired tokens
 * - Test that routes accept valid tokens
 * - Test role-based access control
 *
 * @template E - The Endpoints interface type (defaults to auto-imported Endpoints)
 *
 * @example
 * ```typescript
 * const tester = new ProtectedRouteTester(app);
 *
 * // Test that endpoint requires authentication
 * await tester.testRequiresAuth('/api/sessions', 'GET');
 *
 * // Test that endpoint rejects expired tokens
 * await tester.testRejectsExpiredToken('/api/sessions', 'GET');
 *
 * // Test that endpoint accepts valid user token
 * await tester.testAcceptsUserToken('/api/sessions', 'GET');
 *
 * // Test role-based access
 * await tester.testRoleBasedAccess(
 *   '/api/admin/users',
 *   [Role.ADMIN],
 *   'GET'
 * );
 * ```
 */
export class ProtectedRouteTester<E extends Record<string, any> = Endpoints> {
  private authHelper: AuthTestHelper;
  private httpClient: TypeSafeHttpClient<E>;

  /**
   * Create a new ProtectedRouteTester
   *
   * @param app - NestJS application instance
   * @param jwtSecret - Optional JWT secret (defaults to process.env.JWT_SECRET)
   */
  constructor(app: INestApplication, jwtSecret?: string) {
    this.authHelper = new AuthTestHelper(jwtSecret);
    this.httpClient = new TypeSafeHttpClient<E>(app);
  }

  /**
   * Test that an endpoint requires authentication
   *
   * Makes a request without authentication headers and expects 401 Unauthorized
   *
   * @template P - The API path
   * @template M - The HTTP method
   * @param path - The API endpoint path
   * @param method - The HTTP method
   * @param data - Optional request data (body for POST/PUT/PATCH, params for GET/DELETE)
   *
   * @example
   * ```typescript
   * // Test GET endpoint requires auth
   * await tester.testRequiresAuth('/api/sessions', 'GET');
   *
   * // Test POST endpoint requires auth
   * await tester.testRequiresAuth('/api/sessions', 'POST', {
   *   bookingTypeId: 'booking-123'
   * });
   * ```
   */
  async testRequiresAuth<P extends ExtractPaths<E>, M extends ExtractMethods<E, P>>(
    path: P,
    method: M,
    data?: ExtractRequestType<E, P, M>
  ): Promise<void> {
    await this.httpClient.request(path, method, data, {
      expectedStatus: 401,
    });
  }

  /**
   * Test that an endpoint rejects expired tokens
   *
   * Makes a request with an expired JWT token and expects 401 Unauthorized
   *
   * @template P - The API path
   * @template M - The HTTP method
   * @param path - The API endpoint path
   * @param method - The HTTP method
   * @param data - Optional request data
   *
   * @example
   * ```typescript
   * await tester.testRejectsExpiredToken('/api/sessions', 'GET');
   * ```
   */
  async testRejectsExpiredToken<P extends ExtractPaths<E>, M extends ExtractMethods<E, P>>(
    path: P,
    method: M,
    data?: ExtractRequestType<E, P, M>
  ): Promise<void> {
    const expiredToken = this.authHelper.createExpiredToken();

    await this.httpClient.request(path, method, data, {
      headers: { Authorization: `Bearer ${expiredToken}` },
      expectedStatus: 401,
    });
  }

  /**
   * Test that an endpoint accepts a valid USER token
   *
   * Makes a request with a valid USER token and expects success (200/201)
   *
   * @template P - The API path
   * @template M - The HTTP method
   * @param path - The API endpoint path
   * @param method - The HTTP method
   * @param data - Optional request data
   * @param expectedStatus - Expected success status (defaults: 200 for GET/PUT/DELETE, 201 for POST)
   * @returns Typed response
   *
   * @example
   * ```typescript
   * const response = await tester.testAcceptsUserToken('/api/sessions', 'GET');
   * expect(response.body).toBeDefined();
   * ```
   */
  async testAcceptsUserToken<P extends ExtractPaths<E>, M extends ExtractMethods<E, P>>(
    path: P,
    method: M,
    data?: ExtractRequestType<E, P, M>,
    expectedStatus?: number
  ): Promise<TypedResponse<ExtractResponseType<E, P, M>>> {
    const userToken = this.authHelper.createUserToken();
    const defaultStatus = method === 'POST' ? 201 : 200;

    return this.httpClient.request(path, method, data, {
      headers: { Authorization: `Bearer ${userToken}` },
      expectedStatus: expectedStatus || defaultStatus,
    });
  }

  /**
   * Test that an endpoint accepts a valid COACH token
   *
   * Makes a request with a valid COACH token and expects success (200/201)
   *
   * @template P - The API path
   * @template M - The HTTP method
   * @param path - The API endpoint path
   * @param method - The HTTP method
   * @param data - Optional request data
   * @param expectedStatus - Expected success status (defaults: 200 for GET/PUT/DELETE, 201 for POST)
   * @returns Typed response
   *
   * @example
   * ```typescript
   * const response = await tester.testAcceptsCoachToken('/api/sessions', 'GET');
   * expect(response.body).toBeDefined();
   * ```
   */
  async testAcceptsCoachToken<P extends ExtractPaths<E>, M extends ExtractMethods<E, P>>(
    path: P,
    method: M,
    data?: ExtractRequestType<E, P, M>,
    expectedStatus?: number
  ): Promise<TypedResponse<ExtractResponseType<E, P, M>>> {
    const coachToken = this.authHelper.createCoachToken();
    const defaultStatus = method === 'POST' ? 201 : 200;

    return this.httpClient.request(path, method, data, {
      headers: { Authorization: `Bearer ${coachToken}` },
      expectedStatus: expectedStatus || defaultStatus,
    });
  }

  /**
   * Test that an endpoint accepts a valid ADMIN token
   *
   * Makes a request with a valid ADMIN token and expects success (200/201)
   *
   * @template P - The API path
   * @template M - The HTTP method
   * @param path - The API endpoint path
   * @param method - The HTTP method
   * @param data - Optional request data
   * @param expectedStatus - Expected success status (defaults: 200 for GET/PUT/DELETE, 201 for POST)
   * @returns Typed response
   *
   * @example
   * ```typescript
   * const response = await tester.testAcceptsAdminToken('/api/admin/users', 'GET');
   * expect(response.body).toBeDefined();
   * ```
   */
  async testAcceptsAdminToken<P extends ExtractPaths<E>, M extends ExtractMethods<E, P>>(
    path: P,
    method: M,
    data?: ExtractRequestType<E, P, M>,
    expectedStatus?: number
  ): Promise<TypedResponse<ExtractResponseType<E, P, M>>> {
    const adminToken = this.authHelper.createAdminToken();
    const defaultStatus = method === 'POST' ? 201 : 200;

    return this.httpClient.request(path, method, data, {
      headers: { Authorization: `Bearer ${adminToken}` },
      expectedStatus: expectedStatus || defaultStatus,
    });
  }

  /**
   * Test role-based access control for an endpoint
   *
   * Tests that:
   * - Allowed roles receive success responses (200/201)
   * - Disallowed roles receive 403 Forbidden
   *
   * @template P - The API path
   * @template M - The HTTP method
   * @param path - The API endpoint path
   * @param allowedRoles - Array of roles that should have access
   * @param method - The HTTP method
   * @param data - Optional request data
   *
   * @example
   * ```typescript
   * // Test that only ADMIN can access admin endpoints
   * await tester.testRoleBasedAccess(
   *   '/api/admin/users',
   *   [Role.ADMIN],
   *   'GET'
   * );
   *
   * // Test that both USER and COACH can access sessions
   * await tester.testRoleBasedAccess(
   *   '/api/sessions',
   *   [Role.USER, Role.COACH],
   *   'GET'
   * );
   * ```
   */
  async testRoleBasedAccess<P extends ExtractPaths<E>, M extends ExtractMethods<E, P>>(
    path: P,
    allowedRoles: Role[],
    method: M,
    data?: ExtractRequestType<E, P, M>
  ): Promise<void> {
    const roles = [Role.USER, Role.COACH, Role.ADMIN, Role.PREMIUM_USER] as const;

    for (const role of roles) {
      const token = this.createTokenForRole(role);

      const isAllowed = allowedRoles.includes(role);
      const expectedStatus = isAllowed ? (method === 'POST' ? 201 : 200) : 403;

      await this.httpClient.request(path, method, data, {
        headers: { Authorization: `Bearer ${token}` },
        expectedStatus,
      });
    }
  }

  /**
   * Create a token for a specific role
   * @private
   */
  private createTokenForRole(role: Role): string {
    switch (role) {
      case Role.USER:
        return this.authHelper.createUserToken();
      case Role.COACH:
        return this.authHelper.createCoachToken();
      case Role.ADMIN:
        return this.authHelper.createAdminToken();
      case Role.PREMIUM_USER:
        return this.authHelper.createPremiumUserToken();
      default:
        throw new Error(`Unknown role: ${role}`);
    }
  }

  /**
   * Get the underlying AuthTestHelper for advanced usage
   *
   * @returns The AuthTestHelper instance
   *
   * @example
   * ```typescript
   * const authHelper = tester.getAuthHelper();
   * const customToken = authHelper.createToken({ sub: 'custom-id' });
   * ```
   */
  getAuthHelper(): AuthTestHelper {
    return this.authHelper;
  }

  /**
   * Get the underlying TypeSafeHttpClient for advanced usage
   *
   * @returns The TypeSafeHttpClient instance
   *
   * @example
   * ```typescript
   * const httpClient = tester.getHttpClient();
   * const response = await httpClient.get('/api/public/health');
   * ```
   */
  getHttpClient(): TypeSafeHttpClient<E> {
    return this.httpClient;
  }
}
