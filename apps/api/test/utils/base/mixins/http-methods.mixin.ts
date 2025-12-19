/**
 * HTTP Methods Mixin
 * Provides reusable HTTP request methods for integration and controller tests
 * Delegates to TypeSafeHttpClient for core functionality while maintaining backward compatibility
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import type { AuthHeaders } from '../../auth/auth-test-helper';
import type { RequestOptions, RequestType } from '../../http/type-safe-http-client';
import { TypeSafeHttpClient } from '../../http/type-safe-http-client';
import {
  type Endpoints,
  type ExtractMethods,
  type ExtractPaths,
  type PathsForRoute,
  type PathsWithMethod,
} from '../../types/type-utils';

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
 * eliminating code duplication while maintaining backward compatibility.
 * Returns supertest's request.Test for compatibility with existing tests.
 */
export class HttpMethodsMixin<
  TModuleName extends string = string,
  E extends Record<string, any> = Endpoints,
> {
  private readonly httpClient: TypeSafeHttpClient<TModuleName, E>;

  constructor(private readonly host: HttpCapable) {
    this.httpClient = new TypeSafeHttpClient<TModuleName, E>(host.application);
  }

  /**
   * Makes a generic HTTP request
   *
   * Delegates to TypeSafeHttpClient for core functionality.
   * Returns supertest's request.Test for backward compatibility with existing tests.
   *
   * @template P - The API path (must exist in Endpoints)
   * @template M - The HTTP method (must be supported by the path)
   * @param endpoint - The API endpoint path
   * @param method - The HTTP method
   * @param payload - Request data (body for POST/PUT/PATCH, params for GET/DELETE)
   * @param options - Additional request options
   * @returns Supertest request.Test object for chaining assertions
   */
  async request<P extends ExtractPaths<E>, M extends ExtractMethods<E, P>>(
    endpoint: P,
    method: M,
    payload?: RequestType<P, M, E>,
    options?: RequestOptions
  ): Promise<request.Test> {
    // Delegate to TypeSafeHttpClient which handles:
    // - Method validation
    // - Path building
    // - Request construction
    // - Security validation
    const response = await this.httpClient.request(endpoint, method, payload, options);

    // Transform TypedResponse back to supertest format for backward compatibility
    // This allows existing tests to continue using .expect() and other supertest methods
    const mockTest = {
      status: response.status,
      body: response.body,
      headers: response.headers,
      ok: response.ok,
    } as unknown as request.Test;

    return mockTest;
  }

  // ============================================================================
  // Unauthenticated HTTP Methods
  // ============================================================================

  async get<P extends PathsWithMethod<E, 'GET'>>(
    endpoint: P,
    payload?: RequestType<P, 'GET', E>,
    options?: RequestOptions
  ): Promise<request.Test> {
    return this.request(endpoint, 'GET', payload, options);
  }

  async post<P extends PathsWithMethod<E, 'POST'>>(
    endpoint: P,
    payload?: RequestType<P, 'POST', E>,
    options?: RequestOptions
  ): Promise<request.Test> {
    return this.request(endpoint, 'POST', payload, options);
  }

  async put<P extends PathsWithMethod<E, 'PUT'>>(
    endpoint: P,
    payload?: RequestType<P, 'PUT', E>,
    options?: RequestOptions
  ): Promise<request.Test> {
    return this.request(endpoint, 'PUT', payload, options);
  }

  async patch<P extends PathsWithMethod<E, 'PATCH'>>(
    endpoint: P,
    payload?: RequestType<P, 'PATCH', E>,
    options?: RequestOptions
  ): Promise<request.Test> {
    return this.request(endpoint, 'PATCH', payload, options);
  }

  async delete<P extends PathsWithMethod<E, 'DELETE'>>(
    endpoint: P,
    payload?: RequestType<P, 'DELETE', E>,
    options?: RequestOptions
  ): Promise<request.Test> {
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
  ): Promise<request.Test> {
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
  ): Promise<request.Test> {
    return this.authenticatedRequest(endpoint, 'GET', token, payload, options);
  }

  async authenticatedPost<P extends PathsWithMethod<E, 'POST'>>(
    endpoint: P,
    token: string,
    payload?: RequestType<P, 'POST', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<request.Test> {
    return this.authenticatedRequest(endpoint, 'POST', token, payload, options);
  }

  async authenticatedPut<P extends PathsWithMethod<E, 'PUT'>>(
    endpoint: P,
    token: string,
    payload?: RequestType<P, 'PUT', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<request.Test> {
    return this.authenticatedRequest(endpoint, 'PUT', token, payload, options);
  }

  async authenticatedPatch<P extends PathsWithMethod<E, 'PATCH'>>(
    endpoint: P,
    token: string,
    payload?: RequestType<P, 'PATCH', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<request.Test> {
    return this.authenticatedRequest(endpoint, 'PATCH', token, payload, options);
  }

  async authenticatedDelete<P extends PathsWithMethod<E, 'DELETE'>>(
    endpoint: P,
    token: string,
    payload?: RequestType<P, 'DELETE', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<request.Test> {
    return this.authenticatedRequest(endpoint, 'DELETE', token, payload, options);
  }

  // ============================================================================
  // Module-Scoped HTTP Methods
  // ============================================================================

  async moduleGet<P extends PathsForRoute<TModuleName, 'GET', E>>(
    endpoint: P,
    payload?: RequestType<P, 'GET', E>,
    options?: RequestOptions
  ): Promise<request.Test> {
    return this.request(endpoint, 'GET', payload, options);
  }

  async modulePost<P extends PathsForRoute<TModuleName, 'POST', E>>(
    endpoint: P,
    payload?: RequestType<P, 'POST', E>,
    options?: RequestOptions
  ): Promise<request.Test> {
    return this.request(endpoint, 'POST', payload, options);
  }

  async modulePut<P extends PathsForRoute<TModuleName, 'PUT', E>>(
    endpoint: P,
    payload?: RequestType<P, 'PUT', E>,
    options?: RequestOptions
  ): Promise<request.Test> {
    return this.request(endpoint, 'PUT', payload, options);
  }

  async modulePatch<P extends PathsForRoute<TModuleName, 'PATCH', E>>(
    endpoint: P,
    payload?: RequestType<P, 'PATCH', E>,
    options?: RequestOptions
  ): Promise<request.Test> {
    return this.request(endpoint, 'PATCH', payload, options);
  }

  async moduleDelete<P extends PathsForRoute<TModuleName, 'DELETE', E>>(
    endpoint: P,
    payload?: RequestType<P, 'DELETE', E>,
    options?: RequestOptions
  ): Promise<request.Test> {
    return this.request(endpoint, 'DELETE', payload, options);
  }

  async moduleAuthenticatedGet<P extends PathsForRoute<TModuleName, 'GET', E>>(
    endpoint: P,
    token: string,
    payload?: RequestType<P, 'GET', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<request.Test> {
    return this.authenticatedRequest(endpoint, 'GET', token, payload, options);
  }

  async moduleAuthenticatedPost<P extends PathsForRoute<TModuleName, 'POST', E>>(
    endpoint: P,
    token: string,
    payload?: RequestType<P, 'POST', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<request.Test> {
    return this.authenticatedRequest(endpoint, 'POST', token, payload, options);
  }

  async moduleAuthenticatedPut<P extends PathsForRoute<TModuleName, 'PUT', E>>(
    endpoint: P,
    token: string,
    payload?: RequestType<P, 'PUT', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<request.Test> {
    return this.authenticatedRequest(endpoint, 'PUT', token, payload, options);
  }

  async moduleAuthenticatedPatch<P extends PathsForRoute<TModuleName, 'PATCH', E>>(
    endpoint: P,
    token: string,
    payload?: RequestType<P, 'PATCH', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<request.Test> {
    return this.authenticatedRequest(endpoint, 'PATCH', token, payload, options);
  }

  async moduleAuthenticatedDelete<P extends PathsForRoute<TModuleName, 'DELETE', E>>(
    endpoint: P,
    token: string,
    payload?: RequestType<P, 'DELETE', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<request.Test> {
    return this.authenticatedRequest(endpoint, 'DELETE', token, payload, options);
  }
}
