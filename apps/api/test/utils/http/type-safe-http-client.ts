import { INestApplication } from '@nestjs/common';
import { buildPath } from '@routes-helpers';
import type {
  DeepPartial,
  Endpoints,
  ExtractMethods,
  ExtractPaths,
  ExtractRequestBody,
  ExtractRequestParams,
  ExtractResponseType,
  HttpMethod,
  PathsWithMethod,
} from '@test-utils';
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
 * Typed Request from an API endpoint
 *
 */
export interface RequestType<
  P extends keyof E,
  M extends HttpMethod,
  E extends Record<string, any> = Endpoints,
> {
  body?: DeepPartial<ExtractRequestBody<E, P, M>>;
  params?: DeepPartial<ExtractRequestParams<E, P, M>>;
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
 * @template TModuleName - Optional module name for module-scoped requests
 * @template E - The Endpoints interface type (defaults to auto-imported Endpoints)
 *
 * @example Basic Usage
 * ```typescript
 * const client = new TypeSafeHttpClient(app);
 *
 * // ✅ Valid: TypeScript validates path, method, and request body
 * const response = await client.post('/api/authentication/user/login', { body: {
 *   email: 'user@example.com',
 *   password: 'password123'
 * }});
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
 *
 * // Option 3: Use the params props
 * const response3 = await client.get('/api/sessions/{id}', {
 *    params: {
 *      id: sessionId
 *    }
 * })
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
 * const newSession = await client.authenticatedPost('/api/sessions', token, { body: {
 *   bookingTypeId: 'booking-123',
 *   timeSlotId: 'slot-456'
 * }});
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
 *
 * @example Module-Scoped Requests
 * ```typescript
 * // Create client with module name for type-safe module-scoped requests
 * const client = new TypeSafeHttpClient(app, 'sessions');
 *
 * // Module-scoped GET (only shows paths for 'sessions' module)
 * const response = await client.moduleGet('/api/sessions');
 *
 * // Module-scoped authenticated POST
 * const newSession = await client.moduleAuthenticatedPost('/api/sessions', token, {
 *   body: { bookingTypeId: 'booking-123' }
 * });
 * ```
 */
export class TypeSafeHttpClient<
  TModuleName extends string = string,
  E extends Record<string, any> = Endpoints,
> {
  /**
   * Create a new TypeSafeHttpClient
   *
   * @param app - NestJS application instance
   * @param moduleName - Optional module name for module-scoped requests
   */
  constructor(
    private app: INestApplication,
    private moduleName?: TModuleName
  ) {}

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
   *
   * @throws {Error} If an invalid HTTP method is provided
   */
  async request<P extends ExtractPaths<E>, M extends ExtractMethods<E, P>>(
    path: P,
    method: M,
    payload?: RequestType<P, M, E>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, M>>> {
    const { body, params } = payload ?? {};

    // Build path with params
    const builtPath = this.buildPathWithParams(path, params as Record<string, string | number>);

    // Normalize and validate method for security
    const normalizedMethod = method.toLowerCase();
    const allowedMethods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
    if (!allowedMethods.includes(normalizedMethod)) {
      throw new Error(`Invalid HTTP method: ${method}`);
    }

    // Build request using explicit switch for type safety and security
    const agent = request(this.app.getHttpServer());
    let req: request.Test;

    switch (normalizedMethod) {
      case 'get':
        req = agent.get(builtPath);
        break;
      case 'post':
        req = agent.post(builtPath);
        break;
      case 'put':
        req = agent.put(builtPath);
        break;
      case 'patch':
        req = agent.patch(builtPath);
        break;
      case 'delete':
        req = agent.delete(builtPath);
        break;
      case 'head':
        req = agent.head(builtPath);
        break;
      case 'options':
        req = agent.options(builtPath);
        break;
      default:
        throw new Error(`Unsupported HTTP method: ${normalizedMethod}`);
    }

    // headers
    if (options?.headers) {
      for (const [k, v] of Object.entries(options.headers)) {
        req = req.set(k, v);
      }
    }

    // body/query
    if (params) req = req.query(params);
    if (body) req = req.send(body);

    if (options?.timeout) req = req.timeout(options.timeout);
    if (options?.expectedStatus) req = req.expect(options.expectedStatus);

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
    payload?: RequestType<P, 'GET', E>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'GET'>>> {
    return this.request(path, 'GET', payload, options);
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
    payload?: RequestType<P, 'POST', E>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'POST'>>> {
    return this.request(path, 'POST', payload, options);
  }

  /**
   * Type-safe PUT request
   */
  async put<P extends PathsWithMethod<E, 'PUT'>>(
    path: P,
    payload?: RequestType<P, 'PUT', E>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'PUT'>>> {
    return this.request(path, 'PUT', payload, options);
  }

  /**
   * Type-safe DELETE request
   */
  async delete<P extends PathsWithMethod<E, 'DELETE'>>(
    path: P,
    payload?: RequestType<P, 'DELETE', E>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'DELETE'>>> {
    return this.request(path, 'DELETE', payload, options);
  }

  /**
   * Type-safe PATCH request
   */
  async patch<P extends PathsWithMethod<E, 'PATCH'>>(
    path: P,
    payload?: RequestType<P, 'PATCH', E>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'PATCH'>>> {
    return this.request(path, 'PATCH', payload, options);
  }

  async authenticatedGet<P extends PathsWithMethod<E, 'GET'>>(
    path: P,
    token: string,
    payload?: RequestType<P, 'GET', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'GET'>>> {
    return this.get(path, payload, {
      ...options,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async authenticatedPost<P extends PathsWithMethod<E, 'POST'>>(
    path: P,
    token: string,
    payload?: RequestType<P, 'POST', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'POST'>>> {
    return this.post(path, payload, {
      ...options,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async authenticatedPut<P extends PathsWithMethod<E, 'PUT'>>(
    path: P,
    token: string,
    payload?: RequestType<P, 'PUT', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'PUT'>>> {
    return this.put(path, payload, {
      ...options,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async authenticatedDelete<P extends PathsWithMethod<E, 'DELETE'>>(
    path: P,
    token: string,
    payload?: RequestType<P, 'DELETE', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'DELETE'>>> {
    return this.delete(path, payload, {
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
    payload?: RequestType<P, 'PATCH', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'PATCH'>>> {
    return this.patch(path, payload, {
      ...options,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  // ============================================================================
  // Module-Scoped HTTP Methods
  // ============================================================================

  /**
   * Type-safe GET request scoped to the module specified in constructor
   *
   * Only allows paths that belong to the module specified when creating the client.
   * Provides additional type safety by restricting available endpoints.
   *
   * @template P - The API path (must be in the module and support GET)
   * @param path - The API endpoint path
   * @param payload - Request payload (params)
   * @param options - Additional request options
   * @returns Typed response with discriminated union
   *
   * @example
   * ```typescript
   * const client = new TypeSafeHttpClient(app, 'sessions');
   * // Only paths starting with /api/sessions are allowed
   * const response = await client.moduleGet('/api/sessions');
   * ```
   */
  async moduleGet<P extends PathsForRoute<TModuleName, 'GET', E>>(
    path: P,
    payload?: RequestType<P, 'GET', E>,
    options?: ons
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'GET'>>> {
    return this.request(path, 'GET', payload, options);
  }

  /**
   * Type-safe POST request scoped to the module
   *
   * @template P - The API path (must be in the module and support POST)
   * @param path - The API endpoint path
   * @param payload - Request payload (body)
   * @param options - Additional request options
   * @returns Typed response with discriminated union
   */
  async modulePost<P extends PathsForRoute<TModuleName, 'POST', E>>(
    path: P,
    payload?: RequestType<P, 'POST', E>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'POST'>>> {
    return this.request(path, 'POST', payload, options);
  }

  /**
   * Type-safe PUT request scoped to the module
   *
   * @template P - The API path (must be in the module and support PUT)
   * @param path - The API endpoint path
   * @param payload - Request payload (body)
   * @param options - Additional request options
   * @returns Typed response with discriminated union
   */
  async modulePut<P extends PathsForRoute<TModuleName, 'PUT', E>>(
    path: P,
    payload?: RequestType<P, 'PUT', E>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'PUT'>>> {
    return this.request(path, 'PUT', payload, options);
  }

  /**
   * Type-safe PATCH request scoped to the module
   *
   * @template P - The API path (must be in the module and support PATCH)
   * @param path - The API endpoint path
   * @param payload - Request payload (body)
   * @param options - Additional request options
   * @returns Typed response with discriminated union
   */
  async modulePatch<P extends PathsForRoute<TModuleName, 'PATCH', E>>(
    path: P,
    payload?: RequestType<P, 'PATCH', E>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'PATCH'>>> {
    return this.request(path, 'PATCH', payload, options);
  }

  /**
   * Type-safe DELETE request scoped to the module
   *
   * @template P - The API path (must be in the module and support DELETE)
   * @param path - The API endpoint path
   * @param payload - Request payload (params)
   * @param options - Additional request options
   * @returns Typed response with discriminated union
   */
  async moduleDelete<P extends PathsForRoute<TModuleName, 'DELETE', E>>(
    path: P,
    payload?: RequestType<P, 'DELETE', E>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'DELETE'>>> {
    return this.request(path, 'DELETE', payload, options);
  }

  /**
   * Type-safe authenticated GET request scoped to the module
   *
   * @template P - The API path (must be in the module and support GET)
   * @param path - The API endpoint path
   * @param token - JWT authentication token
   * @param payload - Request payload (params)
   * @param options - Additional request options (headers will be merged with auth)
   * @returns Typed response with discriminated union
   *
   * @example
   * ```typescript
   * const client = new TypeSafeHttpClient(app, 'sessions');
   * const token = 'jwt-token-here';
   * const response = await client.moduleAuthenticatedGet('/api/sessions', token);
   * ```
   */
  async moduleAuthenticatedGet<P extends PathsForRoute<TModuleName, 'GET', E>>(
    path: P,
    token: string,
    payload?: RequestType<P, 'GET', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'GET'>>> {
    return this.get(path, payload, {
      ...options,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Type-safe authenticated POST request scoped to the module
   *
   * @template P - The API path (must be in the module and support POST)
   * @param path - The API endpoint path
   * @param token - JWT authentication token
   * @param payload - Request payload (body)
   * @param options - Additional request options (headers will be merged with auth)
   * @returns Typed response with discriminated union
   */
  async moduleAuthenticatedPost<P extends PathsForRoute<TModuleName, 'POST', E>>(
    path: P,
    token: string,
    payload?: RequestType<P, 'POST', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'POST'>>> {
    return this.post(path, payload, {
      ...options,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Type-safe authenticated PUT request scoped to the module
   *
   * @template P - The API path (must be in the module and support PUT)
   * @param path - The API endpoint path
   * @param token - JWT authentication token
   * @param payload - Request payload (body)
   * @param options - Additional request options (headers will be merged with auth)
   * @returns Typed response with discriminated union
   */
  async moduleAuthenticatedPut<P extends PathsForRoute<TModuleName, 'PUT', E>>(
    path: P,
    token: string,
    payload?: RequestType<P, 'PUT', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'PUT'>>> {
    return this.put(path, payload, {
      ...options,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Type-safe authenticated PATCH request scoped to the module
   *
   * @template P - The API path (must be in the module and support PATCH)
   * @param path - The API endpoint path
   * @param token - JWT authentication token
   * @param payload - Request payload (body)
   * @param options - Additional request options (headers will be merged with auth)
   * @returns Typed response with discriminated union
   */
  async moduleAuthenticatedPatch<P extends PathsForRoute<TModuleName, 'PATCH', E>>(
    path: P,
    token: string,
    payload?: RequestType<P, 'PATCH', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'PATCH'>>> {
    return this.patch(path, payload, {
      ...options,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Type-safe authenticated DELETE request scoped to the module
   *
   * @template P - The API path (must be in the module and support DELETE)
   * @param path - The API endpoint path
   * @param token - JWT authentication token
   * @param payload - Request payload (params)
   * @param options - Additional request options (headers will be merged with auth)
   * @returns Typed response with discriminated union
   */
  async moduleAuthenticatedDelete<P extends PathsForRoute<TModuleName, 'DELETE', E>>(
    path: P,
    token: string,
    payload?: RequestType<P, 'DELETE', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'DELETE'>>> {
    return this.delete(path, payload, {
      ...options,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Build path with parameters (replace {id} with actual values)
   * @private
   */
  private buildPathWithParams(path: string, data?: Record<string, string | number>): string {
    if (!data || typeof data !== 'object') return path;

    return buildPath(path, data);
  }
}
