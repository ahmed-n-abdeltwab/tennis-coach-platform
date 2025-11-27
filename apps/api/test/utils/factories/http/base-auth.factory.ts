import { getMockReq, getMockRes } from '@jest-mock/express';
import { Request, Response } from 'express';
import { ParsedQs } from 'qs';

import { MockHttpResponse } from '../../mocks/http.mock';
import { BaseMockFactory } from '../base-factory';

/**
 * Base HTTP mock factory
 */
export class BaseHttpMockFactory extends BaseMockFactory<Request> {
  /** Create a mock Request */
  override create(overrides: Partial<Request> = {}): Request {
    const req = getMockReq();

    req.method = overrides.method ?? 'GET';
    req.url = overrides.url ?? '/test';
    req.body = overrides.body ?? {};
    req.params = overrides.params ?? {};
    req.query = (overrides.query as ParsedQs) ?? {};
    req.headers = overrides.headers ?? {};
    // user and files are custom
    if (overrides.user) req.user = overrides.user;
    if ((overrides as any).files) (req as any).files = (overrides as any).files;

    return req;
  }

  /** Create a mock Response */
  createResponse(): Response {
    return getMockRes().res;
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
