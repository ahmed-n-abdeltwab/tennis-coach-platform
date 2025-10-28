/**
 * HTTP mock factory for creating test HTTP requests and responses
 */

import { Request, Response } from 'express';
import { BaseMockFactory } from './base-factory';

export interface MockRequest extends Partial<Request> {
  body?: any;
  params?: any;
  query?: any;
  headers?: any;
  user?: any;
  files?: any;
}

export interface MockResponse extends Partial<Response> {
  status: jest.Mock;
  json: jest.Mock;
  send: jest.Mock;
  cookie: jest.Mock;
  clearCookie: jest.Mock;
}

export interface MockHttpResponse {
  statusCode: number;
  data?: any;
  message?: string[] | string;
  error?: string;
  timestamp?: string;
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

export class HttpMockFactory extends BaseMockFactory<MockRequest> {
  create(overrides?: Partial<MockRequest>): MockRequest {
    return {
      body: {},
      params: {},
      query: {},
      headers: {
        'content-type': 'application/json',
        'user-agent': 'test-agent',
      },
      method: 'GET',
      url: '/test',
      path: '/test',
      ...overrides,
    };
  }

  createRequest(overrides?: Partial<MockRequest>): MockRequest {
    return this.create(overrides);
  }

  createAuthenticatedRequest(user: any, overrides?: Partial<MockRequest>): MockRequest {
    return this.create({
      user,
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer mock-token',
        ...overrides?.headers,
      },
      ...overrides,
    });
  }

  createPostRequest(body: any, overrides?: Partial<MockRequest>): MockRequest {
    return this.create({
      method: 'POST',
      body,
      ...overrides,
    });
  }

  createGetRequest(query?: any, overrides?: Partial<MockRequest>): MockRequest {
    return this.create({
      method: 'GET',
      query: query || {},
      ...overrides,
    });
  }

  createPutRequest(body: any, params?: any, overrides?: Partial<MockRequest>): MockRequest {
    return this.create({
      method: 'PUT',
      body,
      params: params || {},
      ...overrides,
    });
  }

  createDeleteRequest(params?: any, overrides?: Partial<MockRequest>): MockRequest {
    return this.create({
      method: 'DELETE',
      params: params || {},
      ...overrides,
    });
  }

  createResponse(): MockResponse {
    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    } as MockResponse;

    return mockResponse;
  }

  createSuccessResponse(data?: any, statusCode = 200): MockHttpResponse {
    return {
      statusCode,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  createErrorResponse(
    message: string[] | string,
    statusCode = 400,
    path?: string
  ): MockHttpResponse {
    return {
      statusCode,
      error: this.getErrorName(statusCode),
      message,
      timestamp: new Date().toISOString(),
      path: path || '/test',
    };
  }

  createValidationErrorResponse(messages: string[] | string, path?: string): MockHttpResponse {
    return {
      statusCode: 400,
      error: 'Bad Request',
      message: messages,
      timestamp: new Date().toISOString(),
      path: path || '/test',
    };
  }

  createPaginatedResponse(data: any[], page = 1, limit = 10, total?: number): MockHttpResponse {
    const totalItems = total || data.length;
    const totalPages = Math.ceil(totalItems / limit);

    return {
      statusCode: 200,
      data,
      meta: {
        page,
        limit,
        total: totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      timestamp: new Date().toISOString(),
    };
  }

  // Helper methods for common HTTP scenarios
  createMultipartRequest(files: any[], overrides?: Partial<MockRequest>): MockRequest {
    return this.create({
      files,
      headers: {
        'content-type': 'multipart/form-data',
        ...overrides?.headers,
      },
      ...overrides,
    });
  }

  createJsonRequest(body: any, overrides?: Partial<MockRequest>): MockRequest {
    return this.create({
      body,
      headers: {
        'content-type': 'application/json',
        ...overrides?.headers,
      },
      ...overrides,
    });
  }

  createFormRequest(body: any, overrides?: Partial<MockRequest>): MockRequest {
    return this.create({
      body,
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        ...overrides?.headers,
      },
      ...overrides,
    });
  }

  private getErrorName(statusCode: number): string {
    const errorNames: { [key: number]: string } = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      500: 'Internal Server Error',
    };

    return errorNames[statusCode] || 'Error';
  }
}
