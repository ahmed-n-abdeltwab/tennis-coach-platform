/**
 * HTTP Testing Utilities with comprehensive error handling
 * Provides utilities for testing HTTP requests, responses, and error scenarios
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';

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

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

type RequestData = {
  headers?: Record<string, any>;
  body?: any;
  query?: Record<string, any>;
};

type ResponseData = {
  status: number;
  headers?: Record<string, any>;
  body?: {
    required?: string[];
    optional?: string[];
    types?: Record<string, any>;
  };
};

export type ApiContract = {
  request?: RequestData;
  response: ResponseData;
};


/**
 * Enhanced HTTP Testing Helper with error handling
 */
export class EnhancedHttpTestHelper {
  constructor(private app: INestApplication) {}

  /**
   * Makes a request with comprehensive error handling
   */
  async makeRequest(
    method: HttpMethod,
    endpoint: string,
    data?: any,
    options: HttpRequestOptions = {}
  ): Promise<request.Response> {
    let req = request(this.app.getHttpServer())[method.toLowerCase()](endpoint);

    // Add data for POST, PUT, PATCH requests
    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      req = req.send(data);
    }

    // Add headers
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        req = req.set(key, value);
      });
    }

    // Add query parameters
    if (options.query) {
      req = req.query(options.query);
    }

    // Set timeout
    if (options.timeout) {
      req = req.timeout(options.timeout);
    }

    // Handle redirects
    if (options.followRedirects === false) {
      req = req.redirects(0);
    }

    return req;
  }

  /**
   * GET request with error handling
   */
  async get(endpoint: string, options: HttpRequestOptions = {}): Promise<request.Response> {
    return this.makeRequest('GET', endpoint, undefined, options);
  }

  /**
   * POST request with error handling
   */
  async post(
    endpoint: string,
    data?: any,
    options: HttpRequestOptions = {}
  ): Promise<request.Response> {
    return this.makeRequest('POST', endpoint, data, options);
  }

  /**
   * PUT request with error handling
   */
  async put(
    endpoint: string,
    data?: any,
    options: HttpRequestOptions = {}
  ): Promise<request.Response> {
    return this.makeRequest('PUT', endpoint, data, options);
  }

  /**
   * DELETE request with error handling
   */
  async delete(endpoint: string, options: HttpRequestOptions = {}): Promise<request.Response> {
    return this.makeRequest('DELETE', endpoint, undefined, options);
  }

  /**
   * PATCH request with error handling
   */
  async patch(
    endpoint: string,
    data?: any,
    options: HttpRequestOptions = {}
  ): Promise<request.Response> {
    return this.makeRequest('PATCH', endpoint, data, options);
  }

  /**
   * Tests multiple error scenarios for an endpoint
   */
  async testErrorScenarios(
    endpoint: string,
    method: HttpMethod,
    errorCases: HttpErrorTestCase[],
    data?: any,
    options: HttpRequestOptions = {}
  ): Promise<void> {
    for (const errorCase of errorCases) {
      const response = await this.makeRequest(method, endpoint, data, options);

      expect(response.status).toBe(errorCase.statusCode);

      if (errorCase.errorMessage) {
        expect(response.body.message).toContain(errorCase.errorMessage);
      }

      if (errorCase.errorCode) {
        expect(response.body.error).toBe(errorCase.errorCode);
      }
    }
  }

  /**
   * Tests that an endpoint returns expected status codes for different scenarios
   */
  async testStatusCodes(
    endpoint: string,
    method: HttpMethod,
    scenarios: Array<{
      name: string;
      data?: any;
      options?: HttpRequestOptions;
      expectedStatus: number;
    }>
  ): Promise<void> {
    for (const scenario of scenarios) {
      const response = await this.makeRequest(
        method,
        endpoint,
        scenario.data,
        scenario.options || {}
      );

      expect(response.status).toBe(scenario.expectedStatus);
    }
  }

  /**
   * Tests response headers
   */
  async testResponseHeaders(
    endpoint: string,
    method: HttpMethod,
    expectedHeaders: Record<string, any>,
    data?: any,
    options: HttpRequestOptions = {}
  ): Promise<void> {
    const response = await this.makeRequest(method, endpoint, data, options);

    Object.entries(expectedHeaders).forEach(([headerName, expectedValue]) => {
      const actualValue = response.headers[headerName.toLowerCase()];

      if (expectedValue instanceof RegExp) {
        expect(actualValue).toMatch(expectedValue);
      } else {
        expect(actualValue).toBe(expectedValue);
      }
    });
  }

  /**
   * Tests response body structure
   */
  async testResponseStructure(
    endpoint: string,
    method: HttpMethod,
    expectedStructure: Record<string, any>,
    data?: any,
    options: HttpRequestOptions = {}
  ): Promise<request.Response> {
    const response = await this.makeRequest(method, endpoint, data, options);

    // Check if response body has expected structure
    Object.keys(expectedStructure).forEach(key => {
      expect(response.body).toHaveProperty(key);
    });

    return response;
  }

  /**
   * Tests pagination endpoints
   */
  async testPagination(
    endpoint: string,
    paginationParams: {
      page?: number;
      limit?: number;
      offset?: number;
    } = {},
    options: HttpRequestOptions = {}
  ): Promise<void> {
    const queryOptions = {
      ...options,
      query: { ...options.query, ...paginationParams },
    };

    const response = await this.get(endpoint, queryOptions);

    // Check pagination structure
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('meta');
    expect(response.body.meta).toHaveProperty('total');
    expect(response.body.meta).toHaveProperty('page');
    expect(response.body.meta).toHaveProperty('limit');

    // Validate data is an array
    expect(Array.isArray(response.body.data)).toBe(true);
  }

  /**
   * Tests CORS headers
   */
  async testCorsHeaders(
    endpoint: string,
    method: HttpMethod = 'GET',
    origin: string = 'http://localhost:3000'
  ): Promise<void> {
    const options: HttpRequestOptions = {
      headers: {
        Origin: origin,
        'Access-Control-Request-Method': method,
      },
    };

    // Test preflight request for non-simple requests
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      const preflightResponse = await request(this.app.getHttpServer())
        .options(endpoint)
        .set('Origin', origin)
        .set('Access-Control-Request-Method', method);

      expect(preflightResponse.headers['access-control-allow-origin']).toBeDefined();
      expect(preflightResponse.headers['access-control-allow-methods']).toBeDefined();
    }

    // Test actual request
    const response = await this.makeRequest(method, endpoint, undefined, options);
    expect(response.headers['access-control-allow-origin']).toBeDefined();
  }

  /**
   * Tests request validation
   */
  async testRequestValidation(
    endpoint: string,
    method: 'POST' | 'PUT' | 'PATCH',
    validationCases: Array<{
      name: string;
      data: any;
      expectedErrors: string[];
    }>,
    options: HttpRequestOptions = {}
  ): Promise<void> {
    for (const testCase of validationCases) {
      const response = await this.makeRequest(method, endpoint, testCase.data, options);

      expect(response.status).toBe(400);
      expect(response.body.message).toBeDefined();

      // Check that expected validation errors are present
      testCase.expectedErrors.forEach(expectedError => {
        expect(JSON.stringify(response.body.message)).toContain(expectedError);
      });
    }
  }

  /**
   * Tests content type handling
   */
  async testContentTypes(
    endpoint: string,
    method: 'POST' | 'PUT' | 'PATCH',
    contentTypeCases: Array<{
      contentType: string;
      data: any;
      expectedStatus: number;
    }>,
    options: HttpRequestOptions = {}
  ): Promise<void> {
    for (const testCase of contentTypeCases) {
      const requestOptions = {
        ...options,
        headers: {
          ...options.headers,
          'Content-Type': testCase.contentType,
        },
      };

      const response = await this.makeRequest(method, endpoint, testCase.data, requestOptions);
      expect(response.status).toBe(testCase.expectedStatus);
    }
  }

  /**
   * Tests rate limiting (if implemented)
   */
  async testRateLimit(
    endpoint: string,
    method: HttpMethod = 'GET',
    maxRequests: number = 100,
    timeWindow: number = 60000, // 1 minute
    options: HttpRequestOptions = {}
  ): Promise<void> {
    const requests: Promise<request.Response>[] = [];

    // Make multiple requests rapidly
    for (let i = 0; i < maxRequests + 1; i++) {
      requests.push(this.makeRequest(method, endpoint, undefined, options));
    }

    const responses = await Promise.all(requests);

    // Check if rate limiting is working
    const rateLimitedResponses = responses.filter(response => response.status === 429);

    if (rateLimitedResponses.length > 0) {
      // Rate limiting is implemented
      expect(rateLimitedResponses[0].headers['x-ratelimit-limit']).toBeDefined();
      expect(rateLimitedResponses[0].headers['x-ratelimit-remaining']).toBeDefined();
      expect(rateLimitedResponses[0].headers['x-ratelimit-reset']).toBeDefined();
    }
  }
}

/**
 * API Contract Testing Helper
 */
export class ApiContractTestHelper {
  private httpHelper: EnhancedHttpTestHelper;

  constructor(app: INestApplication) {
    this.httpHelper = new EnhancedHttpTestHelper(app);
  }

  /**
   * Tests that API responses match expected contract
   */
  async testApiContract(
    endpoint: string,
    method: HttpMethod,
    contract: ApiContract,
    options: HttpRequestOptions = {}
  ): Promise<void> {
    // Prepare request options
    const requestOptions: HttpRequestOptions = {
      ...options,
      headers: { ...options.headers, ...contract.request?.headers },
      query: { ...options.query, ...contract.request?.query },
    };

    // Make request
    const response = await this.httpHelper.makeRequest(
      method,
      endpoint,
      contract.request?.body,
      requestOptions
    );

    // Validate response status
    expect(response.status).toBe(contract.response.status);

    // Validate response headers
    if (contract.response.headers) {
      await this.httpHelper.testResponseHeaders(
        endpoint,
        method,
        contract.response.headers,
        contract.request?.body,
        requestOptions
      );
    }

    // Validate response body structure
    if (contract.response.body) {
      const { required = [], optional = [], types = {} } = contract.response.body;

      // Check required fields
      required.forEach(field => {
        expect(response.body).toHaveProperty(field);
      });

      // Check field types
      Object.entries(types).forEach(([field, expectedType]) => {
        if (response.body[field] !== undefined) {
          expect(typeof response.body[field]).toBe(expectedType);
        }
      });

      // Optional fields are not strictly checked for presence
    }
  }

  /**
   * Tests multiple API endpoints against their contracts
   */
  async testMultipleContracts(
    contracts: Array<{
      name: string;
      endpoint: string;
      method: HttpMethod;
      contract: ApiContract;
      options?: HttpRequestOptions;
    }>
  ): Promise<void> {
    for (const contractTest of contracts) {
      await this.testApiContract(
        contractTest.endpoint,
        contractTest.method,
        contractTest.contract,
        contractTest.options || {}
      );
    }
  }
}
