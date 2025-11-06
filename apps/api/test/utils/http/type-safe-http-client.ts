import { INestApplication } from '@nestjs/common';
import {
  ExtractMethods,
  ExtractPaths,
  ExtractRequestType,
  ExtractResponseType,
  PathsWithMethod,
  buildPath,
} from '@routes-helpers';
import request from 'supertest';

/**
 * Standard error response structure from NestJS
 */
export interface ErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
  timestamp: string;
  path: string;
}

/**
 * Validation error response structure from NestJS
/
export interface ValidationErrorResponse {
  statusCode: number;
  message: string[];
  error?: string;
  timestamp: string;
  path: string;
}

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
 * @template T - The response body type (success case)
 */
export interface TypedResponse<T> {
  /** HTTP status code */
  status: number;
  /** Response body with proper typing - success type for 2xx, error type for 4xx/5xx */
  body: T;
  /** Response headers */
  headers: Record<string, string>;
}

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
export class TypeSafeHttpClient<
  E extends Record<string, any> = Record<string, Record<string, any>>,
> {
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
   * @returns Typed response with proper success type (or union with error types if expectedStatus provided)
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
   *
   * // Error case
   * const notFound = await client.get('/api/sessions/{id}', { id: 'invalid' }, { expectedStatus: 404 });
   * // notFound.body is typed as union of success | ErrorResponse | ValidationErrorResponse
   * ```
   */
  async get<P extends PathsWithMethod<E, 'GET'>>(
    path: P,
    params?: ExtractRequestType<E, P, 'GET'>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'GET'>>> {
    const opts = options || {};

    // Build path with parameters if needed
    const builtPath = this.buildPathWithParams(path, params);

    // Create supertest request
    let req = request(this.app.getHttpServer()).get(builtPath);

    // Add headers
    if (opts.headers) {
      Object.entries(opts.headers).forEach(([key, value]) => {
        req = req.set(key, value);
      });
    }

    // Add query params for GET requests
    if (params !== undefined && params !== null) {
      req = req.query(params as Record<string, unknown>);
    }

    // Set timeout
    if (opts.timeout) {
      req = req.timeout(opts.timeout);
    }

    // Set expected status
    if (opts.expectedStatus) {
      req = req.expect(opts.expectedStatus);
    }

    const response = await req;

    return {
      status: response.status,
      body: response.body as ExtractResponseType<E, P, 'GET'>,
      headers: response.headers as Record<string, string>,
    };
  }

  /**
   * Type-safe POST request
   *
   * @template P - The API path (must support POST method)
   * @param path - The API endpoint path
   * @param body - Request body
   * @param options - Additional request options
   * @returns Typed response with proper success type
   *
   * @example
   * ```typescript
   * // Success case - returns properly typed response
   * const response = await client.post('/api/authentication/user/login', {
   *   email: 'user@example.com',
   *   password: 'password123'
   * });
   * // response.body.accessToken is typed as string
   * // response.body.account is typed with all account fields
   *
   * // Error case - you can still check status
   * const errorResponse = await client.post('/api/authentication/user/login', {
   *   email: 'duplicate@example.com',
   *   password: 'password123'
   * }, { expectedStatus: 409 });
   * ```
   */
  async post<P extends PathsWithMethod<E, 'POST'>>(
    path: P,
    body: ExtractRequestType<E, P, 'POST'>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'POST'>>> {
    const opts = options || {};

    // Build path with parameters if needed
    const builtPath = this.buildPathWithParams(path, body);

    // Create supertest request
    let req = request(this.app.getHttpServer()).post(builtPath);

    // Add headers
    if (opts.headers) {
      Object.entries(opts.headers).forEach(([key, value]) => {
        req = req.set(key, value);
      });
    }

    // Add body
    if (body !== undefined && body !== null) {
      req = req.send(body);
    }

    // Set timeout
    if (opts.timeout) {
      req = req.timeout(opts.timeout);
    }

    // Set expected status
    if (opts.expectedStatus) {
      req = req.expect(opts.expectedStatus);
    }

    const response = await req;

    return {
      status: response.status,
      body: response.body as ExtractResponseType<E, P, 'POST'>,
      headers: response.headers as Record<string, string>,
    };
  }

  /**
   * Type-safe PUT request
   *
   * @template P - The API path (must support PUT method)
   * @param path - The API endpoint path
   * @param body - Request body
   * @param options - Additional request options
   * @returns Typed response with proper success type
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
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'PUT'>>> {
    const opts = options || {};

    // Build path with parameters if needed
    const builtPath = this.buildPathWithParams(path, body);

    // Create supertest request
    let req = request(this.app.getHttpServer()).put(builtPath);

    // Add headers
    if (opts.headers) {
      Object.entries(opts.headers).forEach(([key, value]) => {
        req = req.set(key, value);
      });
    }

    // Add body
    if (body !== undefined && body !== null) {
      req = req.send(body);
    }

    // Set timeout
    if (opts.timeout) {
      req = req.timeout(opts.timeout);
    }

    // Set expected status
    if (opts.expectedStatus) {
      req = req.expect(opts.expectedStatus);
    }

    const response = await req;

    return {
      status: response.status,
      body: response.body as ExtractResponseType<E, P, 'PUT'>,
      headers: response.headers as Record<string, string>,
    };
  }

  /**
   * Type-safe DELETE request
   *
   * @template P - The API path (must support DELETE method)
   * @param path - The API endpoint path
   * @param params - Path parameters (if needed)
   * @param options - Additional request options
   * @returns Typed response with proper success type
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
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'DELETE'>>> {
    const opts = options || {};

    // Build path with parameters if needed
    const builtPath = this.buildPathWithParams(path, params);

    // Create supertest request
    let req = request(this.app.getHttpServer()).delete(builtPath);

    // Add headers
    if (opts.headers) {
      Object.entries(opts.headers).forEach(([key, value]) => {
        req = req.set(key, value);
      });
    }

    // Set timeout
    if (opts.timeout) {
      req = req.timeout(opts.timeout);
    }

    // Set expected status
    if (opts.expectedStatus) {
      req = req.expect(opts.expectedStatus);
    }

    const response = await req;

    return {
      status: response.status,
      body: response.body as ExtractResponseType<E, P, 'DELETE'>,
      headers: response.headers as Record<string, string>,
    };
  }

  /**
   * Type-safe PATCH request
   *
   * @template P - The API path (must support PATCH method)
   * @param path - The API endpoint path
   * @param body - Request body (typically partial update)
   * @param options - Additional request options
   * @returns Typed response with proper success type
   */
  async patch<P extends PathsWithMethod<E, 'PATCH'>>(
    path: P,
    body: ExtractRequestType<E, P, 'PATCH'>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'PATCH'>>> {
    const opts = options || {};

    // Build path with parameters if needed
    const builtPath = this.buildPathWithParams(path, body);

    // Create supertest request
    let req = request(this.app.getHttpServer()).patch(builtPath);

    // Add headers
    if (opts.headers) {
      Object.entries(opts.headers).forEach(([key, value]) => {
        req = req.set(key, value);
      });
    }

    // Add body
    if (body !== undefined && body !== null) {
      req = req.send(body);
    }

    // Set timeout
    if (opts.timeout) {
      req = req.timeout(opts.timeout);
    }

    // Set expected status
    if (opts.expectedStatus) {
      req = req.expect(opts.expectedStatus);
    }

    const response = await req;

    return {
      status: response.status,
      body: response.body as ExtractResponseType<E, P, 'PATCH'>,
      headers: response.headers as Record<string, string>,
    };
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
   * @returns Typed response with proper success type
   *
   * @example
   * ```typescript
   * const profile = await client.authenticatedGet(
   *   '/api/accounts/me',
   *   accessToken
   * );
   * ```
   */
  async authenticatedGet<P extends PathsWithMethod<E, 'GET'>>(
    path: P,
    token: string,
    params?: ExtractRequestType<E, P, 'GET'>,
    options?: Omit<RequestOptions, 'headers'>
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
   * @returns Typed response with proper success type
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
    options?: Omit<RequestOptions, 'headers'>
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
   * @returns Typed response with proper success type
   */
  async authenticatedPut<P extends PathsWithMethod<E, 'PUT'>>(
    path: P,
    token: string,
    body: ExtractRequestType<E, P, 'PUT'>,
    options?: Omit<RequestOptions, 'headers'>
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
   * @returns Typed response with proper success type
   */
  async authenticatedDelete<P extends PathsWithMethod<E, 'DELETE'>>(
    path: P,
    token: string,
    params?: ExtractRequestType<E, P, 'DELETE'>,
    options?: Omit<RequestOptions, 'headers'>
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
   * @returns Typed response with proper success type
   */
  async authenticatedPatch<P extends PathsWithMethod<E, 'PATCH'>>(
    path: P,
    token: string,
    body: ExtractRequestType<E, P, 'PATCH'>,
    options?: Omit<RequestOptions, 'headers'>
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
