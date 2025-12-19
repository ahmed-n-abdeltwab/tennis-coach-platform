/**
 * Authentication Mixin
 * Provides reusable authentication and token creation methods
 * Eliminates duplication of JWT token logic
 */

import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { parseJwtTime } from '@utils';

import { JwtPayload } from '../../../../src/common';
import type { AuthHeaders } from '../../auth/auth-test-helper';
import { DEFAULT_TEST_USER, HTTP_CONSTANTS, JWT_CONSTANTS } from '../../constants/test-constants';

/**
 * Authentication Mixin
 * Handles all JWT token creation and authentication headers
 */
export class AuthMixin {
  private jwtService: JwtService;

  /**
   * Creates a new AuthMixin instance
   *
   * @param jwtSecret - Optional JWT secret (defaults to process.env.JWT_SECRET or JWT_CONSTANTS.DEFAULT_SECRET)
   *
   * @example
   * ```typescript
   * const authMixin = new AuthMixin();
   * const customAuthMixin = new AuthMixin('custom-secret');
   * ```
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
   * Creates a test JWT token for authentication
   *
   * @param payload - Partial JWT payload (missing fields will use defaults)
   * @returns Signed JWT token
   *
   * @example
   * ```typescript
   * const token = await authMixin.createTestJwtToken();
   * const customToken = await authMixin.createTestJwtToken({
   *   sub: 'user-123',
   *   email: 'user@example.com',
   *   role: Role.USER
   * });
   * ```
   */
  async createTestJwtToken(payload?: Partial<JwtPayload>): Promise<string> {
    const defaultPayload: JwtPayload = {
      sub: DEFAULT_TEST_USER.ID,
      email: DEFAULT_TEST_USER.EMAIL,
      role: Role.USER,
      ...payload,
    };
    return this.jwtService.signAsync(defaultPayload);
  }

  /**
   * Creates a token for a specific role
   *
   * @param role - Role to create token for
   * @param payload - Optional payload overrides
   * @returns JWT token for the specified role
   *
   * @example
   * ```typescript
   * const userToken = await authMixin.createRoleToken(Role.USER);
   * const coachToken = await authMixin.createRoleToken(Role.COACH, {
   *   sub: 'custom-coach-id'
   * });
   * ```
   */
  async createRoleToken(role: Role, payload?: Partial<JwtPayload>): Promise<string> {
    const user: JwtPayload = {
      sub: `test-${role.toLowerCase()}-id`,
      email: `${role.toLowerCase()}@example.com`,
      role,
      ...payload,
    };
    return this.createTestJwtToken(user);
  }

  /**
   * Creates a USER role token
   *
   * @param payload - Optional payload overrides
   * @returns Signed JWT token for a USER
   *
   * @example
   * ```typescript
   * const token = await authMixin.createUserToken();
   * const customToken = await authMixin.createUserToken({
   *   sub: 'custom-id',
   *   email: 'custom@user.com'
   * });
   * ```
   */
  async createUserToken(payload?: Partial<JwtPayload>): Promise<string> {
    return this.createRoleToken(Role.USER, payload);
  }

  /**
   * Creates a COACH role token
   *
   * @param payload - Optional payload overrides
   * @returns Signed JWT token for a COACH
   *
   * @example
   * ```typescript
   * const token = await authMixin.createCoachToken();
   * const customToken = await authMixin.createCoachToken({
   *   sub: 'coach-123',
   *   email: 'coach@example.com'
   * });
   * ```
   */
  async createCoachToken(payload?: Partial<JwtPayload>): Promise<string> {
    return this.createRoleToken(Role.COACH, payload);
  }

  /**
   * Creates an ADMIN role token
   *
   * @param payload - Optional payload overrides
   * @returns Signed JWT token for an ADMIN
   *
   * @example
   * ```typescript
   * const token = await authMixin.createAdminToken();
   * ```
   */
  async createAdminToken(payload?: Partial<JwtPayload>): Promise<string> {
    return this.createRoleToken(Role.ADMIN, payload);
  }

  /**
   * Creates a PREMIUM_USER role token
   *
   * @param payload - Optional payload overrides
   * @returns Signed JWT token for a PREMIUM_USER
   *
   * @example
   * ```typescript
   * const token = await authMixin.createPremiumUserToken();
   * ```
   */
  async createPremiumUserToken(payload?: Partial<JwtPayload>): Promise<string> {
    return this.createRoleToken(Role.PREMIUM_USER, payload);
  }

  /**
   * Creates an expired JWT token for testing authentication failures
   *
   * @param payload - Optional payload overrides
   * @returns Expired JWT token
   *
   * @example
   * ```typescript
   * const expiredToken = await authMixin.createExpiredToken();
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
   * Creates Authorization headers for HTTP requests
   *
   * @param token - Optional JWT token (if not provided, creates a default user token)
   * @returns Object with Authorization header
   *
   * @example
   * ```typescript
   * const headers = await authMixin.createAuthHeaders();
   * // { Authorization: 'Bearer eyJhbGc...' }
   *
   * const customHeaders = await authMixin.createAuthHeaders(customToken);
   * ```
   */
  async createAuthHeaders(token?: string): Promise<AuthHeaders> {
    const authToken = token ?? (await this.createUserToken());
    return {
      [HTTP_CONSTANTS.AUTHORIZATION_HEADER]: `${HTTP_CONSTANTS.BEARER_PREFIX}${authToken}`,
    };
  }

  /**
   * Creates USER authentication headers
   *
   * @param payload - Optional payload overrides
   * @returns Object with Authorization header for a USER
   *
   * @example
   * ```typescript
   * const headers = await authMixin.createUserAuthHeaders();
   * ```
   */
  async createUserAuthHeaders(payload?: Partial<JwtPayload>): Promise<AuthHeaders> {
    const token = await this.createUserToken(payload);
    return this.createAuthHeaders(token);
  }

  /**
   * Creates COACH authentication headers
   *
   * @param payload - Optional payload overrides
   * @returns Object with Authorization header for a COACH
   *
   * @example
   * ```typescript
   * const headers = await authMixin.createCoachAuthHeaders();
   * ```
   */
  async createCoachAuthHeaders(payload?: Partial<JwtPayload>): Promise<AuthHeaders> {
    const token = await this.createCoachToken(payload);
    return this.createAuthHeaders(token);
  }

  /**
   * Creates ADMIN authentication headers
   *
   * @param payload - Optional payload overrides
   * @returns Object with Authorization header for an ADMIN
   *
   * @example
   * ```typescript
   * const headers = await authMixin.createAdminAuthHeaders();
   * ```
   */
  async createAdminAuthHeaders(payload?: Partial<JwtPayload>): Promise<AuthHeaders> {
    const token = await this.createAdminToken(payload);
    return this.createAuthHeaders(token);
  }

  /**
   * Creates PREMIUM_USER authentication headers
   *
   * @param payload - Optional payload overrides
   * @returns Object with Authorization header for a PREMIUM_USER
   *
   * @example
   * ```typescript
   * const headers = await authMixin.createPremiumUserAuthHeaders();
   * ```
   */
  async createPremiumUserAuthHeaders(payload?: Partial<JwtPayload>): Promise<AuthHeaders> {
    const token = await this.createPremiumUserToken(payload);
    return this.createAuthHeaders(token);
  }

  /**
   * Creates expired authentication headers for testing
   *
   * @param payload - Optional payload overrides
   * @returns Object with Authorization header containing an expired token
   *
   * @example
   * ```typescript
   * const headers = await authMixin.createExpiredAuthHeaders();
   * // Use to test that endpoints reject expired tokens
   * ```
   */
  async createExpiredAuthHeaders(payload?: Partial<JwtPayload>): Promise<AuthHeaders> {
    const token = await this.createExpiredToken(payload);
    return this.createAuthHeaders(token);
  }

  /**
   * Creates authentication headers for a specific role
   *
   * @param role - Role to create headers for
   * @param payload - Optional payload overrides
   * @returns Authentication headers for the specified role
   *
   * @example
   * ```typescript
   * const headers = await authMixin.createRoleAuthHeaders(Role.ADMIN);
   * ```
   */
  async createRoleAuthHeaders(role: Role, payload?: Partial<JwtPayload>): Promise<AuthHeaders> {
    const token = await this.createRoleToken(role, payload);
    return this.createAuthHeaders(token);
  }

  /**
   * Decodes a JWT token without verification
   *
   * @param token - JWT token to decode
   * @returns Decoded payload or null if decoding fails
   *
   * @example
   * ```typescript
   * const payload = await authMixin.decodeToken(token);
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
   * Verifies and decodes a JWT token
   *
   * @param token - JWT token to verify
   * @returns Verified payload or null if verification fails
   *
   * @example
   * ```typescript
   * const payload = await authMixin.verifyToken(token);
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
   * Extracts token from Authorization header
   *
   * @param authHeader - Authorization header value
   * @returns JWT token or null if invalid format
   *
   * @example
   * ```typescript
   * const token = await authMixin.extractTokenFromHeader('Bearer eyJhbGc...');
   * ```
   */
  async extractTokenFromHeader(authHeader: string): Promise<string | null> {
    if (!authHeader?.startsWith(HTTP_CONSTANTS.BEARER_PREFIX)) {
      return null;
    }
    return authHeader.substring(HTTP_CONSTANTS.BEARER_PREFIX.length);
  }

  /**
   * Creates a token with custom expiration time
   *
   * @param payload - JWT payload
   * @param expiresIn - Expiration time (e.g., '1h', '7d', '30m')
   * @returns Signed JWT token
   *
   * @example
   * ```typescript
   * const shortLivedToken = await authMixin.createTokenWithExpiry(
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
    return customJwtService.signAsync(fullPayload);
  }

  /**
   * Creates a token that expires soon (useful for testing token refresh)
   *
   * @param payload - Optional payload overrides
   * @param secondsUntilExpiry - Seconds until token expires (default: JWT_CONSTANTS.SHORT_LIVED_EXPIRY_SECONDS)
   * @returns JWT token that expires soon
   *
   * @example
   * ```typescript
   * const soonToExpireToken = await authMixin.createSoonToExpireToken();
   * // Wait a few seconds and test token refresh logic
   * ```
   */
  async createSoonToExpireToken(
    payload?: Partial<JwtPayload>,
    secondsUntilExpiry: number = JWT_CONSTANTS.SHORT_LIVED_EXPIRY_SECONDS
  ): Promise<string> {
    return this.createTokenWithExpiry(payload, `${secondsUntilExpiry}s`);
  }

  /**
   * Creates multiple tokens for different roles
   *
   * @param roles - Array of roles to create tokens for
   * @returns Map of role to token
   *
   * @example
   * ```typescript
   * const tokens = await authMixin.createMultipleRoleTokens([Role.USER, Role.COACH, Role.ADMIN]);
   * const userToken = tokens.get(Role.USER);
   * ```
   */
  async createMultipleRoleTokens(roles: Role[]): Promise<Map<Role, string>> {
    const tokens = new Map<Role, string>();
    for (const role of roles) {
      tokens.set(role, await this.createRoleToken(role));
    }
    return tokens;
  }

  /**
   * Creates multiple auth headers for different roles
   *
   * @param roles - Array of roles to create headers for
   * @returns Map of role to auth headers
   *
   * @example
   * ```typescript
   * const headers = await authMixin.createMultipleRoleHeaders([Role.USER, Role.COACH]);
   * const userHeaders = headers.get(Role.USER);
   * ```
   */
  async createMultipleRoleHeaders(roles: Role[]): Promise<Map<Role, AuthHeaders>> {
    const headers = new Map<Role, AuthHeaders>();
    for (const role of roles) {
      headers.set(role, await this.createRoleAuthHeaders(role));
    }
    return headers;
  }

  /**
   * Creates a type-safe HTTP client with authentication pre-configured
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
   * const authMixin = new AuthMixin();
   * const client = await authMixin.createAuthenticatedClient(app);
   *
   * // All requests automatically include authentication
   * const profile = await client.get('/api/accounts/me');
   * ```
   */
  async createAuthenticatedClient<E extends Record<string, any>>(
    app: INestApplication,
    token?: string
  ): Promise<any> {
    // Import dynamically to avoid circular dependencies
    const { AuthenticatedHttpClient } = await import('../../auth/authenticated-client');
    const authToken = token ?? (await this.createUserToken());
    return new AuthenticatedHttpClient(app, authToken);
  }

  /**
   * Creates a mock request object with user
   *
   * @param data - Request body data
   * @param user - User payload to attach to request
   * @returns Mock request object
   *
   * @example
   * ```typescript
   * const mockReq = authMixin.createMockRequest({ name: 'Test' });
   * const mockReqWithUser = authMixin.createMockRequest(
   *   { name: 'Test' },
   *   { sub: 'user-id', email: 'user@example.com', role: Role.USER }
   * );
   * ```
   */
  createMockRequest(data?: any, user?: JwtPayload) {
    return {
      body: data ?? {},
      user: user ?? { sub: DEFAULT_TEST_USER.ID, email: DEFAULT_TEST_USER.EMAIL, role: Role.USER },
      headers: {},
      query: {},
      params: {},
    };
  }

  /**
   * Creates a mock response object
   *
   * @returns Mock response object with Jest mock functions
   *
   * @example
   * ```typescript
   * const mockRes = authMixin.createMockResponse();
   * mockRes.status(200).json({ success: true });
   * expect(mockRes.status).toHaveBeenCalledWith(200);
   * ```
   */
  createMockResponse() {
    return {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      header: jest.fn().mockReturnThis(),
    };
  }

  /**
   * Adds authentication middleware to extract user from JWT
   * Used in controller tests to simulate authentication
   *
   * @param app - Application instance to add middleware to
   *
   * @example
   * ```typescript
   * authMixin.addAuthMiddleware(app);
   * // Now all requests will have req.user populated if valid token is provided
   * ```
   */
  addAuthMiddleware(app: any): void {
    app.use((req: any, _res: any, next: any) => {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          req.user = this.jwtService.verify(token);
        } catch {
          // Token invalid, leave user undefined
        }
      }
      next();
    });
  }
}
