import { INestApplication } from '@nestjs/common';
import {
  ExtractMethods,
  ExtractPaths,
  ExtractRequestType,
  ExtractResponseType,
  buildPath,
} from '@routes-helpers';
import request from 'supertest';

/**
 * Options for configuring HTTP requests
 */
export interface RequestOptions {
  /** Additional headers to include in the request */
  headers?: Record<string, string>;
  /** Expected HTTP status code (will assert if provided) */
  expectedStatus?: number;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Enable runtime validation of request/response data */
  validateRuntime?: boolean;
}

/**
 * Typed response from an API endpoint
 * Provides strongly-typed access to response data
 *
 * @template T - The response body type
 */
export interface TypedResponse<T> {
  /** HTTP status code */
  status: number;
  /** Response body with proper typing */
  body: T;
  /** Response headers */
  headers: Record<string, string>;
}

/**
 * Helper type to filter paths by HTTP method
 * Used internally to constrain method-specific request methods
 */
type PathsWithMethod<E, M extends string> = Extract<
  {
    [P in ExtractPaths<E>]: M extends keyof E[P] ? P : never;
  }[ExtractPaths<E>],
  string
>;

/**
 * Type-safe HTTP client for testing API endpoints
 *
 * Provides compile-time validation of:
 * - Endpoint paths (must exist in Endpoints interface)
 * - HTTP methods (must be supported by the endpoint)
 * - Request data structure (must match endpoint's expected input)
 * - Response data structure (automatically typed based on endpoint)
 *
 * @template E - The Endpoints interface type (defaults to auto-imported Endpoints)
 *
 * @example
 * ```typescript
 * const client = new TypeSafeHttpClient(app);
 *
 * // ✅ Valid: TypeScript validates path, method, and request body
 * const response = await client.post('/api/auth/user/login', {
 *   email: 'user@example.com',
 *   password: 'password123'
 * });
 *
 * // ❌ Compile error: Invalid path
 * await client.get('/api/invalid-path');
 *
 * // ❌ Compile error: Invalid request body structure
 * await client.post('/api/auth/user/login', { invalidField: 'test' });
 * ```
 */
export class TypeSafeHttpClient<E = Record<string, Record<string, unknown>>> {
  constructor(private app: INestApplication) {}

  /**
   * Make a type-safe request to any endpoint
   *
   * This is the core method that all other methods delegate to.
   * Provides full type safety for path, method, request data, and response.
   *
   * @template P - The API path (must exist in Endpoints)
   * @template M - The HTTP method (must be supported by the path)
   * @param path - The API endpoint path
   * @param method - The HTTP method
   * @param data - Request data (body for POST/PUT/PATCH, params for GET/DELETE)
   * @param options - Additional request options
   * @returns Typed response with proper response body type
   */
  async request<P extends ExtractPaths<E>, M extends ExtractMethods<E, P>>(
    path: P,
    method: M,
    data: ExtractRequestType<E, P, M>,
    options: RequestOptions = {}
  ): Promise<TypedResponse<ExtractResponseType<E, P, M>>> {
    // Build path with parameters if needed
    const builtPath = this.buildPathWithParams(path, data);

    // Create supertest request
    let req = request(this.app.getHttpServer())[
      method.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch'
    ](builtPath);

    // Add headers
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        req = req.set(key, value);
      });
    }

    // Add body for non-GET requests
    if (method !== 'GET' && data !== undefined && data !== null) {
      req = req.send(data);
    }

    // Add query params for GET requests
    if (method === 'GET' && data !== undefined && data !== null) {
      req = req.query(data as Record<string, unknown>);
    }

    // Set timeout
    if (options.timeout) {
      req = req.timeout(options.timeout);
    }

    // Set expected status
    if (options.expectedStatus) {
      req = req.expect(options.expectedStatus);
    }

    const response = await req;

    return {
      status: response.status,
      body: response.body as ExtractResponseType<E, P, M>,
      headers: response.headers as Record<string, string>,
    };
  }

  /**
   * Type-safe GET request
   *
   * @template P - The API path (must support GET method)
   * @param path - The API endpoint path
   * @param params - Query parameters or path parameters
   * @param options - Additional request options
   * @returns Typed response
   *
   * @example
   * ```typescript
   * // GET with query params
   * const sessions = await client.get('/api/sessions', {
   *   status: 'CONFIRMED',
   *   startDate: '2025-01-01'
   * });
   *
   * // GET with path params
   * const session = await client.get('/api/sessions/{id}', { id: '123' });
   * ```
   */
  async get<P extends PathsWithMethod<E, 'GET'>>(
    path: P,
    params?: ExtractRequestType<E, P, 'GET'>,
    options: RequestOptions = {}
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'GET'>>> {
    return this.request(
      path,
      'GET' as ExtractMethods<E, P>,
      params as ExtractRequestType<E, P, ExtractMethods<E, P>>,
      options
    );
  }

  /**
   * Type-safe POST request
   *
   * @template P - The API path (must support POST method)
   * @param path - The API endpoint path
   * @param body - Request body
   * @param options - Additional request options
   * @returns Typed response
   *
   * @example
   * ```typescript
   * const response = await client.post('/api/auth/user/login', {
   *   email: 'user@example.com',
   *   password: 'password123'
   * });
   * ```
   */
  async post<P extends PathsWithMethod<E, 'POST'>>(
    path: P,
    body: ExtractRequestType<E, P, 'POST'>,
    options: RequestOptions = {}
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'POST'>>> {
    return this.request(
      path,
      'POST' as ExtractMethods<E, P>,
      body as ExtractRequestType<E, P, ExtractMethods<E, P>>,
      options
    );
  }

  /**
   * Type-safe PUT request
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
    return this.request(
      path,
      'PUT' as ExtractMethods<E, P>,
      body as ExtractRequestType<E, P, ExtractMethods<E, P>>,
      options
    );
  }

  /**
   * Type-safe DELETE request
   *
   * @template P - The API path (must support DELETE method)
   * @param path - The API endpoint path
   * @param params - Path parameters (if needed)
   * @param options - Additional request options
   * @returns Typed response
   *
   * @example
   * ```typescript
   * await client.delete('/api/booking-types/{id}', undefined, {
   *   expectedStatus: 204
   * });
   * ```
   */
  async delete<P extends PathsWithMethod<E, 'DELETE'>>(
    path: P,
    params?: ExtractRequestType<E, P, 'DELETE'>,
    options: RequestOptions = {}
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'DELETE'>>> {
    return this.request(
      path,
      'DELETE' as ExtractMethods<E, P>,
      params as ExtractRequestType<E, P, ExtractMethods<E, P>>,
      options
    );
  }

  /**
   * Type-safe PATCH request
   *
   * @template P - The API path (must support PATCH method)
   * @param path - The API endpoint path
   * @param body - Request body (typically partial update)
   * @param options - Additional request options
   * @returns Typed response
   */
  async patch<P extends PathsWithMethod<E, 'PATCH'>>(
    path: P,
    body: ExtractRequestType<E, P, 'PATCH'>,
    options: RequestOptions = {}
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'PATCH'>>> {
    return this.request(
      path,
      'PATCH' as ExtractMethods<E, P>,
      body as ExtractRequestType<E, P, ExtractMethods<E, P>>,
      options
    );
  }

  /**
   * Authenticated GET request
   *
   * Convenience method that automatically adds Authorization header
   *
   * @template P - The API path (must support GET method)
   * @param path - The API endpoint path
   * @param token - JWT access token
   * @param params - Query parameters or path parameters
   * @param options - Additional request options (headers will be merged)
   * @returns Typed response
   *
   * @example
   * ```typescript
   * const profile = await client.authenticatedGet(
   *   '/api/users/profile',
   *   accessToken
   * );
   * ```
   */
  async authenticatedGet<P extends PathsWithMethod<E, 'GET'>>(
    path: P,
    token: string,
    params?: ExtractRequestType<E, P, 'GET'>,
    options: Omit<RequestOptions, 'headers'> = {}
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'GET'>>> {
    return this.get(path, params, {
      ...options,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Authenticated POST request
   *
   * Convenience method that automatically adds Authorization header
   *
   * @template P - The API path (must support POST method)
   * @param path - The API endpoint path
   * @param token - JWT access token
   * @param body - Request body
   * @param options - Additional request options (headers will be merged)
   * @returns Typed response
   *
   * @example
   * ```typescript
   * const session = await client.authenticatedPost(
   *   '/api/sessions',
   *   accessToken,
   *   {
   *     bookingTypeId: 'booking-123',
   *     timeSlotId: 'slot-456'
   *   }
   * );
   * ```
   */
  async authenticatedPost<P extends PathsWithMethod<E, 'POST'>>(
    path: P,
    token: string,
    body: ExtractRequestType<E, P, 'POST'>,
    options: Omit<RequestOptions, 'headers'> = {}
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'POST'>>> {
    return this.post(path, body, {
      ...options,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Authenticated PUT request
   *
   * Convenience method that automatically adds Authorization header
   *
   * @template P - The API path (must support PUT method)
   * @param path - The API endpoint path
   * @param token - JWT access token
   * @param body - Request body
   * @param options - Additional request options (headers will be merged)
   * @returns Typed response
   */
  async authenticatedPut<P extends PathsWithMethod<E, 'PUT'>>(
    path: P,
    token: string,
    body: ExtractRequestType<E, P, 'PUT'>,
    options: Omit<RequestOptions, 'headers'> = {}
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'PUT'>>> {
    return this.put(path, body, {
      ...options,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Authenticated DELETE request
   *
   * Convenience method that automatically adds Authorization header
   *
   * @template P - The API path (must support DELETE method)
   * @param path - The API endpoint path
   * @param token - JWT access token
   * @param params - Path parameters (if needed)
   * @param options - Additional request options (headers will be merged)
   * @returns Typed response
   */
  async authenticatedDelete<P extends PathsWithMethod<E, 'DELETE'>>(
    path: P,
    token: string,
    params?: ExtractRequestType<E, P, 'DELETE'>,
    options: Omit<RequestOptions, 'headers'> = {}
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'DELETE'>>> {
    return this.delete(path, params, {
      ...options,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Authenticated PATCH request
   *
   * Convenience method that automatically adds Authorization header
   *
   * @template P - The API path (must support PATCH method)
   * @param path - The API endpoint path
   * @param token - JWT access token
   * @param body - Request body
   * @param options - Additional request options (headers will be merged)
   * @returns Typed response
   */
  async authenticatedPatch<P extends PathsWithMethod<E, 'PATCH'>>(
    path: P,
    token: string,
    body: ExtractRequestType<E, P, 'PATCH'>,
    options: Omit<RequestOptions, 'headers'> = {}
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'PATCH'>>> {
    return this.patch(path, body, {
      ...options,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Build path with parameters (replace {id} with actual values)
   * @private
   */
  private buildPathWithParams(path: string, data: unknown): string {
    if (!data || typeof data !== 'object') return path;

    return buildPath(path, data as Record<string, string | number>);
  }
}
