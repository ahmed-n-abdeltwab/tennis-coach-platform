import { OperationObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";

export interface ExtractedRoute {
  method: string;
  path: string;
  operation: OperationObject;
}

export interface HttpErrorTestCase {
  name: string;
  statusCode: number;
  errorMessage?: string;
  errorCode?: string;
}

export interface HttpTestResponse {
  status: number;
  body: any;
  headers: Record<string, string>;
}

export interface HttpRequestOptions {
  headers?: Record<string, string>;
  query?: Record<string, any>;
  timeout?: number;
  Redirects?: boolean;
  followRedirects?: boolean;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface RequestData {
  headers?: Record<string, any>;
  body?: any;
  query?: Record<string, any>;
}

export interface ResponseData {
  status: number;
  headers?: Record<string, any>;
  body?: {
    required?: string[];
    optional?: string[];
    types?: Record<string, any>;
  };
}
