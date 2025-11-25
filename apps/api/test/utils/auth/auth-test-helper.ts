import { JwtPayload } from '@common';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { parseJwtTime } from '@utils';

import { AuthenticatedHttpClient } from '../auth/authenticated-client';
import { DEFAULT_TEST_USER, HTTP_CONSTANTS, JWT_CONSTANTS } from '../constants';

/**
 * Authentication headers structure
 */
export interface AuthHeaders {
  Authorization: string;
}

/**
 * Helper class for creating and managing JWT tokens in tests
 *
 * This class provides utilities for:
 * - Creating JWT tokens with custom payloads
 * - Creating role-specific tokens (USER, COACH, ADMIN, etc.)
 * - Creating expired tokens for testing authentication failures
 * - Creating authentication headers
 * - Decoding and verifying tokens
 *
 * @example
 * ```typescript
 * const authHelper = new AuthTestHelper();
 *
 * // Create a user token
 * const userToken = authHelper.createUserToken();
 *
 * // Create a coach token with custom data
 * const coachToken = authHelper.createCoachToken({
 *   id: 'custom-coach-id',
 *   email: 'custom@coach.com'
 * });
 *
 * // Create auth headers
 * const headers = authHelper.createAuthHeaders(userToken);
 *
 * // Create expired token for testing
 * const expiredToken = authHelper.createExpiredToken();
 * ```
 */
export class AuthTestHelper {
  private jwtService: JwtService;

  /**
   * Create a new AuthTestHelper instance
   *
   * @param jwtSecret - Optional JWT secret (defaults to process.env.JWT_SECRET or JWT_CONSTANTS.DEFAULT_SECRET)
   */
  constructor(jwtSecret?: string) {
    this.jwtService = new JwtService({
      secret: jwtSecret ?? process.env.JWT_SECRET ?? JWT_CONSTANTS.DEFAULT_SECRET,
      signOptions: {
        expiresIn: parseJwtTime(process.env.JWT_EXPIRES_IN, JWT_CONSTANTS.DEFAULT_EXPIRY),
      },
    });
  }

  /**
   * Create a JWT token with custom payload
   *
   * @param payload - Partial JWT payload (missing fields will use defaults)
   * @returns Signed JWT token
   *
   * @example
   * ```typescript
   * const token = authHelper.createToken({
   *   sub: 'user-123',
   *   email: 'user@example.com',
   *   role: Role.USER
   * });
   * ```
   */
  async createToken(payload: Partial<JwtPayload>): Promise<string> {
    const defaultPayload: JwtPayload = {
      sub: DEFAULT_TEST_USER.ID,
      email: DEFAULT_TEST_USER.EMAIL,
      role: Role.USER,
      ...payload,
    };
    return await this.jwtService.signAsync(defaultPayload);
  }

  /**
   * Create a USER role token
   *
   * @param overrides - Optional overrides for user data
   * @returns Signed JWT token for a USER
   *
   * @example
   * ```typescript
   * const token = authHelper.createUserToken();
   * const customToken = authHelper.createUserToken({
   *   sub: 'custom-id',
   *   email: 'custom@user.com'
   * });
   * ```
   */
  async createUserToken(payload?: Partial<JwtPayload>): Promise<string> {
    return this.createRoleToken(Role.USER, payload);
  }

  /**
   * Create a COACH role token
   *
   * @param overrides - Optional overrides for coach data
   * @returns Signed JWT token for a COACH
   *
   * @example
   * ```typescript
   * const token = authHelper.createCoachToken();
   * const customToken = authHelper.createCoachToken({
   *   sub: 'coach-123',
   *   email: 'coach@example.com'
   * });
   * ```
   */
  async createCoachToken(payload?: Partial<JwtPayload>): Promise<string> {
    return this.createRoleToken(Role.COACH, payload);
  }

  /**
   * Create an ADMIN role token
   *
   * @param overrides - Optional overrides for admin data
   * @returns Signed JWT token for an ADMIN
   *
   * @example
   * ```typescript
   * const token = authHelper.createAdminToken();
   * ```
   */
  async createAdminToken(payload?: Partial<JwtPayload>): Promise<string> {
    return this.createRoleToken(Role.ADMIN, payload);
  }

  /**
   * Create a PREMIUM_USER role token
   *
   * @param overrides - Optional overrides for premium user data
   * @returns Signed JWT token for a PREMIUM_USER
   *
   * @example
   * ```typescript
   * const token = authHelper.createPremiumUserToken();
   * ```
   */
  async createPremiumUserToken(payload?: Partial<JwtPayload>): Promise<string> {
    return this.createRoleToken(Role.PREMIUM_USER, payload);
  }

  /**
   * Create an expired JWT token for testing authentication failures
   *
   * @param payload - Optional payload overrides
   * @returns Expired JWT token
   *
   * @example
   * ```typescript
   * const expiredToken = authHelper.createExpiredToken();
   * // Use this to test that endpoints reject expired tokens
   * ```
   */
  async createExpiredToken(payload?: Partial<JwtPayload>): Promise<string> {
    const expiredJwtService = new JwtService({
      secret: process.env.JWT_SECRET ?? JWT_CONSTANTS.DEFAULT_SECRET,
      signOptions: { expiresIn: JWT_CONSTANTS.EXPIRED_TOKEN_EXPIRY },
    });
    const defaultPayload: JwtPayload = {
      sub: DEFAULT_TEST_USER.ID,
      email: DEFAULT_TEST_USER.EMAIL,
      role: Role.USER,
      ...payload,
    };
    return expiredJwtService.signAsync(defaultPayload);
  }

  /**
   * Create authentication headers with Bearer token
   *
   * @param token - Optional JWT token (if not provided, creates a default user token)
   * @returns Object with Authorization header
   *
   * @example
   * ```typescript
   * const headers = authHelper.createAuthHeaders();
   * // { Authorization: 'Bearer eyJhbGc...' }
   *
   * const customHeaders = authHelper.createAuthHeaders(customToken);
   * ```
   */
  async createAuthHeaders(token?: string): Promise<AuthHeaders> {
    const authToken = token ?? (await this.createUserToken());
    return { [HTTP_CONSTANTS.AUTHORIZATION_HEADER]: `${HTTP_CONSTANTS.BEARER_PREFIX}${authToken}` };
  }

  /**
   * Create USER authentication headers
   *
   * @param overrides - Optional user data overrides
   * @returns Object with Authorization header for a USER
   *
   * @example
   * ```typescript
   * const headers = authHelper.createUserAuthHeaders();
   * ```
   */
  async createUserAuthHeaders(payload?: Partial<JwtPayload>): Promise<AuthHeaders> {
    const token = await this.createUserToken(payload);
    return await this.createAuthHeaders(token);
  }

  /**
   * Create COACH authentication headers
   *
   * @param overrides - Optional coach data overrides
   * @returns Object with Authorization header for a COACH
   *
   * @example
   * ```typescript
   * const headers = authHelper.createCoachAuthHeaders();
   * ```
   */
  async createCoachAuthHeaders(payload?: Partial<JwtPayload>): Promise<AuthHeaders> {
    const token = await this.createCoachToken(payload);
    return await this.createAuthHeaders(token);
  }

  /**
   * Create ADMIN authentication headers
   *
   * @param overrides - Optional admin data overrides
   * @returns Object with Authorization header for an ADMIN
   *
   * @example
   * ```typescript
   * const headers = authHelper.createAdminAuthHeaders();
   * ```
   */
  async createAdminAuthHeaders(payload?: Partial<JwtPayload>): Promise<AuthHeaders> {
    const token = await this.createAdminToken(payload);
    return await this.createAuthHeaders(token);
  }

  /**
   * Create PREMIUM_USER authentication headers
   *
   * @param overrides - Optional premium user data overrides
   * @returns Object with Authorization header for a PREMIUM_USER
   *
   * @example
   * ```typescript
   * const headers = authHelper.createPremiumUserAuthHeaders();
   * ```
   */
  async createPremiumUserAuthHeaders(payload?: Partial<JwtPayload>): Promise<AuthHeaders> {
    const token = await this.createPremiumUserToken(payload);
    return await this.createAuthHeaders(token);
  }

  /**
   * Create expired authentication headers for testing
   *
   * @param payload - Optional payload overrides
   * @returns Object with Authorization header containing an expired token
   *
   * @example
   * ```typescript
   * const headers = authHelper.createExpiredAuthHeaders();
   * // Use to test that endpoints reject expired tokens
   * ```
   */
  async createExpiredAuthHeaders(payload?: Partial<JwtPayload>): Promise<AuthHeaders> {
    const token = await this.createExpiredToken(payload);
    return await this.createAuthHeaders(token);
  }

  /**
   * Decode a JWT token without verification
   *
   * @param token - JWT token to decode
   * @returns Decoded payload or null if decoding fails
   *
   * @example
   * ```typescript
   * const payload = authHelper.decodeToken(token);
   * console.log(payload.email); // 'user@example.com'
   * ```
   */
  async decodeToken(token: string): Promise<JwtPayload | null> {
    try {
      return this.jwtService.decode(token);
    } catch {
      return null;
    }
  }

  /**
   * Verify and decode a JWT token
   *
   * @param token - JWT token to verify
   * @returns Verified payload or null if verification fails
   *
   * @example
   * ```typescript
   * const payload = authHelper.verifyToken(token);
   * if (payload) {
   *   console.log('Token is valid');
   * } else {
   *   console.log('Token is invalid or expired');
   * }
   * ```
   */
  async verifyToken(token: string): Promise<JwtPayload | null> {
    try {
      return await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      return null;
    }
  }

  /**
   * Create a type-safe HTTP client with authentication pre-configured
   *
   * This method creates an AuthenticatedHttpClient that automatically includes
   * the JWT token in all requests, providing both type safety and authentication.
   *
   * @template E - The Endpoints interface type
   * @param app - The NestJS application instance
   * @param token - Optional JWT token (if not provided, creates a default user token)
   * @returns An authenticated HTTP client with full type safety
   *
   * @example
   * ```typescript
   * const authHelper = new AuthTestHelper();
   * const client = authHelper.createAuthenticatedClient(app);
   *
   * // All requests automatically include authentication
   * const profile = await client.get('/api/accounts/me');
   * ```
   */
  async createAuthenticatedClient<E extends Record<string, any>>(
    app: INestApplication,
    token?: string
  ): Promise<AuthenticatedHttpClient<E>> {
    // Import dynamically to avoid circular dependencies
    const authToken = token ?? (await this.createUserToken());
    // Type assertion needed because require() returns untyped module
    return new AuthenticatedHttpClient(app, authToken);
  }

  /**
   * Create a token with custom expiration time
   *
   * @param payload - JWT payload
   * @param expiresIn - Expiration time (e.g., '1h', '7d', '30m')
   * @returns Signed JWT token
   *
   * @example
   * ```typescript
   * const shortLivedToken = authHelper.createTokenWithExpiry(
   *   { sub: 'user-id', email: 'user@example.com', role: Role.USER },
   *   '5m'
   * );
   * ```
   */
  async createTokenWithExpiry(payload?: Partial<JwtPayload>, expiresIn?: string): Promise<string> {
    const customJwtService = new JwtService({
      secret: process.env.JWT_SECRET ?? JWT_CONSTANTS.DEFAULT_SECRET,
      signOptions: { expiresIn: parseJwtTime(expiresIn, JWT_CONSTANTS.DEFAULT_EXPIRY) },
    });
    const fullPayload: JwtPayload = {
      sub: DEFAULT_TEST_USER.ID,
      email: DEFAULT_TEST_USER.EMAIL,
      role: Role.USER,
      ...payload,
    };
    return await customJwtService.signAsync(fullPayload);
  }

  /**
   * Create a token that expires soon (useful for testing token refresh)
   *
   * @param payload - Optional payload overrides
   * @param secondsUntilExpiry - Seconds until token expires (default: JWT_CONSTANTS.SHORT_LIVED_EXPIRY_SECONDS)
   * @returns JWT token that expires soon
   *
   * @example
   * ```typescript
   * const soonToExpireToken = authHelper.createSoonToExpireToken();
   * // Wait a few seconds and test token refresh logic
   * ```
   */
  async createSoonToExpireToken(
    payload?: Partial<JwtPayload>,
    secondsUntilExpiry: number = JWT_CONSTANTS.SHORT_LIVED_EXPIRY_SECONDS
  ): Promise<string> {
    return await this.createTokenWithExpiry(payload, `${secondsUntilExpiry}s`);
  }

  /**
   * Create a token for a specific role
   *
   * @param role - Role to create token for
   * @param overrides - Optional user data overrides
   * @returns JWT token for the specified role
   *
   * @example
   * ```typescript
   * const token = authHelper.createRoleToken(Role.COACH);
   * ```
   */
  async createRoleToken(role: Role, payload?: Partial<JwtPayload>): Promise<string> {
    const user: JwtPayload = {
      sub: `test-${role.toLowerCase()}-id`,
      email: `${role.toLowerCase()}@example.com`,
      role,
      ...payload,
    };
    return await this.createToken(user);
  }

  /**
   * Create authentication headers for a specific role
   *
   * @param role - Role to create headers for
   * @param overrides - Optional user data overrides
   * @returns Authentication headers for the specified role
   *
   * @example
   * ```typescript
   * const headers = authHelper.createRoleAuthHeaders(Role.ADMIN);
   * ```
   */
  async createRoleAuthHeaders(role: Role, payload?: Partial<JwtPayload>): Promise<AuthHeaders> {
    const token = await this.createRoleToken(role, payload);
    return await this.createAuthHeaders(token);
  }

  /**
   * Extract token from Authorization header
   *
   * @param authHeader - Authorization header value
   * @returns JWT token or null if invalid format
   *
   * @example
   * ```typescript
   * const token = authHelper.extractTokenFromHeader('Bearer eyJhbGc...');
   * ```
   */
  async extractTokenFromHeader(authHeader: string): Promise<string | null> {
    if (!authHeader?.startsWith(HTTP_CONSTANTS.BEARER_PREFIX)) {
      return null;
    }
    return authHeader.substring(HTTP_CONSTANTS.BEARER_PREFIX.length);
  }

  /**
   * Create multiple tokens for different roles
   *
   * @param roles - Array of roles to create tokens for
   * @returns Map of role to token
   *
   * @example
   * ```typescript
   * const tokens = authHelper.createMultipleRoleTokens([Role.USER, Role.COACH, Role.ADMIN]);
   * const userToken = tokens.get(Role.USER);
   * ```
   */
  createMultipleRoleTokens(roles: Role[]): Map<Role, string> {
    const tokens = new Map<Role, string>();
    roles.forEach(async role => {
      tokens.set(role, await this.createRoleToken(role));
    });
    return tokens;
  }

  /**
   * Create multiple auth headers for different roles
   *
   * @param roles - Array of roles to create headers for
   * @returns Map of role to auth headers
   *
   * @example
   * ```typescript
   * const headers = authHelper.createMultipleRoleHeaders([Role.USER, Role.COACH]);
   * const userHeaders = headers.get(Role.USER);
   * ```
   */
  createMultipleRoleHeaders(roles: Role[]): Map<Role, AuthHeaders> {
    const headers = new Map<Role, AuthHeaders>();
    roles.forEach(async role => {
      headers.set(role, await this.createRoleAuthHeaders(role));
    });
    return headers;
  }
}
