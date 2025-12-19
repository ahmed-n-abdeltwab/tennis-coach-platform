import { JwtPayload } from '@common';
import { INestApplication } from '@nestjs/common';
import { Role } from '@prisma/client';

import { AuthMixin } from '../base/mixins/auth.mixin';

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
 * @deprecated This class is now a wrapper around AuthMixin for backward compatibility.
 * Consider using AuthMixin directly from '@test-utils/base' for new code.
 *
 * @example
 * ```typescript
 * const authHelper = new AuthTestHelper();
 *
 * // Create a user token
 * const userToken = await authHelper.createUserToken();
 *
 * // Create a coach token with custom data
 * const coachToken = await authHelper.createCoachToken({
 *   id: 'custom-coach-id',
 *   email: 'custom@coach.com'
 * });
 *
 * // Create auth headers
 * const headers = await authHelper.createAuthHeaders(userToken);
 *
 * // Create expired token for testing
 * const expiredToken = await authHelper.createExpiredToken();
 * ```
 */
export class AuthTestHelper {
  private authMixin: AuthMixin;

  /**
   * Create a new AuthTestHelper instance
   *
   * @param jwtSecret - Optional JWT secret (defaults to process.env.JWT_SECRET or JWT_CONSTANTS.DEFAULT_SECRET)
   */
  constructor(jwtSecret?: string) {
    this.authMixin = new AuthMixin(jwtSecret);
  }

  /**
   * Create a JWT token with custom payload
   *
   * @param payload - Partial JWT payload (missing fields will use defaults)
   * @returns Signed JWT token
   *
   * @example
   * ```typescript
   * const token = await authHelper.createToken({
   *   sub: 'user-123',
   *   email: 'user@example.com',
   *   role: Role.USER
   * });
   * ```
   */
  async createToken(payload: Partial<JwtPayload>): Promise<string> {
    return this.authMixin.createTestJwtToken(payload);
  }

  /**
   * Create a USER role token
   *
   * @param payload - Optional payload overrides
   * @returns Signed JWT token for a USER
   *
   * @example
   * ```typescript
   * const token = await authHelper.createUserToken();
   * const customToken = await authHelper.createUserToken({
   *   sub: 'custom-id',
   *   email: 'custom@user.com'
   * });
   * ```
   */
  async createUserToken(payload?: Partial<JwtPayload>): Promise<string> {
    return this.authMixin.createUserToken(payload);
  }

  /**
   * Create a COACH role token
   *
   * @param payload - Optional payload overrides
   * @returns Signed JWT token for a COACH
   *
   * @example
   * ```typescript
   * const token = await authHelper.createCoachToken();
   * const customToken = await authHelper.createCoachToken({
   *   sub: 'coach-123',
   *   email: 'coach@example.com'
   * });
   * ```
   */
  async createCoachToken(payload?: Partial<JwtPayload>): Promise<string> {
    return this.authMixin.createCoachToken(payload);
  }

  /**
   * Create an ADMIN role token
   *
   * @param payload - Optional payload overrides
   * @returns Signed JWT token for an ADMIN
   *
   * @example
   * ```typescript
   * const token = await authHelper.createAdminToken();
   * ```
   */
  async createAdminToken(payload?: Partial<JwtPayload>): Promise<string> {
    return this.authMixin.createAdminToken(payload);
  }

  /**
   * Create a PREMIUM_USER role token
   *
   * @param payload - Optional payload overrides
   * @returns Signed JWT token for a PREMIUM_USER
   *
   * @example
   * ```typescript
   * const token = await authHelper.createPremiumUserToken();
   * ```
   */
  async createPremiumUserToken(payload?: Partial<JwtPayload>): Promise<string> {
    return this.authMixin.createPremiumUserToken(payload);
  }

  /**
   * Create an expired JWT token for testing authentication failures
   *
   * @param payload - Optional payload overrides
   * @returns Expired JWT token
   *
   * @example
   * ```typescript
   * const expiredToken = await authHelper.createExpiredToken();
   * // Use this to test that endpoints reject expired tokens
   * ```
   */
  async createExpiredToken(payload?: Partial<JwtPayload>): Promise<string> {
    return this.authMixin.createExpiredToken(payload);
  }

  /**
   * Create authentication headers with Bearer token
   *
   * @param token - Optional JWT token (if not provided, creates a default user token)
   * @returns Object with Authorization header
   *
   * @example
   * ```typescript
   * const headers = await authHelper.createAuthHeaders();
   * // { Authorization: 'Bearer eyJhbGc...' }
   *
   * const customHeaders = await authHelper.createAuthHeaders(customToken);
   * ```
   */
  async createAuthHeaders(token?: string): Promise<AuthHeaders> {
    return this.authMixin.createAuthHeaders(token);
  }

  /**
   * Create USER authentication headers
   *
   * @param payload - Optional payload overrides
   * @returns Object with Authorization header for a USER
   *
   * @example
   * ```typescript
   * const headers = await authHelper.createUserAuthHeaders();
   * ```
   */
  async createUserAuthHeaders(payload?: Partial<JwtPayload>): Promise<AuthHeaders> {
    return this.authMixin.createUserAuthHeaders(payload);
  }

  /**
   * Create COACH authentication headers
   *
   * @param payload - Optional payload overrides
   * @returns Object with Authorization header for a COACH
   *
   * @example
   * ```typescript
   * const headers = await authHelper.createCoachAuthHeaders();
   * ```
   */
  async createCoachAuthHeaders(payload?: Partial<JwtPayload>): Promise<AuthHeaders> {
    return this.authMixin.createCoachAuthHeaders(payload);
  }

  /**
   * Create ADMIN authentication headers
   *
   * @param payload - Optional payload overrides
   * @returns Object with Authorization header for an ADMIN
   *
   * @example
   * ```typescript
   * const headers = await authHelper.createAdminAuthHeaders();
   * ```
   */
  async createAdminAuthHeaders(payload?: Partial<JwtPayload>): Promise<AuthHeaders> {
    return this.authMixin.createAdminAuthHeaders(payload);
  }

  /**
   * Create PREMIUM_USER authentication headers
   *
   * @param payload - Optional payload overrides
   * @returns Object with Authorization header for a PREMIUM_USER
   *
   * @example
   * ```typescript
   * const headers = await authHelper.createPremiumUserAuthHeaders();
   * ```
   */
  async createPremiumUserAuthHeaders(payload?: Partial<JwtPayload>): Promise<AuthHeaders> {
    return this.authMixin.createPremiumUserAuthHeaders(payload);
  }

  /**
   * Create expired authentication headers for testing
   *
   * @param payload - Optional payload overrides
   * @returns Object with Authorization header containing an expired token
   *
   * @example
   * ```typescript
   * const headers = await authHelper.createExpiredAuthHeaders();
   * // Use to test that endpoints reject expired tokens
   * ```
   */
  async createExpiredAuthHeaders(payload?: Partial<JwtPayload>): Promise<AuthHeaders> {
    return this.authMixin.createExpiredAuthHeaders(payload);
  }

  /**
   * Decode a JWT token without verification
   *
   * @param token - JWT token to decode
   * @returns Decoded payload or null if decoding fails
   *
   * @example
   * ```typescript
   * const payload = await authHelper.decodeToken(token);
   * console.log(payload.email); // 'user@example.com'
   * ```
   */
  async decodeToken(token: string): Promise<JwtPayload | null> {
    return this.authMixin.decodeToken(token);
  }

  /**
   * Verify and decode a JWT token
   *
   * @param token - JWT token to verify
   * @returns Verified payload or null if verification fails
   *
   * @example
   * ```typescript
   * const payload = await authHelper.verifyToken(token);
   * if (payload) {
   *   console.log('Token is valid');
   * } else {
   *   console.log('Token is invalid or expired');
   * }
   * ```
   */
  async verifyToken(token: string): Promise<JwtPayload | null> {
    return this.authMixin.verifyToken(token);
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
   * const client = await authHelper.createAuthenticatedClient(app);
   *
   * // All requests automatically include authentication
   * const profile = await client.get('/api/accounts/me');
   * ```
   */
  async createAuthenticatedClient<E extends Record<string, any>>(
    app: INestApplication,
    token?: string
  ): Promise<any> {
    return this.authMixin.createAuthenticatedClient<E>(app, token);
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
   * const shortLivedToken = await authHelper.createTokenWithExpiry(
   *   { sub: 'user-id', email: 'user@example.com', role: Role.USER },
   *   '5m'
   * );
   * ```
   */
  async createTokenWithExpiry(payload?: Partial<JwtPayload>, expiresIn?: string): Promise<string> {
    return this.authMixin.createTokenWithExpiry(payload, expiresIn);
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
   * const soonToExpireToken = await authHelper.createSoonToExpireToken();
   * // Wait a few seconds and test token refresh logic
   * ```
   */
  async createSoonToExpireToken(
    payload?: Partial<JwtPayload>,
    secondsUntilExpiry?: number
  ): Promise<string> {
    return this.authMixin.createSoonToExpireToken(payload, secondsUntilExpiry);
  }

  /**
   * Create a token for a specific role
   *
   * @param role - Role to create token for
   * @param payload - Optional payload overrides
   * @returns JWT token for the specified role
   *
   * @example
   * ```typescript
   * const token = await authHelper.createRoleToken(Role.COACH);
   * ```
   */
  async createRoleToken(role: Role, payload?: Partial<JwtPayload>): Promise<string> {
    return this.authMixin.createRoleToken(role, payload);
  }

  /**
   * Create authentication headers for a specific role
   *
   * @param role - Role to create headers for
   * @param payload - Optional payload overrides
   * @returns Authentication headers for the specified role
   *
   * @example
   * ```typescript
   * const headers = await authHelper.createRoleAuthHeaders(Role.ADMIN);
   * ```
   */
  async createRoleAuthHeaders(role: Role, payload?: Partial<JwtPayload>): Promise<AuthHeaders> {
    return this.authMixin.createRoleAuthHeaders(role, payload);
  }

  /**
   * Extract token from Authorization header
   *
   * @param authHeader - Authorization header value
   * @returns JWT token or null if invalid format
   *
   * @example
   * ```typescript
   * const token = await authHelper.extractTokenFromHeader('Bearer eyJhbGc...');
   * ```
   */
  async extractTokenFromHeader(authHeader: string): Promise<string | null> {
    return this.authMixin.extractTokenFromHeader(authHeader);
  }

  /**
   * Create multiple tokens for different roles
   *
   * @param roles - Array of roles to create tokens for
   * @returns Map of role to token
   *
   * @example
   * ```typescript
   * const tokens = await authHelper.createMultipleRoleTokens([Role.USER, Role.COACH, Role.ADMIN]);
   * const userToken = tokens.get(Role.USER);
   * ```
   */
  async createMultipleRoleTokens(roles: Role[]): Promise<Map<Role, string>> {
    return this.authMixin.createMultipleRoleTokens(roles);
  }

  /**
   * Create multiple auth headers for different roles
   *
   * @param roles - Array of roles to create headers for
   * @returns Map of role to auth headers
   *
   * @example
   * ```typescript
   * const headers = await authHelper.createMultipleRoleHeaders([Role.USER, Role.COACH]);
   * const userHeaders = headers.get(Role.USER);
   * ```
   */
  async createMultipleRoleHeaders(roles: Role[]): Promise<Map<Role, AuthHeaders>> {
    return this.authMixin.createMultipleRoleHeaders(roles);
  }
}
