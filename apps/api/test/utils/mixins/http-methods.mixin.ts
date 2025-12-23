/**
 * HTTP Methods Mixin
 * Provides reusable HTTP request methods for integration and controller tests
 * Delegates to TypeSafeHttpClient for core functionality with full type safety
 */

import { INestApplication } from '@nestjs/common';
import {
  type Endpoints,
  type ExtractMethods,
  type ExtractPaths,
  type ExtractResponseType,
  type PathsForRoute,
  type PathsWithMethod,
} from '@routes-helpers';

import {
  type RequestOptions,
  type RequestType,
  type TypedResponse,
  TypeSafeHttpClient,
} from '../http/type-safe-http-client';

import type { AuthHeaders } from './auth.mixin';

/**
 * Interface for classes that can use HTTP methods
 */
export interface HttpCapable {
  readonly application: INestApplication;
  createAuthHeaders(token?: string): Promise<AuthHeaders>;
}

/**
 * HTTP Methods Mixin
 * Can be applied to any class that implements HttpCapable
 *
 * This mixin delegates to TypeSafeHttpClient for core HTTP functionality,
 * providing full type safety and eliminating code duplication.
 * Returns TypedResponse<T> for type-safe response handling.
 */
export class HttpMethodsMixin<
  TModuleName extends string = string,
  E extends Record<string, any> = Endpoints,
> {
  private _httpClient?: TypeSafeHttpClient<TModuleName, E>;

  constructor(private readonly host: HttpCapable) {
    // Don't initialize httpClient here - it will be lazily initialized
    // when first HTTP request is made, after setup() has been called
  }

  /**
   * Lazy getter for httpClient
   * Creates the TypeSafeHttpClient only when first accessed,
   * ensuring the application is initialized
   */
  private get httpClient(): TypeSafeHttpClient<TModuleName, E> {
    this._httpClient ??= new TypeSafeHttpClient<TModuleName, E>(this.host.application);
    return this._httpClient;
  }

  /**
   * Makes a generic HTTP request
   *
   * Delegates to TypeSafeHttpClient for core functionality.
   * Returns TypedResponse<T> for type-safe response handling.
   *
   * @template P - The API path (must exist in Endpoints)
   * @template M - The HTTP method (must be supported by the path)
   * @param endpoint - The API endpoint path
   * @param method - The HTTP method
   * @param payload - Request data (body for POST/PUT/PATCH, params for GET/DELETE)
   * @param options - Additional request options
   * @returns TypedResponse with discriminated union for success/error handling
   */
  async request<P extends ExtractPaths<E>, M extends ExtractMethods<E, P>>(
    endpoint: P,
    method: M,
    payload?: RequestType<P, M, E>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, M>>> {
    return this.httpClient.request(endpoint, method, payload, options);
  }

  // ============================================================================
  // Unauthenticated HTTP Methods
  // ============================================================================

  async get<P extends PathsWithMethod<E, 'GET'>>(
    endpoint: P,
    payload?: RequestType<P, 'GET', E>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'GET'>>> {
    return this.request(endpoint, 'GET', payload, options);
  }

  async post<P extends PathsWithMethod<E, 'POST'>>(
    endpoint: P,
    payload?: RequestType<P, 'POST', E>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'POST'>>> {
    return this.request(endpoint, 'POST', payload, options);
  }

  async put<P extends PathsWithMethod<E, 'PUT'>>(
    endpoint: P,
    payload?: RequestType<P, 'PUT', E>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'PUT'>>> {
    return this.request(endpoint, 'PUT', payload, options);
  }

  async patch<P extends PathsWithMethod<E, 'PATCH'>>(
    endpoint: P,
    payload?: RequestType<P, 'PATCH', E>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'PATCH'>>> {
    return this.request(endpoint, 'PATCH', payload, options);
  }

  async delete<P extends PathsWithMethod<E, 'DELETE'>>(
    endpoint: P,
    payload?: RequestType<P, 'DELETE', E>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'DELETE'>>> {
    return this.request(endpoint, 'DELETE', payload, options);
  }

  // ============================================================================
  // Authenticated HTTP Methods
  // ============================================================================

  /**
   * Makes an authenticated HTTP request
   *
   * Adds authentication headers using the host's createAuthHeaders method,
   * then delegates to the request method.
   *
   * @private
   */
  private async authenticatedRequest<P extends ExtractPaths<E>, M extends ExtractMethods<E, P>>(
    endpoint: P,
    method: M,
    token: string,
    payload?: RequestType<P, M, E>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, M>>> {
    const authHeaders = await this.host.createAuthHeaders(token);
    return this.request(endpoint, method, payload, {
      ...options,
      headers: { ...authHeaders, ...options?.headers },
    });
  }

  async authenticatedGet<P extends PathsWithMethod<E, 'GET'>>(
    endpoint: P,
    token: string,
    payload?: RequestType<P, 'GET', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'GET'>>> {
    return this.authenticatedRequest(endpoint, 'GET', token, payload, options);
  }

  async authenticatedPost<P extends PathsWithMethod<E, 'POST'>>(
    endpoint: P,
    token: string,
    payload?: RequestType<P, 'POST', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'POST'>>> {
    return this.authenticatedRequest(endpoint, 'POST', token, payload, options);
  }

  async authenticatedPut<P extends PathsWithMethod<E, 'PUT'>>(
    endpoint: P,
    token: string,
    payload?: RequestType<P, 'PUT', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'PUT'>>> {
    return this.authenticatedRequest(endpoint, 'PUT', token, payload, options);
  }

  async authenticatedPatch<P extends PathsWithMethod<E, 'PATCH'>>(
    endpoint: P,
    token: string,
    payload?: RequestType<P, 'PATCH', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'PATCH'>>> {
    return this.authenticatedRequest(endpoint, 'PATCH', token, payload, options);
  }

  async authenticatedDelete<P extends PathsWithMethod<E, 'DELETE'>>(
    endpoint: P,
    token: string,
    payload?: RequestType<P, 'DELETE', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'DELETE'>>> {
    return this.authenticatedRequest(endpoint, 'DELETE', token, payload, options);
  }

  // ============================================================================
  // Module-Scoped HTTP Methods
  // ============================================================================

  async moduleGet<P extends PathsForRoute<TModuleName, 'GET', E>>(
    endpoint: P,
    payload?: RequestType<P, 'GET', E>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'GET'>>> {
    return this.request(endpoint, 'GET', payload, options);
  }

  async modulePost<P extends PathsForRoute<TModuleName, 'POST', E>>(
    endpoint: P,
    payload?: RequestType<P, 'POST', E>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'POST'>>> {
    return this.request(endpoint, 'POST', payload, options);
  }

  async modulePut<P extends PathsForRoute<TModuleName, 'PUT', E>>(
    endpoint: P,
    payload?: RequestType<P, 'PUT', E>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'PUT'>>> {
    return this.request(endpoint, 'PUT', payload, options);
  }

  async modulePatch<P extends PathsForRoute<TModuleName, 'PATCH', E>>(
    endpoint: P,
    payload?: RequestType<P, 'PATCH', E>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'PATCH'>>> {
    return this.request(endpoint, 'PATCH', payload, options);
  }

  async moduleDelete<P extends PathsForRoute<TModuleName, 'DELETE', E>>(
    endpoint: P,
    payload?: RequestType<P, 'DELETE', E>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'DELETE'>>> {
    return this.request(endpoint, 'DELETE', payload, options);
  }

  async moduleAuthenticatedGet<P extends PathsForRoute<TModuleName, 'GET', E>>(
    endpoint: P,
    token: string,
    payload?: RequestType<P, 'GET', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'GET'>>> {
    return this.authenticatedRequest(endpoint, 'GET', token, payload, options);
  }

  async moduleAuthenticatedPost<P extends PathsForRoute<TModuleName, 'POST', E>>(
    endpoint: P,
    token: string,
    payload?: RequestType<P, 'POST', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'POST'>>> {
    return this.authenticatedRequest(endpoint, 'POST', token, payload, options);
  }

  async moduleAuthenticatedPut<P extends PathsForRoute<TModuleName, 'PUT', E>>(
    endpoint: P,
    token: string,
    payload?: RequestType<P, 'PUT', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'PUT'>>> {
    return this.authenticatedRequest(endpoint, 'PUT', token, payload, options);
  }

  async moduleAuthenticatedPatch<P extends PathsForRoute<TModuleName, 'PATCH', E>>(
    endpoint: P,
    token: string,
    payload?: RequestType<P, 'PATCH', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'PATCH'>>> {
    return this.authenticatedRequest(endpoint, 'PATCH', token, payload, options);
  }

  async moduleAuthenticatedDelete<P extends PathsForRoute<TModuleName, 'DELETE', E>>(
    endpoint: P,
    token: string,
    payload?: RequestType<P, 'DELETE', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'DELETE'>>> {
    return this.authenticatedRequest(endpoint, 'DELETE', token, payload, options);
  }
}
