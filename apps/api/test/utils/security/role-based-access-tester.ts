import { INestApplication } from '@nestjs/common';
import { Role } from '@prisma/client';
import {
  Endpoints,
  ExtractMethods,
  ExtractPaths,
  ExtractRequestType,
  ExtractResponseType,
} from '@test-utils';
import { TypeSafeHttpClient, TypedResponse } from '../http/type-safe-http-client';

import { AuthTestHelper } from '../auth/auth-test-helper';

/**
 * HTTP methods supported by the API
 */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * Configuration for role-based access testing
 */
export interface RoleAccessConfig {
  /** Roles that should have access (expect 200/201) */
  allowedRoles: Role[];
  /** Roles that should be denied access (expect 403) */
  deniedRoles?: Role[];
  /** Expected status for allowed roles (defaults: 200 for GET/PUT/DELETE, 201 for POST) */
  successStatus?: number;
  /** Expected status for denied roles (defaults: 403) */
  deniedStatus?: number;
}

/**
 * Result of a role-based access test
 */
export interface RoleAccessTestResult {
  role: Role;
  success: boolean;
  status: number;
  expectedStatus: number;
  error?: string;
}

/**
 * Helper class for testing role-based access control
 *
 * This class provides utilities for testing that endpoints properly
 * enforce role-based access control across multiple roles automatically.
 *
 * @template E - The Endpoints interface type (defaults to auto-imported Endpoints)
 *
 * @example
 * ```typescript
 * const tester = new RoleBasedAccessTester(app);
 *
 * // Test that only ADMIN can access admin endpoints
 * await tester.testAccess('/api/admin/users', 'GET', {
 *   allowedRoles: [Role.ADMIN]
 * });
 *
 * // Test that USER and COACH can access sessions, but not ADMIN
 * await tester.testAccess('/api/sessions', 'GET', {
 *   allowedRoles: [Role.USER, Role.COACH],
 *   deniedRoles: [Role.ADMIN]
 * });
 *
 * // Test with custom data
 * await tester.testAccess('/api/sessions', 'POST', {
 *   allowedRoles: [Role.USER, Role.COACH]
 * }, {
 *   bookingTypeId: 'booking-123',
 *   timeSlotId: 'slot-456'
 * });
 * ```
 */
export class RoleBasedAccessTester<E extends Record<string, any> = Endpoints> {
  private authHelper: AuthTestHelper;
  private httpClient: TypeSafeHttpClient<E>;

  /**
   * Create a new RoleBasedAccessTester
   *
   * @param app - NestJS application instance
   * @param jwtSecret - Optional JWT secret (defaults to process.env.JWT_SECRET)
   */
  constructor(app: INestApplication, jwtSecret?: string) {
    this.authHelper = new AuthTestHelper(jwtSecret);
    this.httpClient = new TypeSafeHttpClient<E>(app);
  }

  /**
   * Test role-based access control for an endpoint
   *
   * Tests all specified roles and verifies that:
   * - Allowed roles receive success responses
   * - Denied roles receive 403 Forbidden
   *
   * @template P - The API path
   * @template M - The HTTP method
   * @param path - The API endpoint path
   * @param method - The HTTP method
   * @param config - Role access configuration
   * @param data - Optional request data
   * @returns Array of test results for each role
   *
   * @example
   * ```typescript
   * const results = await tester.testAccess('/api/admin/users', 'GET', {
   *   allowedRoles: [Role.ADMIN],
   *   deniedRoles: [Role.USER, Role.COACH]
   * });
   *
   * // All results should indicate success
   * results.forEach(result => {
   *   expect(result.success).toBe(true);
   * });
   * ```
   */
  async testAccess<P extends ExtractPaths<E>, M extends ExtractMethods<E, P>>(
    path: P,
    method: M,
    config: RoleAccessConfig,
    data?: ExtractRequestType<E, P, M>
  ): Promise<RoleAccessTestResult[]> {
    const { allowedRoles, deniedRoles = [], successStatus, deniedStatus = 403 } = config;
    const defaultSuccessStatus = method === 'POST' ? 201 : 200;
    const expectedSuccessStatus = successStatus || defaultSuccessStatus;

    const results: RoleAccessTestResult[] = [];

    // Test allowed roles
    for (const role of allowedRoles) {
      const result = await this.testRoleAccess(path, method, role, expectedSuccessStatus, data);
      results.push(result);
    }

    // Test denied roles
    for (const role of deniedRoles) {
      const result = await this.testRoleAccess(path, method, role, deniedStatus, data);
      results.push(result);
    }

    return results;
  }

  /**
   * Test access for all roles automatically
   *
   * Tests all available roles (USER, COACH, ADMIN, PREMIUM_USER) and
   * verifies access based on the allowed roles list.
   *
   * @template P - The API path
   * @template M - The HTTP method
   * @param path - The API endpoint path
   * @param method - The HTTP method
   * @param allowedRoles - Roles that should have access
   * @param data - Optional request data
   * @returns Array of test results for each role
   *
   * @example
   * ```typescript
   * // Test all roles, only ADMIN should succeed
   * const results = await tester.testAllRoles(
   *   '/api/admin/users',
   *   'GET',
   *   [Role.ADMIN]
   * );
   * ```
   */
  async testAllRoles<P extends ExtractPaths<E>, M extends ExtractMethods<E, P>>(
    path: P,
    method: M,
    allowedRoles: Role[],
    data?: ExtractRequestType<E, P, M>
  ): Promise<RoleAccessTestResult[]> {
    const allRoles = [Role.USER, Role.COACH, Role.ADMIN, Role.PREMIUM_USER];
    const deniedRoles = allRoles.filter(role => !allowedRoles.includes(role));

    return this.testAccess(path, method, { allowedRoles, deniedRoles }, data);
  }

  /**
   * Test that only specific roles can access an endpoint
   *
   * Convenience method that tests all roles and expects only the specified
   * roles to succeed.
   *
   * @template P - The API path
   * @template M - The HTTP method
   * @param path - The API endpoint path
   * @param method - The HTTP method
   * @param allowedRoles - Roles that should have access
   * @param data - Optional request data
   *
   * @example
   * ```typescript
   * // Only ADMIN should access admin endpoints
   * await tester.testOnlyRolesCanAccess(
   *   '/api/admin/users',
   *   'GET',
   *   [Role.ADMIN]
   * );
   * ```
   */
  async testOnlyRolesCanAccess<P extends ExtractPaths<E>, M extends ExtractMethods<E, P>>(
    path: P,
    method: M,
    allowedRoles: Role[],
    data?: ExtractRequestType<E, P, M>
  ): Promise<void> {
    const results = await this.testAllRoles(path, method, allowedRoles, data);

    // Verify all tests passed
    const failures = results.filter(r => !r.success);
    if (failures.length > 0) {
      const failureMessages = failures.map(
        f => `${f.role}: expected ${f.expectedStatus}, got ${f.status}`
      );
      throw new Error(`Role-based access test failed:\n${failureMessages.join('\n')}`);
    }
  }

  /**
   * Test that a role can access an endpoint
   *
   * @template P - The API path
   * @template M - The HTTP method
   * @param path - The API endpoint path
   * @param method - The HTTP method
   * @param role - The role to test
   * @param data - Optional request data
   * @returns Typed response
   *
   * @example
   * ```typescript
   * const response = await tester.testRoleCanAccess(
   *   '/api/sessions',
   *   'GET',
   *   Role.USER
   * );
   * expect(response.status).toBe(200);
   * ```
   */
  async testRoleCanAccess<P extends ExtractPaths<E>, M extends ExtractMethods<E, P>>(
    path: P,
    method: M,
    role: Role,
    data?: ExtractRequestType<E, P, M>
  ): Promise<TypedResponse<ExtractResponseType<E, P, M>>> {
    const token = this.createTokenForRole(role);
    const expectedStatus = method === 'POST' ? 201 : 200;

    return this.httpClient.request(path, method, data, {
      headers: { authorization: `Bearer ${token}` },
      expectedStatus,
    });
  }

  /**
   * Test that a role cannot access an endpoint
   *
   * @template P - The API path
   * @template M - The HTTP method
   * @param path - The API endpoint path
   * @param method - The HTTP method
   * @param role - The role to test
   * @param data - Optional request data
   * @param expectedStatus - Expected error status (defaults: 403)
   *
   * @example
   * ```typescript
   * await tester.testRoleCannotAccess(
   *   '/api/admin/users',
   *   'GET',
   *   Role.USER
   * );
   * ```
   */
  async testRoleCannotAccess<P extends ExtractPaths<E>, M extends ExtractMethods<E, P>>(
    path: P,
    method: M,
    role: Role,
    data?: ExtractRequestType<E, P, M>,
    expectedStatus: number = 403
  ): Promise<void> {
    const token = this.createTokenForRole(role);

    await this.httpClient.request(path, method, data, {
      headers: { authorization: `Bearer ${token}` },
      expectedStatus,
    });
  }

  /**
   * Test a single role's access to an endpoint
   * @private
   */
  private async testRoleAccess<P extends ExtractPaths<E>, M extends ExtractMethods<E, P>>(
    path: P,
    method: M,
    role: Role,
    expectedStatus: number,
    data?: ExtractRequestType<E, P, M>
  ): Promise<RoleAccessTestResult> {
    const token = this.createTokenForRole(role);

    try {
      const response = await this.httpClient.request(path, method, data, {
        headers: { authorization: `Bearer ${token}` },
        expectedStatus,
      });

      return {
        role,
        success: response.status === expectedStatus,
        status: response.status,
        expectedStatus,
      };
    } catch (error) {
      return {
        role,
        success: false,
        status: -1,
        expectedStatus,
        error: error instanceof Error ? error.message : String(error),
      };
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
   */
  getAuthHelper(): AuthTestHelper {
    return this.authHelper;
  }

  /**
   * Get the underlying TypeSafeHttpClient for advanced usage
   *
   * @returns The TypeSafeHttpClient instance
   */
  getHttpClient(): TypeSafeHttpClient<E> {
    return this.httpClient;
  }
}
