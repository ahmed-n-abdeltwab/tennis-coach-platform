import { INestApplication } from '@nestjs/common';
import type {
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
   * Type-safe authenticated GET request (with known path type)
   */
  async get<P extends PathsWithMethod<E, 'GET'>>(
    path: P,
    params?: ExtractRequestType<E, P, 'GET'>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'GET'>>>;

  /**
   * Type-safe authenticated GET request (with string path - for template literals)
   */
  async get(path: string, params?: any, options?: RequestOptions): Promise<TypedResponse<any>>;

  // Implementation
  async get<P extends PathsWithMethod<E, 'GET'>>(
    path: P | string,
    params?: ExtractRequestType<E, P, 'GET'>,
    options: RequestOptions = {}
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'GET'>>> {
    return this.client.authenticatedGet(path as P, this.token, params, options);
  }

  /**
   * Type-safe authenticated POST request (with known path type)
   */
  async post<P extends PathsWithMethod<E, 'POST'>>(
    path: P,
    body: ExtractRequestType<E, P, 'POST'>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'POST'>>>;

  /**
   * Type-safe authenticated POST request (with string path - for template literals)
   */
  async post(path: string, body: any, options?: RequestOptions): Promise<TypedResponse<any>>;

  // Implementation
  async post<P extends PathsWithMethod<E, 'POST'>>(
    path: P | string,
    body: ExtractRequestType<E, P, 'POST'>,
    options: RequestOptions = {}
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'POST'>>> {
    return this.client.authenticatedPost(path, this.token, body, options);
  }

  /**
   * Type-safe authenticated PUT request (with known path type)
   */
  async put<P extends PathsWithMethod<E, 'PUT'>>(
    path: P,
    body: ExtractRequestType<E, P, 'PUT'>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'PUT'>>>;

  /**
   * Type-safe authenticated PUT request (with string path - for template literals)
   */
  async put(path: string, body: any, options?: RequestOptions): Promise<TypedResponse<any>>;

  // Implementation
  async put<P extends PathsWithMethod<E, 'PUT'>>(
    path: P | string,
    body: ExtractRequestType<E, P, 'PUT'>,
    options: RequestOptions = {}
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'PUT'>>> {
    return this.client.authenticatedPut(path, this.token, body, options);
  }

  /**
   * Type-safe authenticated DELETE request (with known path type)
   */
  async delete<P extends PathsWithMethod<E, 'DELETE'>>(
    path: P,
    params?: ExtractRequestType<E, P, 'DELETE'>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'DELETE'>>>;

  /**
   * Type-safe authenticated DELETE request (with string path - for template literals)
   */
  async delete(path: string, params?: any, options?: RequestOptions): Promise<TypedResponse<any>>;

  // Implementation
  async delete<P extends PathsWithMethod<E, 'DELETE'>>(
    path: P | string,
    params?: ExtractRequestType<E, P, 'DELETE'>,
    options: RequestOptions = {}
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'DELETE'>>> {
    return this.client.authenticatedDelete(path, this.token, params, options);
  }

  /**
   * Type-safe authenticated PATCH request (with known path type)
   */
  async patch<P extends PathsWithMethod<E, 'PATCH'>>(
    path: P,
    body: ExtractRequestType<E, P, 'PATCH'>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'PATCH'>>>;

  /**
   * Type-safe authenticated PATCH request (with string path - for template literals)
   */
  async patch(path: string, body: any, options?: RequestOptions): Promise<TypedResponse<any>>;

  // Implementation
  async patch<P extends PathsWithMethod<E, 'PATCH'>>(
    path: P | string,
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
