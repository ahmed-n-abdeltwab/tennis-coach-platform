/**
 * Type-Safe API Client for Production Use
 *
 * A type-safe HTTP client using axios for making API requests from web applications.
 * Provides compile-time validation of paths, methods, request data, and response types.
 *
 * @module client/api-client
 */

import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';

import type { HttpMethod } from '../interfaces/IRoutes';
import {
  buildPath,
  type ExtractMethods,
  type ExtractPaths,
  type ExtractRequestBody,
  type ExtractRequestParams,
  type ExtractResponseType,
  type PathsWithMethod,
} from '../utils/type-utils';

/**
 * Configuration options for ApiClient
 */
export interface ApiClientConfig {
  /** Base URL for all API requests (e.g., 'https://api.example.com') */
  baseURL: string;
  /** Default headers to include in all requests */
  headers?: Record<string, string>;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Whether to include credentials (cookies) in requests */
  withCredentials?: boolean;
}

/**
 * Options for individual API requests
 */
export interface RequestOptions {
  /** Additional headers for this specific request */
  headers?: Record<string, string>;
  /** Request timeout in milliseconds (overrides default) */
  timeout?: number;
  /** Abort signal for request cancellation */
  signal?: AbortSignal;
}

/**
 * Success response from API
 */
export interface ApiSuccessResponse<T> {
  /** Response data */
  data: T;
  /** HTTP status code */
  status: number;
  /** Response headers */
  headers: Record<string, string>;
  /** Indicates success */
  ok: true;
}

/**
 * Error response from API
 */
export interface ApiErrorResponse {
  /** Error data from server */
  error: {
    statusCode: number;
    message: string | string[];
    error?: string;
  };
  /** HTTP status code */
  status: number;
  /** Response headers */
  headers: Record<string, string>;
  /** Indicates failure */
  ok: false;
}

/**
 * Union type for API responses
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Request payload type
 */
export interface ApiRequestPayload<
  P extends keyof E,
  M extends HttpMethod,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  E extends Record<string, any> = Endpoints,
> {
  /** Request body data */
  body?: ExtractRequestBody<P, M, E>;
  /** URL parameters (path params and query params) */
  params?: ExtractRequestParams<P, M, E>;
}

/**
 * Type-safe API client for production use
 *
 * @template E - The Endpoints interface type (defaults to auto-imported Endpoints)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class ApiClient<E extends Record<string, any> = Endpoints> {
  private readonly axios: AxiosInstance;

  constructor(config: ApiClientConfig) {
    this.axios = axios.create({
      baseURL: config.baseURL,
      headers: config.headers,
      timeout: config.timeout,
      withCredentials: config.withCredentials,
    });
  }

  /** Set the authorization header for all subsequent requests */
  setAuthToken(token: string): void {
    this.axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /** Clear the authorization header */
  clearAuthToken(): void {
    delete this.axios.defaults.headers.common['Authorization'];
  }

  /** Set a default header for all subsequent requests */
  setHeader(name: string, value: string): void {
    this.axios.defaults.headers.common[name] = value;
  }

  /** Make a type-safe request to any endpoint */
  async request<P extends ExtractPaths<E>, M extends ExtractMethods<P, E>>(
    path: P,
    method: M,
    payload?: ApiRequestPayload<P, M, E>,
    options?: RequestOptions
  ): Promise<ApiResponse<ExtractResponseType<P, M, E>>> {
    const { body, params } = payload ?? {};
    const builtPath = params ? buildPath(path, params as Record<string, string | number>) : path;

    const config: AxiosRequestConfig = {
      method: method.toLowerCase(),
      url: builtPath,
      data: body,
      headers: options?.headers,
      timeout: options?.timeout,
      signal: options?.signal,
    };

    if ((method === 'GET' || method === 'DELETE') && params) {
      const pathParamNames = this.extractPathParamNames(path);
      const queryParams = Object.fromEntries(
        Object.entries(params as Record<string, unknown>).filter(
          ([key]) => !pathParamNames.includes(key)
        )
      );
      if (Object.keys(queryParams).length > 0) {
        config.params = queryParams;
      }
    }

    try {
      const response: AxiosResponse = await this.axios.request(config);
      return {
        data: response.data as ExtractResponseType<P, M, E>,
        status: response.status,
        headers: response.headers as Record<string, string>,
        ok: true,
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return {
          error: error.response.data ?? {
            statusCode: error.response.status,
            message: error.message,
          },
          status: error.response.status,
          headers: error.response.headers as Record<string, string>,
          ok: false,
        };
      }
      return {
        error: {
          statusCode: 0,
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        status: 0,
        headers: {},
        ok: false,
      };
    }
  }

  private extractPathParamNames(path: string): string[] {
    const matches = path.match(/\{([^}]+)\}/g);
    return matches ? matches.map(m => m.slice(1, -1)) : [];
  }

  /** Type-safe GET request */
  async get<P extends PathsWithMethod<'GET', E>>(
    path: P,
    payload?: ApiRequestPayload<P, 'GET', E>,
    options?: RequestOptions
  ): Promise<ApiResponse<ExtractResponseType<P, 'GET', E>>> {
    return this.request(path, 'GET', payload, options);
  }

  /** Type-safe POST request */
  async post<P extends PathsWithMethod<'POST', E>>(
    path: P,
    payload?: ApiRequestPayload<P, 'POST', E>,
    options?: RequestOptions
  ): Promise<ApiResponse<ExtractResponseType<P, 'POST', E>>> {
    return this.request(path, 'POST', payload, options);
  }

  /** Type-safe PUT request */
  async put<P extends PathsWithMethod<'PUT', E>>(
    path: P,
    payload?: ApiRequestPayload<P, 'PUT', E>,
    options?: RequestOptions
  ): Promise<ApiResponse<ExtractResponseType<P, 'PUT', E>>> {
    return this.request(path, 'PUT', payload, options);
  }

  /** Type-safe PATCH request */
  async patch<P extends PathsWithMethod<'PATCH', E>>(
    path: P,
    payload?: ApiRequestPayload<P, 'PATCH', E>,
    options?: RequestOptions
  ): Promise<ApiResponse<ExtractResponseType<P, 'PATCH', E>>> {
    return this.request(path, 'PATCH', payload, options);
  }

  /** Type-safe DELETE request */
  async delete<P extends PathsWithMethod<'DELETE', E>>(
    path: P,
    payload?: ApiRequestPayload<P, 'DELETE', E>,
    options?: RequestOptions
  ): Promise<ApiResponse<ExtractResponseType<P, 'DELETE', E>>> {
    return this.request(path, 'DELETE', payload, options);
  }
}
