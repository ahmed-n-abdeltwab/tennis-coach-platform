import { INestApplication } from '@nestjs/common';
import {
  Endpoints,
  ExtractRequestType,
  ExtractResponseType,
  PathsWithMethod,
} from '@routes-helpers';
import { RequestOptions, TypeSafeHttpClient, TypedResponse } from '../http/type-safe-http-client';

/**
 * HTTP client with authentication built-in
 *
 * This class wraps TypeSafeHttpClient and automatically includes
 * authentication headers in all requests. It provides the same
 * type-safe interface while handling JWT token management.
 *
 * @template E - The Endpoints interface type (defaults to auto-imported Endpoints)
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
export class AuthenticatedHttpClient<E extends Record<string, any> = Endpoints> {
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
   *
   * @template P - The API path (must support GET method)
   * @param path - The API endpoint path
   * @param params - Query parameters or path parameters
   * @param options - Additional request options
   * @returns Typed response
   *
   * @example
   * ```typescript
   * // GET with no params
   * const sessions = await client.get('/api/sessions');
   *
   * // GET with query params
   * const filtered = await client.get('/api/sessions', {
   *   status: 'CONFIRMED'
   * });
   *
   * // GET with path params
   * const session = await client.get('/api/sessions/{id}', {
   *   id: 'session-123'
   * });
   * ```
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
   *
   * @example
   * ```typescript
   * const newSession = await client.post('/api/sessions', {
   *   bookingTypeId: 'booking-123',
   *   timeSlotId: 'slot-456',
   *   notes: 'First session'
   * });
   * ```
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
   *
   * @example
   * ```typescript
   * const updated = await client.put('/api/sessions/{id}', {
   *   notes: 'Updated notes',
   *   status: 'COMPLETED'
   * });
   * ```
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
   *
   * @example
   * ```typescript
   * await client.delete('/api/sessions/{id}', undefined, {
   *   expectedStatus: 204
   * });
   * ```
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
   *
   * @example
   * ```typescript
   * const patched = await client.patch('/api/sessions/{id}', {
   *   notes: 'Partial update'
   * });
   * ```
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
