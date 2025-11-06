import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';

/**
 * JWT payload structure
 */
export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}

/**
 * Test user structure
 */
export interface TestUser {
  id: string;
  email: string;
  role: Role;
}

/**
 * Authentication headers structure
 */
export interface AuthHeaders {
  Authorization: string;
}

/**
 * Parse JWT time string to seconds
 * Supports formats like '1h', '24h', '7d', '30d'
 *
 * @param timeStr - Time string (e.g., '1h', '7d')
 * @param defaultValue - Default value if parsing fails
 * @returns Time in seconds
 *
 * @example
 * ```typescript
 * parseJwtTime('1h') // returns 3600
 * parseJwtTime('7d') // returns 604800
 * parseJwtTime('invalid', '24h') // returns 86400
 * ```
 */
function parseJwtTime(timeStr: string | undefined, defaultValue: string): number {
  const str = timeStr || defaultValue;
  const match = str.match(/^(\d+)([smhd])$/);

  if (!match) {
    // If no match, try to parse as number (seconds)
    const num = parseInt(str, 10);
    return isNaN(num) ? parseJwtTime(defaultValue, '3600') : num;
  }

  const [, value, unit] = match;
  const numValue = parseInt(value ?? '10', 10);

  switch (unit) {
    case 's':
      return numValue;
    case 'm':
      return numValue * 60;
    case 'h':
      return numValue * 60 * 60;
    case 'd':
      return numValue * 60 * 60 * 24;
    default:
      return parseJwtTime(defaultValue, '3600');
  }
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
   * @param jwtSecret - Optional JWT secret (defaults to process.env.JWT_SECRET or 'test-secret')
   */
  constructor(jwtSecret?: string) {
    this.jwtService = new JwtService({
      secret: jwtSecret || process.env.JWT_SECRET || 'test-secret',
      signOptions: { expiresIn: parseJwtTime(process.env.JWT_EXPIRES_IN, '24h') },
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
  createToken(payload: Partial<JwtPayload>): string {
    const defaultPayload: JwtPayload = {
      sub: 'test-user-id',
      email: 'test@example.com',
      role: Role.USER,
      ...payload,
    };
    return this.jwtService.sign(defaultPayload);
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
   *   id: 'custom-id',
   *   email: 'custom@user.com'
   * });
   * ```
   */
  createUserToken(overrides?: Partial<TestUser>): string {
    const user: TestUser = {
      id: 'test-user-id',
      email: 'user@example.com',
      role: Role.USER,
      ...overrides,
    };
    return this.createToken({ sub: user.id, email: user.email, role: user.role });
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
   *   id: 'coach-123',
   *   email: 'coach@example.com'
   * });
   * ```
   */
  createCoachToken(overrides?: Partial<TestUser>): string {
    const coach: TestUser = {
      id: 'test-coach-id',
      email: 'coach@example.com',
      role: Role.COACH,
      ...overrides,
    };
    return this.createToken({ sub: coach.id, email: coach.email, role: coach.role });
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
  createAdminToken(overrides?: Partial<TestUser>): string {
    const admin: TestUser = {
      id: 'test-admin-id',
      email: 'admin@example.com',
      role: Role.ADMIN,
      ...overrides,
    };
    return this.createToken({ sub: admin.id, email: admin.email, role: admin.role });
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
  createPremiumUserToken(overrides?: Partial<TestUser>): string {
    const premiumUser: TestUser = {
      id: 'test-premium-user-id',
      email: 'premium@example.com',
      role: Role.PREMIUM_USER,
      ...overrides,
    };
    return this.createToken({
      sub: premiumUser.id,
      email: premiumUser.email,
      role: premiumUser.role,
    });
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
  createExpiredToken(payload?: Partial<JwtPayload>): string {
    const expiredJwtService = new JwtService({
      secret: process.env.JWT_SECRET || 'test-secret',
      signOptions: { expiresIn: '-1h' },
    });
    const defaultPayload: JwtPayload = {
      sub: 'test-user-id',
      email: 'test@example.com',
      role: Role.USER,
      ...payload,
    };
    return expiredJwtService.sign(defaultPayload);
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
  createAuthHeaders(token?: string): AuthHeaders {
    const authToken = token || this.createUserToken();
    return { Authorization: `Bearer ${authToken}` };
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
  createUserAuthHeaders(overrides?: Partial<TestUser>): AuthHeaders {
    const token = this.createUserToken(overrides);
    return this.createAuthHeaders(token);
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
  createCoachAuthHeaders(overrides?: Partial<TestUser>): AuthHeaders {
    const token = this.createCoachToken(overrides);
    return this.createAuthHeaders(token);
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
  createAdminAuthHeaders(overrides?: Partial<TestUser>): AuthHeaders {
    const token = this.createAdminToken(overrides);
    return this.createAuthHeaders(token);
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
  createPremiumUserAuthHeaders(overrides?: Partial<TestUser>): AuthHeaders {
    const token = this.createPremiumUserToken(overrides);
    return this.createAuthHeaders(token);
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
  createExpiredAuthHeaders(payload?: Partial<JwtPayload>): AuthHeaders {
    const token = this.createExpiredToken(payload);
    return this.createAuthHeaders(token);
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
  decodeToken(token: string): JwtPayload | null {
    try {
      return this.jwtService.decode(token) as JwtPayload;
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
  verifyToken(token: string): JwtPayload | null {
    try {
      return this.jwtService.verify(token) as JwtPayload;
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
  createAuthenticatedClient<E extends Record<string, any> = Record<string, Record<string, any>>>(
    app: any,
    token?: string
  ): import('../auth/authenticated-client').AuthenticatedHttpClient<E> {
    // Import dynamically to avoid circular dependencies
    const { AuthenticatedHttpClient } = require('../auth/authenticated-client');
    const authToken = token || this.createUserToken();
    // Type assertion needed because require() returns untyped module
    return new AuthenticatedHttpClient(
      app,
      authToken
    ) as import('../auth/authenticated-client').AuthenticatedHttpClient<E>;
  }
}
