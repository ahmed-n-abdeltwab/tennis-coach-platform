import { getMockRes } from '@jest-mock/express';
import { Request } from 'express';

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
export type MockResponse = ReturnType<typeof getMockRes>['res'];
