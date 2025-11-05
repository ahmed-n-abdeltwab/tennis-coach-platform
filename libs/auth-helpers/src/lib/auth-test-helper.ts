import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { ExtractPaths, ExtractRequestType, ExtractResponseType } from '@routes-helpers';
import { parseJwtTime } from '@utils';

import { JwtPayload } from './common';
import { RequestOptions, TypeSafeHttpClient, TypedResponse } from './type-safe-http-client';
// Moved from test/utils/auth-helpers.ts
export interface HttpTestOptions {
  headers?: Record<string, string>;
  expectedStatus?: number;
  timeout?: number;
}

export interface TestUser {
  id: string;
  email: string;
  role: Role;
}

export interface AuthHeaders {
  Authorization: string;
}

export class AuthTestHelper {
  private jwtService: JwtService;

  constructor(jwtSecret?: string) {
    this.jwtService = new JwtService({
      secret: jwtSecret || process.env.JWT_SECRET || 'test-secret',
      signOptions: { expiresIn: parseJwtTime(process.env.JWT_EXPIRES_IN, '24h') },
    });
  }

  createToken(payload: Partial<JwtPayload>): string {
    const defaultPayload: JwtPayload = {
      sub: 'test-user-id',
      email: 'test@example.com',
      role: Role.USER,
      ...payload,
    };
    return this.jwtService.sign(defaultPayload);
  }

  createUserToken(overrides?: Partial<TestUser>): string {
    const user: TestUser = {
      id: 'test-user-id',
      email: 'user@example.com',
      role: Role.USER,
      ...overrides,
    };
    return this.createToken({ sub: user.id, email: user.email, role: user.role });
  }

  createCoachToken(overrides?: Partial<TestUser>): string {
    const coach: TestUser = {
      id: 'test-coach-id',
      email: 'coach@example.com',
      role: Role.COACH,
      ...overrides,
    };
    return this.createToken({ sub: coach.id, email: coach.email, role: coach.role });
  }

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

  createAuthHeaders(token?: string): AuthHeaders {
    const authToken = token || this.createUserToken();
    return { Authorization: `Bearer ${authToken}` };
  }

  createUserAuthHeaders(overrides?: Partial<TestUser>): AuthHeaders {
    const token = this.createUserToken(overrides);
    return this.createAuthHeaders(token);
  }

  createCoachAuthHeaders(overrides?: Partial<TestUser>): AuthHeaders {
    const token = this.createCoachToken(overrides);
    return this.createAuthHeaders(token);
  }

  createExpiredAuthHeaders(payload?: Partial<JwtPayload>): AuthHeaders {
    const token = this.createExpiredToken(payload);
    return this.createAuthHeaders(token);
  }

  decodeToken(token: string): JwtPayload | null {
    try {
      return this.jwtService.decode(token) as JwtPayload;
    } catch {
      return null;
    }
  }

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
   * const client =reateAuthenticatedClient(app);
   *
   * // All requests automatically include authentication
   * const profile = await client.get('/api/users/profile');
   * ```
   */
  createAuthenticatedClient<E = Record<string, Record<string, unknown>>>(
    app: INestApplication,
    token?: string
  ): AuthenticatedHttpClient<E> {
    const authToken = token || this.createUserToken();
    return new AuthenticatedHttpClient<E>(app, authToken);
  }
}

/**
 * Helper type to filter paths by HTTP method
 * Used internally for method-specific type constraints
 */
type PathsWithMethod<E, M extends string> = Extract<
  {
    [P in ExtractPaths<E>]: M extends keyof E[P] ? P : never;
  }[ExtractPaths<E>],
  string
>;

/**
 * HTTP client with authentication built-in
 *
 * This class wraps TypeSafeHttpClient and automatically includes
 * authentication headers in all requests. It provides the same
 * type-safe interface while handling JWT token management.
 *
 * @template E - The Endpoints interface type
 *
 * @example
 * ```typescript
 * const client = new AuthenticatedHttpClient(app, accessToken);
 *
 * // Authentication is automatic
 * const sessions = await client.get('/api/sessions');
 * const newSession = await client.post('/api/sessions', {
 *   bookingTypeId: 'booking-123',
 *   timeSlotId: 'slot-456'
 * });
 * ```
 */
export class AuthenticatedHttpClient<E = Record<string, Record<string, unknown>>> {
  private client: TypeSafeHttpClient<E>;

  constructor(
    app: INestApplication,
    private token: string
  ) {
    this.client = new TypeSafeHttpClient<E>(app);
  }

  /**
   * Type-safe authenticated GET request
   *
   * @template P - The API path (must support GET method)
   * @param path - The API endpoint path
   * @param params - Query parameters or path parameters
   * @param options - Additional request options
   * @returns Typed response
   */
  async get<P extends PathsWithMethod<E, 'GET'>>(
    path: P,
    params?: ExtractRequestType<E, P, 'GET'>,
    options: RequestOptions = {}
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'GET'>>> {
    return this.client.authenticatedGet(path, this.token, params, options);
  }

  /**
   * Type-safe authenticated POST request
   *
   * @template P - The API path (must support POST method)
   * @param path - The API endpoint path
   * @param body - Request body
   * @param options - Additional request options
   * @returns Typed response
   */
  async post<P extends PathsWithMethod<E, 'POST'>>(
    path: P,
    body: ExtractRequestType<E, P, 'POST'>,
    options: RequestOptions = {}
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'POST'>>> {
    return this.client.authenticatedPost(path, this.token, body, options);
  }

  /**
   * Type-safe authenticated PUT request
   *
   * @template P - The API path (must support PUT method)
   * @param path - The API endpoint path
   * @param body - Request body
   * @param options - Additional request options
   * @returns Typed response
   */
  async put<P extends PathsWithMethod<E, 'PUT'>>(
    path: P,
    body: ExtractRequestType<E, P, 'PUT'>,
    options: RequestOptions = {}
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'PUT'>>> {
    return this.client.authenticatedPut(path, this.token, body, options);
  }

  /**
   * Type-safe authenticated DELETE request
   *
   * @template P - The API path (must support DELETE method)
   * @param path - The API endpoint path
   * @param params - Path parameters (if needed)
   * @param options - Additional request options
   * @returns Typed response
   */
  async delete<P extends PathsWithMethod<E, 'DELETE'>>(
    path: P,
    params?: ExtractRequestType<E, P, 'DELETE'>,
    options: RequestOptions = {}
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'DELETE'>>> {
    return this.client.authenticatedDelete(path, this.token, params, options);
  }

  /**
   * Type-safe authenticated PATCH request
   *
   * @template P - The API path (must support PATCH method)
   * @param path - The API endpoint path
   * @param body - Request body
   * @param options - Additional request options
   * @returns Typed response
   */
  async patch<P extends PathsWithMethod<E, 'PATCH'>>(
    path: P,
    body: ExtractRequestType<E, P, 'PATCH'>,
    options: RequestOptions = {}
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'PATCH'>>> {
    return this.client.authenticatedPatch(path, this.token, body, options);
  }

  /**
   * Get the underlying TypeSafeHttpClient for advanced usage
   *
   * @returns The wrapped TypeSafeHttpClient instance
   */
  getClient(): TypeSafeHttpClient<E> {
    return this.client;
  }

  /**
   * Get the current authentication token
   *
   * @returns The JWT token being used for authentication
   */
  getToken(): string {
    return this.token;
  }

  /**
   * Update the authentication token
   *
   * @param token - New JWT token to use for subsequent requests
   */
  setToken(token: string): void {
    this.token = token;
  }
}
