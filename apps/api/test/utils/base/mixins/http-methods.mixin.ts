/**
 * HTTP Methods Mixin
 * Provides reusable HTTP request methods for integration and controller tests
 * Eliminates duplication between BaseIntegrationTest and BllerTest
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import type { AuthHeaders } from '../../auth/auth-test-helper';
import type { RequestOptions, RequestType } from '../../http/type-safe-http-client';
import {
  buildPath,
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
 */
export class HttpMethodsMixin<
  TModuleName extends string = string,
  E extends Record<string, any> = Endpoints,
> {
  constructor(private readonly host: HttpCapable) {}

  /**
   * Build path with parameters
   */
  private buildPathWithParams(path: string, data?: Record<string, any>): string {
    if (!data || typeof data !== 'object') return path;
    return buildPath(path, data);
  }

  /**
   * Makes a generic HTTP request
   */
  async request<P extends ExtractPaths<E>, M extends ExtractMethods<E, P>>(
    endpoint: P,
    method: M,
    payload?: RequestType<P, M, E>,
    options?: RequestOptions
  ): Promise<request.Test> {
    const { body, params } = payload ?? {};
    const builtPath = this.buildPathWithParams(endpoint, params as any);

    const normalizedMethod = method.toLowerCase();

    // Validate method to prevent object injection
    const allowedMethods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
    if (!allowedMethods.includes(normalizedMethod)) {
      throw new Error(`Invalid HTTP method: ${method}`);
    }

    const agent = request(this.host.application.getHttpServer());
    let req: request.Test;

    // Use explicit switch for type safety and security
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

    if (options?.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        req = req.set(key, value);
      });
    }

    if (params) req = req.query(params);
    if (body) req = req.send(body);
    if (options?.timeout) req = req.timeout(options.timeout);
    if (options?.expectedStatus) req = req.expect(options.expectedStatus);

    return req;
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
