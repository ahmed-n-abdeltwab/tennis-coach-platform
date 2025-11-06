/**
 * API Contract Testing Utilities
 *
 * Provides utilities for testing API contracts, validation, and error scenarios.
 * Built on top of TypeSafeHttpClient for type safety.
 */

import { INestApplication } from '@nestjs/common';
import { Endpoints, ExtractMethods, ExtractPaths, ExtractRequestType } from '@routes-helpers';
import { RequestOptions, TypeSafeHttpClient } from './type-safe-http-client';

/**
 * HTTP error test case definition
 */
export interface HttpErrorTestCase {
  name: string;
  statusCode: number;
  errorMessage?: string;
  errorCode?: string;
}

/**
 * Request data structure for contract testing
 */
interface RequestData {
  headers?: Record<string, any>;
  body?: any;
  query?: Record<string, any>;
}

/**
 * Response data structure for contract testing
 */
interface ResponseData {
  status: number;
  headers?: Record<string, any>;
  body?: {
    required?: string[];
    optional?: string[];
    types?: Record<string, any>;
  };
}

/**
 * API contract definition
 */
export interface ApiContract {
  request?: RequestData;
  response: ResponseData;
}

/**
 * API Contract Testing Helper
 *
 * Provides utilities for testing that API responses match expected contracts.
 * Uses TypeSafeHttpClient internally for type-safe HTTP requests.
 *
 * @template E - The Endpoints interface type (defaults to auto-imported Endpoints)
 *
 * @example
 * ```typescript
 * const tester = new ApiContractTester(app);
 *
 * await tester.testApiContract('/api/authentication/user/signup', 'POST', {
 *   request: {
 *     body: {
 *       email: 'test@example.com',
 *       name: 'Test User',
 *       password: 'Password123!'
 *     }
 *   },
 *   response: {
 *     status: 201,
 *     headers: {
 *       'content-type': /application\/json/
 *     },
 *     body: {
 *       required: ['accessToken', 'user'],
 *       types: {
 *         accessToken: 'string'
 *       }
 *     }
 *   }
 * });
 * ```
 */
export class ApiContractTester<E extends Record<string, any> = Endpoints> {
  private httpClient: TypeSafeHttpClient<E>;

  constructor(app: INestApplication) {
    this.httpClient = new TypeSafeHttpClient<E>(app);
  }

  /**
   * Test that an API endpoint matches the expected contract
   *
   * Validates:
   * - Response status code
   * - Response headers (if specified)
   * - Response body structure (required fields, optional fields, types)
   *
   * @template P - The API path
   * @template M - The HTTP method
   * @param path - The API endpoint path
   * @param method - The HTTP method
   * @param contract - The expected API contract
   * @param options - Additional request options
   *
   * @example
   * ```typescript
   * await tester.testApiContract('/api/sessions', 'GET', {
   *   response: {
   *     status: 200,
   *     body: {
   *       required: ['data', 'meta'],
   *       types: {
   *         data: 'object'
   *       }
   *     }
   *   }
   * });
   * ```
   */
  async testApiContract<P extends ExtractPaths<E>, M extends ExtractMethods<E, P>>(
    path: P,
    method: M,
    contract: ApiContract,
    options: RequestOptions = {}
  ): Promise<void> {
    // Prepare request options
    const requestOptions: RequestOptions = {
      ...options,
      headers: { ...options.headers, ...contract.request?.headers },
      expectedStatus: contract.response.status,
    };

    // Prepare request data
    const requestData = contract.request?.body as ExtractRequestType<E, P, M>;

    // Make request
    const response = await this.httpClient.request(path, method, requestData, requestOptions);

    // Validate response status
    expect(response.status).toBe(contract.response.status);

    // Validate response headers
    if (contract.response.headers) {
      Object.entries(contract.response.headers).forEach(([headerName, expectedValue]) => {
        const actualValue = response.headers[headerName.toLowerCase()];

        if (expectedValue instanceof RegExp) {
          expect(actualValue).toMatch(expectedValue);
        } else {
          expect(actualValue).toBe(expectedValue);
        }
      });
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
   * Test multiple API endpoints against their contracts
   *
   * @param contracts - Array of contract test definitions
   *
   * @example
   * ```typescript
   * await tester.testMultipleContracts([
   *   {
   *     name: 'User Registration',
   *     endpoint: '/api/authentication/user/signup',
   *     method: 'POST',
   *     contract: { ... }
   *   },
   *   {
   *     name: 'User Login',
   *     endpoint: '/api/authentication/user/login',
   *     method: 'POST',
   *     contract: { ... }
   *   }
   * ]);
   * ```
   */
  async testMultipleContracts(
    contracts: Array<{
      name: string;
      endpoint: ExtractPaths<E>;
      method: ExtractMethods<E, ExtractPaths<E>>;
      contract: ApiContract;
      options?: RequestOptions;
    }>
  ): Promise<void> {
    for (const contractTest of contracts) {
      await this.testApiContract(
        contractTest.endpoint,
        contractTest.method as any,
        contractTest.contract,
        contractTest.options || {}
      );
    }
  }

  /**
   * Test multiple error scenarios for an endpoint
   *
   * @template P - The API path
   * @template M - The HTTP method
   * @param path - The API endpoint path
   * @param method - The HTTP method
   * @param errorCases - Array of error test cases
   * @param data - Request data
   * @param options - Additional request options
   *
   * @example
   * ```typescript
   * await tester.testErrorScenarios('/api/sessions', 'POST', [
   *   {
   *     name: 'Missing required field',
   *     statusCode: 400,
   *     errorMessage: 'bookingTypeId is required'
   *   },
   *   {
   *     name: 'Invalid booking type',
   *     statusCode: 404,
   *     errorMessage: 'Booking type not found'
   *   }
   * ], { bookingTypeId: 'invalid' });
   * ```
   */
  async testErrorScenarios<P extends ExtractPaths<E>, M extends ExtractMethods<E, P>>(
    path: P,
    method: M,
    errorCases: HttpErrorTestCase[],
    data?: ExtractRequestType<E, P, M>,
    options: RequestOptions = {}
  ): Promise<void> {
    for (const errorCase of errorCases) {
      const response = await this.httpClient.request(path, method, data, {
        ...options,
        expectedStatus: errorCase.statusCode,
      });

      expect(response.status).toBe(errorCase.statusCode);
      expect(response.ok).toBe(false);

      if (!response.ok) {
        if (errorCase.errorMessage) {
          const message = Array.isArray(response.body.message)
            ? response.body.message.join(' ')
            : response.body.message;
          expect(message).toContain(errorCase.errorMessage);
        }

        if (errorCase.errorCode) {
          expect(response.body.error).toBe(errorCase.errorCode);
        }
      }
    }
  }

  /**
   * Test request validation errors
   *
   * @template P - The API path
   * @template M - The HTTP method
   * @param path - The API endpoint path
   * @param method - The HTTP method
   * @param validationCases - Array of validation test cases
   * @param options - Additional request options
   *
   * @example
   * ```typescript
   * await tester.testRequestValidation('/api/sessions', 'POST', [
   *   {
   *     name: 'Missing bookingTypeId',
   *     data: { timeSlotId: 'slot-123' },
   *     expectedErrors: ['bookingTypeId']
   *   },
   *   {
   *     name: 'Invalid email format',
   *     data: { email: 'invalid-email' },
   *     expectedErrors: ['email must be a valid email']
   *   }
   * ]);
   * ```
   */
  async testRequestValidation<
    P extends ExtractPaths<E>,
    M extends ExtractMethods<E, P> & ('POST' | 'PUT' | 'PATCH'),
  >(
    path: P,
    method: M,
    validationCases: Array<{
      name: string;
      data: any;
      expectedErrors: string[];
    }>,
    options: RequestOptions = {}
  ): Promise<void> {
    for (const testCase of validationCases) {
      const response = await this.httpClient.request(path, method, testCase.data, {
        ...options,
        expectedStatus: 400,
      });

      expect(response.status).toBe(400);
      expect(response.ok).toBe(false);

      if (!response.ok) {
        expect(response.body.message).toBeDefined();

        // Check that expected validation errors are present
        testCase.expectedErrors.forEach(expectedError => {
          const message = Array.isArray(response.body.message)
            ? response.body.message.join(' ')
            : response.body.message;
          expect(message).toContain(expectedError);
        });
      }
    }
  }

  /**
   * Test response body structure
   *
   * @template P - The API path
   * @template M - The HTTP method
   * @param path - The API endpoint path
   * @param method - The HTTP method
   * @param expectedStructure - Expected response body structure
   * @param data - Request data
   * @param options - Additional request options
   * @returns The response for further assertions
   *
   * @example
   * ```typescript
   * const response = await tester.testResponseStructure(
   *   '/api/sessions',
   *   'GET',
   *   { data: 'array', meta: 'object' }
   * );
   * expect(response.body.data).toHaveLength(5);
   * ```
   */
  async testResponseStructure<P extends ExtractPaths<E>, M extends ExtractMethods<E, P>>(
    path: P,
    method: M,
    expectedStructure: Record<string, any>,
    data?: ExtractRequestType<E, P, M>,
    options: RequestOptions = {}
  ): Promise<any> {
    const response = await this.httpClient.request(
      path,
      method,
      data as ExtractRequestType<E, P, M>,
      options
    );

    // Check if response body has expected structure
    Object.keys(expectedStructure).forEach(key => {
      expect(response.body).toHaveProperty(key);
    });

    return response;
  }

  /**
   * Test pagination endpoints
   *
   * @template P - The API path (must support GET)
   * @param path - The API endpoint path
   * @param paginationParams - Pagination parameters
   * @param options - Additional request options
   *
   * @example
   * ```typescript
   * await tester.testPagination('/api/sessions', {
   *   page: 1,
   *   limit: 10
   * });
   * ```
   */
  async testPagination<P extends ExtractPaths<E> & PathsWithMethod<E, 'GET'>>(
    path: P,
    paginationParams: {
      page?: number;
      limit?: number;
      offset?: number;
    } = {},
    options: RequestOptions = {}
  ): Promise<void> {
    const response = await this.httpClient.get(path, paginationParams as any, options);

    expect(response.ok).toBe(true);
    if (response.ok) {
      // Check pagination structure
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect((response.body as any).meta).toHaveProperty('total');
      expect((response.body as any).meta).toHaveProperty('page');
      expect((response.body as any).meta).toHaveProperty('limit');

      // Validate data is an array
      expect(Array.isArray((response.body as any).data)).toBe(true);
    }
  }

  /**
   * Get the underlying TypeSafeHttpClient for advanced usage
   *
   * @returns The TypeSafeHttpClient instance
   */
  getHttpClient(): TypeSafeHttpClient<E> {
    return this.httpClient;
  }
}

// Type helper for paths that support a specific method
type PathsWithMethod<E extends Record<string, any>, M extends string> = {
  [P in ExtractPaths<E>]: M extends ExtractMethods<E, P> ? P : never;
}[ExtractPaths<E>];
