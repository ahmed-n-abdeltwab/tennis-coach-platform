/**
 * API Contract Testing Utilities
 *
 * Provides utilities for testing API contracts, validation, and error scenarios.
 * Built on top of TypeSafeHttpClient for type safety.
 */
import { INestApplication } from '@nestjs/common';
import type {
  DeepPartial,
  ExtractMethods,
  ExtractPaths,
  ExtractResponseType,
  RequestType,
  TypedResponse,
} from '@test-utils';
// eslint-disable-next-line no-duplicate-imports
import { Endpoints } from '@test-utils';

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
 *       'content-type': 'application/json'
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
export class ApiContractTester<
  TModuleName extends string = string,
  E extends Record<string, any> = Endpoints,
> {
  private httpClient: TypeSafeHttpClient<TModuleName, E>;

  constructor(app: INestApplication) {
    this.httpClient = new TypeSafeHttpClient<TModuleName, E>(app);
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
   *       data: 'string',
   *       meta: 10
   *     }
   *   }
   * });
   * ```
   */
  async testApiContract<P extends ExtractPaths<E>, M extends ExtractMethods<E, P>>(
    path: P,
    method: M,
    contract?: {
      request?: {
        headers?: Record<string, string>;
        payload?: RequestType<P, M, E>;
      };
      response: {
        status: number;
        headers?: Record<string, string>;
        body?: DeepPartial<ExtractResponseType<E, P, M>>;
      };
    },
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, M>>> {
    // Prepare request data
    const payload = contract?.request?.payload ?? {};

    // Make request
    const response = await this.httpClient.request(path, method, payload, options);

    // Validate response status
    expect(response.status).toBe(contract?.response.status);

    // Validate response headers
    if (contract?.response.headers) {
      expect(response.headers).toMatchObject(contract.response.headers);
    }

    // Validate response body structure
    if (contract?.response.body) {
      expect(response.body).toStrictEqual(contract.response.body);
    }

    return response;
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
  async testMultipleContracts<P extends ExtractPaths<E>, M extends ExtractMethods<E, P>>(
    contracts: Array<{
      name: string;
      endpoint: P;
      method: M;
      contract?: {
        request?: {
          headers?: Record<string, string>;
          payload?: RequestType<P, M, E>;
        };
        response: {
          status: number;
          headers?: Record<string, string>;
          body?: DeepPartial<ExtractResponseType<E, P, M>>;
        };
      };
      options?: RequestOptions;
    }>
  ): Promise<void> {
    for (const contractTest of contracts) {
      await this.testApiContract(
        contractTest.endpoint,
        contractTest.method,
        contractTest.contract,
        contractTest.options
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
    payload?: RequestType<P, M, E>,
    options?: RequestOptions
  ): Promise<void> {
    for (const errorCase of errorCases) {
      const response = await this.httpClient.request(path, method, payload, {
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
  async testRequestValidation<P extends ExtractPaths<E>, M extends ExtractMethods<E, P>>(
    path: P,
    method: M,
    validationCases: Array<{
      name: string;
      payload: RequestType<P, M, E>;
      expectedErrors: string[];
    }>,
    options?: RequestOptions
  ): Promise<void> {
    for (const testCase of validationCases) {
      // Create a corresponding HttpErrorTestCase that matches testErrorScenarios signature
      const errorCase: HttpErrorTestCase = {
        name: testCase.name,
        statusCode: 400,
        errorMessage: testCase.expectedErrors.join(' '), // Join multiple errors for contains check
      };

      // Call testErrorScenarios with this single error case and pass the data per case
      await this.testErrorScenarios(path, method, [errorCase], testCase.payload, options);
    }
  }

  /**
   * Get the underlying TypeSafeHttpClient for advanced usage
   *
   * @returns The TypeSafeHttpClient instance
   */
  getHttpClient(): TypeSafeHttpClient<TModuleName, E> {
    return this.httpClient;
  }
}
