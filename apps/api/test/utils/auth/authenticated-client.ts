import { INestApplication } from '@nestjs/common';
import type { ExtractResponseType, PathsWithMethod } from '@routes-helpers';

import {
  RequestOptions,
  RequestType,
  TypeSafeHttpClient,
  TypedResponse,
} from '../http/type-safe-http-client';

/**
 * HTTP client with authentication built-in
 *
 * This class wraps TypeSafeHttpClient and automatically includes
 * authentication headers in all requests. It provides the same
 * type-safe interface while handling JWT token management.
 *
 * @template E - The Endpoints interface type (defaults to auto-imported Endpoints)
 *
 * @example Basic Usage
 * ```typescript
 * import { AuthenticatedHttpClient } from '@test-utils';
 *
 * const client = new AuthenticatedHttpClient(app, accessToken);
 *
 * // Authentication is automatic - no need to pass token
 * const sessions = await client.get('/api/sessions');
 * const newSession = await client.post('/api/sessions', {
 *   bookingTypeId: 'booking-123',
 *   timeSlotId: 'slot-456'
 * });
 * ```
 *
 * @example With AuthTestHelper
 * ```typescript
 * import { AuthTestHelper, AuthenticatedHttpClient } from '@test-utils';
 *
 * const authHelper = new AuthTestHelper();
 * const token = authHelper.createUserToken();
 * const client = new AuthenticatedHttpClient(app, token);
 *
 * // All requests use the user token
 * const profile = await client.get('/api/accounts/me');
 * ```
 *
 * @example Switching Tokens
 * ```typescript
 * const client = new AuthenticatedHttpClient(app, userToken);
 *
 * // Make requests as user
 * const userSessions = await client.get('/api/sessions');
 *
 * // Switch to coach token
 * client.setToken(coachToken);
 *
 * // Make requests as coach
 * const coachSessions = await client.get('/api/sessions');
 * ```
 *
 * @example Discriminated Union Response
 * ```typescript
 * const client = new AuthenticatedHttpClient(app, token);
 * const response = await client.get('/api/sessions');
 *
 * if (response.ok) {
 *   // TypeScript knows response.body is Session[]
 *   expect(response.body).toBeInstanceOf(Array);
 * } else {
 *   // TypeScript knows response.body is ErrorResponse
 *   console.error(response.body.message);
 * }
 * ```
 *
 * @example Path Parameters
 * ```typescript
 * import { buildPath } from '@routes-helpers';
 *
 * const client = new AuthenticatedHttpClient(app, token);
 * const sessionId = 'session-123';
 *
 * // Use template literal with type assertion
 * const response = await client.get(`/api/sessions/${sessionId}` as '/api/sessions/{id}');
 *
 * // Or use buildPath helper
 * const path = buildPath('/api/sessions/{id}', { id: sessionId });
 * const response2 = await client.get(path as '/api/sessions/{id}');
 * ```
 */
export class AuthenticatedHttpClient<E extends Record<string, any>> {
  private client: TypeSafeHttpClient<E>;

  /**
   * Create a new AuthenticatedHttpClient
   *
   * @param app - NestJS application instance
   * @param token - JWT access token to use for all requests
   */
  constructor(
    app: INestApplication,
    private token: string
  ) {
    this.client = new TypeSafeHttpClient<E>(app);
  }

  /**
   * Type-safe authenticated GET request
   */
  async get<P extends PathsWithMethod<E, 'GET'>>(
    path: P,
    payload?: RequestType<P, 'GET', E>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'GET'>>> {
    return this.client.authenticatedGet(path, this.token, payload, options);
  }

  /**
   * Type-safe authenticated POST request
   */
  async post<P extends PathsWithMethod<E, 'POST'>>(
    path: P,
    payload?: RequestType<P, 'POST', E>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'POST'>>> {
    return this.client.authenticatedPost(path, this.token, payload, options);
  }

  /**
   * Type-safe authenticated PUT request
   */
  async put<P extends PathsWithMethod<E, 'PUT'>>(
    path: P,
    payload?: RequestType<P, 'PUT', E>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'PUT'>>> {
    return this.client.authenticatedPut(path, this.token, payload, options);
  }

  /**
   * Type-safe authenticated DELETE request
   */
  async delete<P extends PathsWithMethod<E, 'DELETE'>>(
    path: P,
    payload?: RequestType<P, 'DELETE', E>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'DELETE'>>> {
    return this.client.authenticatedDelete(path, this.token, payload, options);
  }

  /**
   * Type-safe authenticated PATCH request
   */
  async patch<P extends PathsWithMethod<E, 'PATCH'>>(
    path: P,
    payload?: RequestType<P, 'PATCH', E>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'PATCH'>>> {
    return this.client.authenticatedPatch(path, this.token, payload, options);
  }

  /**
   * Get the underlying TypeSafeHttpClient for advanced usage
   *
   * @returns The wrapped TypeSafeHttpClient instance
   *
   * @example
   * ```typescript
   * const rawClient = client.getClient();
   * // Use rawClient for non-authenticated requests
   * ```
   */
  getClient(): TypeSafeHttpClient<E> {
    return this.client;
  }

  /**
   * Get the current authentication token
   *
   * @returns The JWT token being used for authentication
   *
   * @example
   * ```typescript
   * const token = client.getToken();
   * console.log('Using token:', token);
   * ```
   */
  getToken(): string {
    return this.token;
  }

  /**
   * Update the authentication token
   *
   * @param token - New JWT token to use for subsequent requests
   *
   * @example
   * ```typescript
   * // Switch to a different user's token
   * client.setToken(newUserToken);
   * const newUserData = await client.get('/api/accounts/me');
   * ```
   */
  setToken(token: string): void {
    this.token = token;
  }
}
