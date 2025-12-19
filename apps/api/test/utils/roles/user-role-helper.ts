import { JwtPayload } from '@common';
import { Role } from '@prisma/client';

import { AuthHeaders, AuthTestHelper } from '../auth';

/**
 * Helper class for creating test users with different roles
 *
 * This class provides utilities for:
 * - Creating test user data for different roles
 * - Creating authentication headers for different roles
 * - Creating multiple users for testing scenarios
 * - Factory methods for common test scenarios
 *
 * @example
 * ```typescript
 * const roleHelper = new UserRoleHelper();
 *
 * // Create test user data
 * const user = roleHelper.createUserTestData(Role.USER);
 * const coach = roleHelper.createUserTestData(Role.COACH);
 *
 * // Create auth headers
 * const userHeaders = roleHelper.createRoleAuthHeaders(Role.USER);
 * const coachHeaders = roleHelper.createRoleAuthHeaders(Role.COACH);
 *
 * // Create multiple users
 * const { users, coaches } = roleHelper.createMultipleRoleUsers(3);
 * ```
 */
export class UserRoleHelper {
  private authHelper: AuthTestHelper;

  /**
   * Create a new UserRoleHelper
   *
   * @param jwtSecret - Optional JWT secret (defaults to process.env.JWT_SECRET)
   */
  constructor(jwtSecret?: string) {
    this.authHelper = new AuthTestHelper(jwtSecret);
  }

  /**
   * Create test user data for a specific role
   *
   * @param role - The role for the test user
   * @param overrides - Optional overrides for user data
   * @returns Test user data
   *
   * @example
   * ```typescript
   * const user = roleHelper.createUserTestData(Role.USER);
   * // { id: 'test-USER-id', email: 'USER@example.com', role: 'USER' }
   *
   * const customUser = roleHelper.createUserTestData(Role.USER, {
   *   id: 'custom-id',
   *   email: 'custom@example.com'
   * });
   * ```
   */
  createUserTestData(role: Role, overrides?: Partial<JwtPayload>): JwtPayload {
    const baseData: JwtPayload = {
      sub: `test-${role.toLowerCase()}-id`,
      email: `${role.toLowerCase()}@example.com`,
      role,
      ...overrides,
    };
    return baseData;
  }

  /**
   * Create authentication headers for a specific role
   *
   * @param role - The role for the authentication headers
   * @param overrides - Optional overrides for user data
   * @returns Authentication headers with Bearer token
   *
   * @example
   * ```typescript
   * const userHeaders = roleHelper.createRoleAuthHeaders(Role.USER);
   * const coachHeaders = roleHelper.createRoleAuthHeaders(Role.COACH);
   * const adminHeaders = roleHelper.createRoleAuthHeaders(Role.ADMIN);
   * ```
   */
  async createRoleAuthHeaders(role: Role, overrides?: Partial<JwtPayload>): Promise<AuthHeaders> {
    const userData = this.createUserTestData(role, overrides);
    return this.createAuthHeadersForJwtPayload(userData);
  }

  /**
   * Create multiple test users for different roles
   *
   * @param count - Number of users to create per role (defaults to 2)
   * @returns Object with arrays of users, coaches, admins, and premium users
   *
   * @example
   * ```typescript
   * const { users, coaches, admins, premiumUsers } = roleHelper.createMultipleRoleUsers(3);
   * // users: [user0, user1, user2]
   * // coaches: [coach0, coach1, coach2]
   * // admins: [admin0, admin1, admin2]
   * // premiumUsers: [premiumUsers0, premiumUsers1, premiumUsers2]
   * ```
   */
  async createMultipleRoleUsers(count = 2): Promise<{
    users: JwtPayload[];
    coaches: JwtPayload[];
    admins: JwtPayload[];
    premiumUsers: JwtPayload[];
  }> {
    const users: JwtPayload[] = [];
    const coaches: JwtPayload[] = [];
    const admins: JwtPayload[] = [];
    const premiumUsers: JwtPayload[] = [];

    for (let i = 0; i < count; i++) {
      users.push(
        this.createUserTestData(Role.USER, {
          sub: `test-user-${i}`,
          email: `user${i}@example.com`,
        })
      );

      coaches.push(
        this.createUserTestData(Role.COACH, {
          sub: `test-coach-${i}`,
          email: `coach${i}@example.com`,
        })
      );

      admins.push(
        this.createUserTestData(Role.ADMIN, {
          sub: `test-admin-${i}`,
          email: `admin${i}@example.com`,
        })
      );

      premiumUsers.push(
        this.createUserTestData(Role.PREMIUM_USER, {
          sub: `test-premium-user-${i}`,
          email: `premium${i}@example.com`,
        })
      );
    }

    return { users, coaches, admins, premiumUsers };
  }

  /**
   * Create multiple authentication headers for different roles
   *
   * @param count - Number of headers to create per role (defaults to 2)
   * @returns Object with arrays of headers for each role
   *
   * @example
   * ```typescript
   * const { userHeaders, coachHeaders, adminHeaders, premiumUserHeaders } = roleHelper.createMultipleRoleAuthHeaders(2);
   * // Use different user tokens for testing
   * await client.get('/api/sessions', undefined, { headers: userHeaders[0] });
   * await client.get('/api/sessions', undefined, { headers: userHeaders[1] });
   * ```
   */
  async createMultipleRoleAuthHeaders(count = 2): Promise<{
    userHeaders: AuthHeaders[];
    coachHeaders: AuthHeaders[];
    adminHeaders: AuthHeaders[];
    premiumUserHeaders: AuthHeaders[];
  }> {
    const { users, coaches, admins, premiumUsers } = await this.createMultipleRoleUsers(count);

    const userHeaders = await Promise.all(
      users.map(async user => await this.authHelper.createUserAuthHeaders(user))
    );
    const coachHeaders = await Promise.all(
      coaches.map(async coach => await this.authHelper.createCoachAuthHeaders(coach))
    );
    const adminHeaders = await Promise.all(
      admins.map(async admin => await this.authHelper.createAdminAuthHeaders(admin))
    );
    const premiumUserHeaders = await Promise.all(
      premiumUsers.map(async user => await this.authHelper.createPremiumUserAuthHeaders(user))
    );

    return { userHeaders, coachHeaders, adminHeaders, premiumUserHeaders };
  }

  /**
   * Create an Auth Headers for a specific Test User
   * @private
   */
  private async createAuthHeadersForJwtPayload(userData: JwtPayload): Promise<AuthHeaders> {
    switch (userData.role) {
      case Role.USER:
        return this.authHelper.createUserAuthHeaders(userData);
      case Role.PREMIUM_USER:
        return this.authHelper.createPremiumUserAuthHeaders(userData);
      case Role.COACH:
        return this.authHelper.createCoachAuthHeaders(userData);
      case Role.ADMIN:
        return this.authHelper.createAdminAuthHeaders(userData);
      default:
        throw new Error(`Unknown role: ${userData.role}`);
    }
  }

  /**
   * Factory method: Create a standard user for testing
   *
   * @returns Test user with USER role
   *
   * @example
   * ```typescript
   * const user = roleHelper.createStandardUser();
   * ```
   */
  async createStandardUser(): Promise<JwtPayload> {
    return this.createUserTestData(Role.USER);
  }

  /**
   * Factory method: Create a premium user for testing
   *
   * @returns Test user with PREMIUM_USER role
   *
   * @example
   * ```typescript
   * const premiumUser = roleHelper.createPremiumUser();
   * ```
   */
  async createPremiumUser(): Promise<JwtPayload> {
    return this.createUserTestData(Role.PREMIUM_USER);
  }

  /**
   * Factory method: Create a coach for testing
   *
   * @returns Test user with COACH role
   *
   * @example
   * ```typescript
   * const coach = roleHelper.createCoach();
   * ```
   */
  async createCoach(): Promise<JwtPayload> {
    return this.createUserTestData(Role.COACH);
  }

  /**
   * Factory method: Create an admin for testing
   *
   * @returns Test user with ADMIN role
   *
   * @example
   * ```typescript
   * const admin = roleHelper.createAdmin();
   * ```
   */
  async createAdmin(): Promise<JwtPayload> {
    return this.createUserTestData(Role.ADMIN);
  }

  /**
   * Factory method: Create auth headers for a standard user
   *
   * @returns Authentication headers for USER role
   *
   * @example
   * ```typescript
   * const headers = roleHelper.createStandardUserHeaders();
   * ```
   */
  async createStandardUserHeaders(): Promise<AuthHeaders> {
    return this.createRoleAuthHeaders(Role.USER);
  }

  /**
   * Factory method: Create auth headers for a premium user
   *
   * @returns Authentication headers for PREMIUM_USER role
   *
   * @example
   * ```typescript
   * const headers = roleHelper.createPremiumUserHeaders();
   * ```
   */
  async createPremiumUserHeaders(): Promise<AuthHeaders> {
    return this.createRoleAuthHeaders(Role.PREMIUM_USER);
  }

  /**
   * Factory method: Create auth headers for a coach
   *
   * @returns Authentication headers for COACH role
   *
   * @example
   * ```typescript
   * const headers = roleHelper.createCoachHeaders();
   * ```
   */
  async createCoachHeaders(): Promise<AuthHeaders> {
    return this.createRoleAuthHeaders(Role.COACH);
  }

  /**
   * Factory method: Create auth headers for an admin
   *
   * @returns Authentication headers for ADMIN role
   *
   * @example
   * ```typescript
   * const headers = roleHelper.createAdminHeaders();
   * ```
   */
  async createAdminHeaders(): Promise<AuthHeaders> {
    return this.createRoleAuthHeaders(Role.ADMIN);
  }

  /**
   * Get the underlying AuthTestHelper for advanced usage
   *
   * @returns The AuthTestHelper instance
   *
   * @example
   * ```typescript
   * const authHelper = roleHelper.getAuthHelper();
   * const customToken = authHelper.createToken({ sub: 'custom-id' });
   * ```
   */
  async getAuthHelper(): Promise<AuthTestHelper> {
    return this.authHelper;
  }
}
