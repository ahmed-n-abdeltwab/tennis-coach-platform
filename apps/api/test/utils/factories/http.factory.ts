/**
 * HTTP mock factory for creating test HTTP request/response data
 */

import { getMockReq, getMockRes } from '@jest-mock/express';
import { Request, Response } from 'express';
import { ParsedQs } from 'qs';

import { BaseMockFactory } from './base-factory';

export interface MockRequest<
  Body = Record<string, any>,
  Query = Record<string, any>,
  Params = Record<string, string>,
> extends Partial<Request<Params, any, Body, Query>> {
  body?: Body;
  query?: Query;
  params?: Params;
  headers?: Record<string, string>;
  user?: Record<string, any>;
  files?: any[];
}

export interface MockHttpResponse<T = any> {
  statusCode: number;
  data?: T;
  message?: string | string[];
  error?: string;
  timestamp: string;
  path?: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface MockRequestOverrides {
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
  params?: Record<string, string>;
  headers?: Record<string, string>;
  user?: Record<string, unknown>;
  files?: unknown[];
  method?: string;
  url?: string;
  path?: string;
}

export interface CreateRequestOptions {
  method?: string;
  url?: string;
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
  params?: Record<string, string>;
  headers?: Record<string, string>;
  user?: Record<string, unknown>;
  files?: unknown[];
}

/**
 * Base HTTP mock factory
 */
export class HttpMockFactory extends BaseMockFactory<Request> {
  /** Create a mock Request */
  protected generateMock(overrides: Partial<Request> = {}): Request {
    const req = getMockReq();

    req.method = overrides.method ?? 'GET';
    req.url = overrides.url ?? '/test';
    req.body = overrides.body ?? {};
    req.params = overrides.params ?? {};
    req.query = (overrides.query as ParsedQs) ?? {};
    req.headers = overrides.headers ?? {};
    // user and files are custom
    if (overrides.user) req.user = overrides.user;
    const overridesWithFiles = overrides as Request & { files?: unknown[] };
    if (overridesWithFiles.files) {
      (req as Request & { files?: unknown[] }).files = overridesWithFiles.files;
    }

    return req;
  }

  createRequest(options: CreateRequestOptions = {}): Request {
    const { body, query, params, headers, method, url, user, files } = options;

    return this.create({
      body,
      query: query as ParsedQs,
      params,
      headers,
      method,
      url,
      ...(user && { user }),
      ...(files && { files }),
    } as Partial<Request>);
  }

  /** Create a mock Response */
  createResponse(): Response {
    return getMockRes().res;
  }

  createAuthenticatedRequest(
    user: Record<string, unknown>,
    overrides: Partial<CreateRequestOptions> = {}
  ): Request {
    return this.createRequest({
      ...overrides,
      user,
      headers: {
        Authorization: 'Bearer mock-token',
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

  /** Generic success response */
  createSuccessResponse<T = unknown>(data?: T, statusCode = 200): MockHttpResponse<T> {
    return {
      statusCode,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /** Generic error response */
  createErrorResponse(
    message: string | string[],
    statusCode = 400,
    path = '/test'
  ): MockHttpResponse {
    return {
      statusCode,
      error: this.getErrorName(statusCode),
      message,
      timestamp: new Date().toISOString(),
      path,
    };
  }

  /** Validation error response */
  createValidationErrorResponse(messages: string | string[], path = '/test'): MockHttpResponse {
    return {
      statusCode: 400,
      error: 'Bad Request',
      message: messages,
      timestamp: new Date().toISOString(),
      path,
    };
  }

  /** Paginated response helper */
  createPaginatedResponse<T = unknown>(
    data: T[],
    page = 1,
    limit = 10,
    totalItems = data.length
  ): MockHttpResponse<T[]> {
    const totalPages = Math.ceil(totalItems / limit);
    return {
      statusCode: 200,
      data,
      timestamp: new Date().toISOString(),
      meta: {
        page,
        limit,
        total: totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  private getErrorName(statusCode: number): string {
    const map: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      500: 'Internal Server Error',
    };

    return map[statusCode] ?? 'Error';
  }
}
