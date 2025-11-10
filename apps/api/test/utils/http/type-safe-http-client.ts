import { INestApplication } from '@nestjs/common';
import { buildPath } from '@routes-helpers';
import type {
  DeepPartial,
  ExtractMethods,
  ExtractPaths,
  ExtractRequestType,
  ExtractResponseType,
  PathsWithMethod,
} from '@test-utils';
import { Endpoints } from '@test-utils';
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
 */
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
 * Success response (2xx status codes)
 * @template T - The success response body type
 */
export type SuccessStatus = 200 | 201 | 202 | 203 | 204 | 205 | 206;
export interface SuccessResponse<T> {
  /** HTTP status code (2xx) */
  status: SuccessStatus;
  /** Response body with success type */
  body: T;
  /** Response headers */
  headers: Record<string, string>;
  /** Indicates this is a success response */
  ok: true;
}

/**
 * Error response (4xx/5xx status codes)
 */
export interface FailureResponse {
  /** HTTP status code (4xx or 5xx) */
  status: number;
  /** Error response body */
  body: ErrorResponse | ValidationErrorResponse;
  /** Response headers */
  headers: Record<string, string>;
  /** Indicates this is an error response */
  ok: false;
}

/**
 * Typed response from an API endpoint
 * Uses discriminated union to distinguish between success and error responses
 *
 * @template T - The success response body type
 */
export type TypedResponse<T> = SuccessResponse<T> | FailureResponse;

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
 * @example Basic Usage
 * ```typescript
 * const client = new TypeSafeHttpClient(app);
 *
 * // ✅ Valid: TypeScript validates path, method, and request body
 * const response = await client.post('/api/authentication/user/login', {
 *   email: 'user@example.com',
 *   password: 'password123'
 * });
 *
 * // ❌ Compile error: Invalid path
 * await client.get('/api/invalid-path');
 *
 * // ❌ Compile error: Invalid request body structure
 * await client.post('/api/authentication/user/login', { invalidField: 'test' });
 * ```
 *
 * @example Discriminated Union Response Handling
 * ```typescript
 * const response = await client.get('/api/sessions');
 *
 * // Use discriminated union to handle success/error
 * if (response.ok) {
 *   // TypeScript knows response.body is Session[]
 *   console.log(response.body[0].coachId);
 *   expect(response.status).toBe(200);
 * } else {
 *   // TypeScript knows response.body is ErrorResponse
 *   console.error(response.body.message);
 *   expect(response.status).toBeGreaterThanOrEqual(400);
 * }
 * ```
 *
 * @example Path Parameters
 * ```typescript
 * import { buildPath } from '@routes-helpers';
 *
 * const sessionId = 'session-123';
 *
 * // Option 1: Use template literal with type assertion
 * const response1 = await client.get(`/api/sessions/${sessionId}` as '/api/sessions/{id}');
 *
 * // Option 2: Use buildPath helper
 * const path = buildPath('/api/sessions/{id}', { id: sessionId });
 * const response2 = await client.get(path as '/api/sessions/{id}');
 * ```
 *
 * @example Authenticated Requests
 * ```typescript
 * const token = 'jwt-token-here';
 *
 * // Authenticated GET
 * const sessions = await client.authenticatedGet('/api/sessions', token);
 *
 * // Authenticated POST
 * const newSession = await client.authenticatedPost('/api/sessions', token, {
 *   bookingTypeId: 'booking-123',
 *   timeSlotId: 'slot-456'
 * });
 * ```
 *
 * @example Request Options
 * ```typescript
 * // With expected status
 * const response = await client.get('/api/sessions', undefined, {
 *   expectedStatus: 200
 * });
 *
 * // With custom headers
 * const response = await client.post('/api/sessions', data, {
 *   headers: { 'X-Custom-Header': 'value' }
 * });
 *
 * // With timeout
 * const response = await client.get('/api/sessions', undefined, {
 *   timeout: 5000
 * });
 * ```
 */
export class TypeSafeHttpClient<E extends Record<string, any> = Endpoints> {
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
    data?: DeepPartial<ExtractRequestType<E, P, M>>,
    options: RequestOptions = {}
  ): Promise<TypedResponse<ExtractResponseType<E, P, M>>> {
    // Build path with parameters if needed
    const builtPath = this.buildPathWithParams(path, data);

    // Create supertest request
    const normalizedMethod = method.toLowerCase() as Lowercase<M>;
    let req = request(this.app.getHttpServer())[normalizedMethod](builtPath);

    // Add headers
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        req = req.set(key, value);
      });
    }

    // Add data for requests
    if (data != null) {
      if (method === 'GET') req = req.query(data);
      else req = req.send(data);
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

    // Determine if response is success (2xx) or error (4xx/5xx)
    const isSuccess = response.status >= 200 && response.status < 300;

    if (isSuccess) {
      return {
        status: response.status as SuccessStatus,
        body: response.body as ExtractResponseType<E, P, M>,
        headers: response.headers as Record<string, string>,
        ok: true,
      } as TypedResponse<ExtractResponseType<E, P, M>>;
    } else {
      return {
        status: response.status,
        body: response.body as ErrorResponse | ValidationErrorResponse,
        headers: response.headers as Record<string, string>,
        ok: false,
      } as TypedResponse<ExtractResponseType<E, P, M>>;
    }
  }

  /**
   * Type-safe GET request
   *
   * @template P - The API path (must support GET method)
   * @param path - The API endpoint path (literal or template string with type assertion)
   * @param params - Query parameters or path parameters
   * @param options - Additional request options
   * @returns Typed response with discriminated union (check response.ok to narrow type)
   *
   * @example
   * ```typescript
   * // With literal path
   * const response = await client.get('/api/accounts/me');
   *
   * // With template literal (use type assertion)
   * const response = await client.get(`/api/accounts/${id}` as '/api/accounts/{id}');
   *
   * // Use discriminated union to narrow type
   * if (response.ok) {
   *   console.log(response.body.id);
   * } else {
   *   console.error(response.body.message);
   * }
   * ```
   */
  async get<P extends PathsWithMethod<E, 'GET'>>(
    path: P,
    params?: DeepPartial<ExtractRequestType<E, P, 'GET'>>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'GET'>>> {
    return this.request(path, 'GET', params, options);
  }

  /**
   * Type-safe POST request
   *
   * @template P - The API path (must support POST method)
   * @param path - The API endpoint path (can be literal or template string)
   * @param body - Request body
   * @param options - Additional request options
   * @returns Typed response with discriminated union
   *
   * @example
   * ```typescript
   * // With literal path (full type safety)
   * const response = await client.post('/api/authentication/user/login', { email, password });
   *
   * // With template literal (use type assertion for full type safety)
   * const response = await client.post(`/api/users/${id}` as '/api/users/{id}', data);
   *
   * if (response.ok) {
   *   console.log(response.body.accessToken);
   * } else {
   *   console.error(response.body.message);
   * }
   * ```
   */
  async post<P extends PathsWithMethod<E, 'POST'>>(
    path: P,
    body?: DeepPartial<ExtractRequestType<E, P, 'POST'>>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'POST'>>> {
    return this.request(path, 'POST', body, options);
  }

  /**
   * Type-safe PUT request
   */
  async put<P extends PathsWithMethod<E, 'PUT'>>(
    path: P,
    body?: DeepPartial<ExtractRequestType<E, P, 'PUT'>>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'PUT'>>> {
    return this.request(path, 'PUT', body, options);
  }

  /**
   * Type-safe DELETE request
   */
  async delete<P extends PathsWithMethod<E, 'DELETE'>>(
    path: P,
    params?: DeepPartial<ExtractRequestType<E, P, 'DELETE'>>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'DELETE'>>> {
    return this.request(path, 'DELETE', params, options);
  }

  /**
   * Type-safe PATCH request
   */
  async patch<P extends PathsWithMethod<E, 'PATCH'>>(
    path: P,
    body?: DeepPartial<ExtractRequestType<E, P, 'PATCH'>>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'PATCH'>>> {
    return this.request(path, 'PATCH', body, options);
  }

  async authenticatedGet<P extends PathsWithMethod<E, 'GET'>>(
    path: P,
    token: string,
    params?: DeepPartial<ExtractRequestType<E, P, 'GET'>>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'GET'>>> {
    return this.get(path, params, {
      ...options,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async authenticatedPost<P extends PathsWithMethod<E, 'POST'>>(
    path: P,
    token: string,
    body?: DeepPartial<ExtractRequestType<E, P, 'POST'>>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'POST'>>> {
    return this.post(path, body, {
      ...options,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async authenticatedPut<P extends PathsWithMethod<E, 'PUT'>>(
    path: P,
    token: string,
    body?: DeepPartial<ExtractRequestType<E, P, 'PUT'>>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'PUT'>>> {
    return this.put(path, body, {
      ...options,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async authenticatedDelete<P extends PathsWithMethod<E, 'DELETE'>>(
    path: P,
    token: string,
    params?: DeepPartial<ExtractRequestType<E, P, 'DELETE'>>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'DELETE'>>> {
    return this.delete(path, params, {
      ...options,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Authenticated PATCH request (with known path type)
   */
  async authenticatedPatch<P extends PathsWithMethod<E, 'PATCH'>>(
    path: P,
    token: string,
    body?: DeepPartial<ExtractRequestType<E, P, 'PATCH'>>,
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
  private buildPathWithParams(path: string, data?: Record<string, any>): string {
    if (!data || typeof data !== 'object') return path;

    return buildPath(path, data);
  }
}
