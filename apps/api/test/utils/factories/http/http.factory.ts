import { Request } from 'express';
import { BaseHttpMockFactory } from './base-auth.factory';
export interface CreateRequestOptions {
  method?: string;
  url?: string;
  body?: Record<string, any>;
  query?: Record<string, any>;
  params?: Record<string, string>;
  headers?: Record<string, string>;
  user?: any;
  files?: any[];
}
/**
 * Extended HTTP mock factory with convenient helpers
 */
export class HttpMockFactory extends BaseHttpMockFactory {
  createRequest(options: CreateRequestOptions = {}): Request {
    const { body, query, params, headers, method, url, user, files } = options;

    return this.create({
      body,
      query,
      params,
      headers,
      method,
      url,
      ...(user && { user }),
      ...(files && { files }),
    });
  }

  createAuthenticatedRequest(
    user: Record<string, unknown>,
    overrides: Partial<CreateRequestOptions> = {}
  ): Request {
    return this.createRequest({
      ...overrides,
      user,
      headers: {
        authorization: 'Bearer mock-token',
        ...(overrides.headers ?? {}),
      },
    });
  }

  createJsonRequest(
    body: Record<string, unknown>,
    overrides: Partial<CreateRequestOptions> = {}
  ): Request {
    return this.createRequest({
      ...overrides,
      body,
      headers: {
        'content-type': 'application/json',
        ...(overrides.headers ?? {}),
      },
    });
  }

  createFormRequest(
    body: Record<string, unknown>,
    overrides: Partial<CreateRequestOptions> = {}
  ): Request {
    return this.createRequest({
      ...overrides,
      body,
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        ...overrides.headers,
      },
    });
  }

  createMultipartRequest(files: unknown[], overrides: Partial<CreateRequestOptions> = {}): Request {
    return this.createRequest({
      ...overrides,
      headers: {
        'content-type': 'multipart/form-data',
        ...overrides.headers,
      },
      ...(files && { files }),
    });
  }
}
