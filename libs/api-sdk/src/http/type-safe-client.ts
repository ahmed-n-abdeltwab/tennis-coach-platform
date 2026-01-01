/**
 * Type-Safe HTTP Client
 *
 * A type-safe HTTP client for testing API endpoints with compile-time validation
 * of paths, methods, request data, and response types.
 *
 * @module http/type-safe-client
 */

import type { Endpoints } from '@contracts';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import type { HttpMethod } from '../interfaces/IRoutes';
import {
  buildPath,
  type ExtractMethods,
  type ExtractPaths,
  type ExtractRequestBody,
  type ExtractRequestParams,
  type ExtractResponseType,
  type PathsForRoute,
  type PathsWithMethod,
} from '../utils/type-utils';

/**
 * DeepPartial utility type
 * Makes all properties of an object optional recursively
 */
export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

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
  /** Enable runtime validation of requesnse data */
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
 */
export interface RequestType<
  P extends keyof E,
  M extends HttpMethod,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
 */
export class TypeSafeHttpClient<
  TModuleName extends string = string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
   */
  async get<P extends PathsWithMethod<E, 'GET'>>(
    path: P,
    payload?: RequestType<P, 'GET', E>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'GET'>>> {
    return this.request(path, 'GET', payload, options);
  }

  /**
 Type-safe POST request
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

  /**
   * Type-safe GET request scoped to the module specified in constructor
   */
  async moduleGet<P extends PathsForRoute<TModuleName, 'GET', E>>(
    path: P,
    payload?: RequestType<P, 'GET', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'GET'>>> {
    return this.request(path, 'GET', payload, options);
  }

  /**
   * Type-safe POST request scoped to the module
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
   */
  async moduleAuthenticatedGet<P extends PathsForRoute<TModuleName, 'GET', E>>(
    path: P,
    token: string,
    payload?: RequestType<P, 'GET', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'GET'>>> {
    return this.request(path, 'GET', payload, {
      ...options,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Type-safe authenticated POST request scoped to the module
   */
  async moduleAuthenticatedPost<P extends PathsForRoute<TModuleName, 'POST', E>>(
    path: P,
    token: string,
    payload?: RequestType<P, 'POST', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'POST'>>> {
    return this.request(path, 'POST', payload, {
      ...options,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Type-safe authenticated PUT request scoped to the module
   */
  async moduleAuthenticatedPut<P extends PathsForRoute<TModuleName, 'PUT', E>>(
    path: P,
    token: string,
    payload?: RequestType<P, 'PUT', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'PUT'>>> {
    return this.request(path, 'PUT', payload, {
      ...options,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Type-safe authenticated PATCH request scoped to the module
   */
  async moduleAuthenticatedPatch<P extends PathsForRoute<TModuleName, 'PATCH', E>>(
    path: P,
    token: string,
    payload?: RequestType<P, 'PATCH', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'PATCH'>>> {
    return this.request(path, 'PATCH', payload, {
      ...options,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Type-safe authenticated DELETE request scoped to the module
   */
  async moduleAuthenticatedDelete<P extends PathsForRoute<TModuleName, 'DELETE', E>>(
    path: P,
    token: string,
    payload?: RequestType<P, 'DELETE', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'DELETE'>>> {
    return this.request(path, 'DELETE', payload, {
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
