import { INestApplication } from '@nestjs/common';
import type {
  ExtractMethods,
  ExtractPaths,
  ExtractRequestType,
  ExtractResponseType,
  PathsWithMethod,
} from '@routes-helpers';
import { buildPath } from '@routes-helpers';
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
export interface SuccessResponse<T> {
  /** HTTP status code (2xx) */
  status: 200 | 201 | 202 | 203 | 204 | 205 | 206;
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
    data?: ExtractRequestType<E, P, M>,
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

    // Determine if response is success (2xx) or error (4xx/5xx)
    const isSuccess = response.status >= 200 && response.status < 300;

    if (isSuccess) {
      return {
        status: response.status as 200 | 201 | 202 | 203 | 204 | 205 | 206,
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
   * Type-safe GET request (with known path type)
   *
   * @template P - The API path (must support GET method)
   * @param path - The API endpoint path
   * @param params - Query parameters or path parameters
   * @param options - Additional request options
   * @returns Typed response with discriminated union (check response.ok to narrow type)
   */
  async get<P extends PathsWithMethod<E, 'GET'>>(
    path: P,
    params?: ExtractRequestType<E, P, 'GET'>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'GET'>>>;

  /**
   * Type-safe GET request (with string path - for template literals)
   *
   * @param path - The API endpoint path (template literal like `/api/users/${id}`)
   * @param params - Query parameters or path parameters
   * @param options - Additional request options
   * @returns Typed response with discriminated union (check response.ok to narrow type)
   *
   * @example
   * ```typescript
   * // GET with template literal
   * const response = await client.get(`/api/accounts/${accountId}`);
   *
   * // Use discriminated union to narrow type
   * if (response.ok) {
   *   // response.body is typed as success type
   *   console.log(response.body.id);
   * } else {
   *   // response.body is typed as ErrorResponse | ValidationErrorResponse
   *   console.log(response.body.message);
   * }
   * ```
   */
  async get(path: string, params?: any, options?: RequestOptions): Promise<TypedResponse<any>>;

  // Implementation
  async get<P extends PathsWithMethod<E, 'GET'>>(
    path: P | string,
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

    // Determine if response is success (2xx) or error (4xx/5xx)
    const isSuccess = response.status >= 200 && response.status < 300;

    if (isSuccess) {
      return {
        status: response.status as 200 | 201 | 202 | 203 | 204 | 205 | 206,
        body: response.body,
        headers: response.headers as Record<string, string>,
        ok: true,
      } as SuccessResponse<ExtractResponseType<E, P, 'GET'>>;
    } else {
      return {
        status: response.status,
        body: response.body,
        headers: response.headers as Record<string, string>,
        ok: false,
      } as FailureResponse;
    }
  }

  /**
   * Type-safe POST request (with known path type)
   */
  async post<P extends PathsWithMethod<E, 'POST'>>(
    path: P,
    body: ExtractRequestType<E, P, 'POST'>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'POST'>>>;

  /**
   * Type-safe POST request (with string path - for template literals)
   */
  async post(path: string, body: any, options?: RequestOptions): Promise<TypedResponse<any>>;

  // Implementation
  async post<P extends PathsWithMethod<E, 'POST'>>(
    path: P | string,
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

    // Determine if response is success (2xx) or error (4xx/5xx)
    const isSuccess = response.status >= 200 && response.status < 300;

    if (isSuccess) {
      return {
        status: response.status as 200 | 201 | 202 | 203 | 204 | 205 | 206,
        body: response.body,
        headers: response.headers as Record<string, string>,
        ok: true,
      } as SuccessResponse<ExtractResponseType<E, P, 'POST'>>;
    } else {
      return {
        status: response.status,
        body: response.body,
        headers: response.headers as Record<string, string>,
        ok: false,
      } as FailureResponse;
    }
  }

  /**
   * Type-safe PUT request (with known path type)
   */
  async put<P extends PathsWithMethod<E, 'PUT'>>(
    path: P,
    body: ExtractRequestType<E, P, 'PUT'>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'PUT'>>>;

  /**
   * Type-safe PUT request (with string path - for template literals)
   */
  async put(path: string, body: any, options?: RequestOptions): Promise<TypedResponse<any>>;

  // Implementation
  async put<P extends PathsWithMethod<E, 'PUT'>>(
    path: P | string,
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

    // Determine if response is success (2xx) or error (4xx/5xx)
    const isSuccess = response.status >= 200 && response.status < 300;

    if (isSuccess) {
      return {
        status: response.status as 200 | 201 | 202 | 203 | 204 | 205 | 206,
        body: response.body,
        headers: response.headers as Record<string, string>,
        ok: true,
      } as SuccessResponse<ExtractResponseType<E, P, 'PUT'>>;
    } else {
      return {
        status: response.status,
        body: response.body,
        headers: response.headers as Record<string, string>,
        ok: false,
      } as FailureResponse;
    }
  }

  /**
   * Type-safe DELETE request (with known path type)
   */
  async delete<P extends PathsWithMethod<E, 'DELETE'>>(
    path: P,
    params?: ExtractRequestType<E, P, 'DELETE'>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'DELETE'>>>;

  /**
   * Type-safe DELETE request (with string path - for template literals)
   */
  async delete(path: string, params?: any, options?: RequestOptions): Promise<TypedResponse<any>>;

  // Implementation
  async delete<P extends PathsWithMethod<E, 'DELETE'>>(
    path: P | string,
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

    // Determine if response is success (2xx) or error (4xx/5xx)
    const isSuccess = response.status >= 200 && response.status < 300;

    if (isSuccess) {
      return {
        status: response.status as 200 | 201 | 202 | 203 | 204 | 205 | 206,
        body: response.body as ExtractResponseType<E, P, 'DELETE'>,
        headers: response.headers as Record<string, string>,
        ok: true,
      };
    } else {
      return {
        status: response.status,
        body: response.body as ErrorResponse | ValidationErrorResponse,
        headers: response.headers as Record<string, string>,
        ok: false,
      };
    }
  }

  /**
   * Type-safe PATCH request (with known path type)
   */
  async patch<P extends PathsWithMethod<E, 'PATCH'>>(
    path: P,
    body: ExtractRequestType<E, P, 'PATCH'>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'PATCH'>>>;

  /**
   * Type-safe PATCH request (with string path - for template literals)
   */
  async patch(path: string, body: any, options?: RequestOptions): Promise<TypedResponse<any>>;

  // Implementation
  async patch<P extends PathsWithMethod<E, 'PATCH'>>(
    path: P | string,
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

    // Determine if response is success (2xx) or error (4xx/5xx)
    const isSuccess = response.status >= 200 && response.status < 300;

    if (isSuccess) {
      return {
        status: response.status as 200 | 201 | 202 | 203 | 204 | 205 | 206,
        body: response.body as ExtractResponseType<E, P, 'PATCH'>,
        headers: response.headers as Record<string, string>,
        ok: true,
      };
    } else {
      return {
        status: response.status,
        body: response.body as ErrorResponse | ValidationErrorResponse,
        headers: response.headers as Record<string, string>,
        ok: false,
      };
    }
  }

  /**
   * Authenticated GET request (with known path type)
   */
  async authenticatedGet<P extends PathsWithMethod<E, 'GET'>>(
    path: P,
    token: string,
    params?: ExtractRequestType<E, P, 'GET'>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'GET'>>>;

  /**
   * Authenticated GET request (with string path - for template literals)
   */
  async authenticatedGet(
    path: string,
    token: string,
    params?: any,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<any>>;

  // Implementation
  async authenticatedGet<P extends PathsWithMethod<E, 'GET'>>(
    path: P | string,
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
   * Authenticated POST request (with known path type)
   */
  async authenticatedPost<P extends PathsWithMethod<E, 'POST'>>(
    path: P,
    token: string,
    body: ExtractRequestType<E, P, 'POST'>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'POST'>>>;

  /**
   * Authenticated POST request (with string path - for template literals)
   */
  async authenticatedPost(
    path: string,
    token: string,
    body: any,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<any>>;

  // Implementation
  async authenticatedPost<P extends PathsWithMethod<E, 'POST'>>(
    path: P | string,
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
   * Authenticated PUT request (with known path type)
   */
  async authenticatedPut<P extends PathsWithMethod<E, 'PUT'>>(
    path: P,
    token: string,
    body: ExtractRequestType<E, P, 'PUT'>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'PUT'>>>;

  /**
   * Authenticated PUT request (with string path - for template literals)
   */
  async authenticatedPut(
    path: string,
    token: string,
    body: any,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<any>>;

  // Implementation
  async authenticatedPut<P extends PathsWithMethod<E, 'PUT'>>(
    path: P | string,
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
   * Authenticated DELETE request (with known path type)
   */
  async authenticatedDelete<P extends PathsWithMethod<E, 'DELETE'>>(
    path: P,
    token: string,
    params?: ExtractRequestType<E, P, 'DELETE'>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'DELETE'>>>;

  /**
   * Authenticated DELETE request (with string path - for template literals)
   */
  async authenticatedDelete(
    path: string,
    token: string,
    params?: any,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<any>>;

  // Implementation
  async authenticatedDelete<P extends PathsWithMethod<E, 'DELETE'>>(
    path: P | string,
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
   * Authenticated PATCH request (with known path type)
   */
  async authenticatedPatch<P extends PathsWithMethod<E, 'PATCH'>>(
    path: P,
    token: string,
    body: ExtractRequestType<E, P, 'PATCH'>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'PATCH'>>>;

  /**
   * Authenticated PATCH request (with string path - for template literals)
   */
  async authenticatedPatch(
    path: string,
    token: string,
    body: any,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<any>>;

  // Implementation
  async authenticatedPatch<P extends PathsWithMethod<E, 'PATCH'>>(
    path: P | string,
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
