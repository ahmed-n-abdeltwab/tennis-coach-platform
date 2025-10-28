import { Request, Response } from 'express';

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
