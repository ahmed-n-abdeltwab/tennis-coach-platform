/**
 * HTTP Test Utilities
 *
 * Provides type-safe HTTP client for testing API endpoints with compile-time validation
 * and API contract testing utilities.
 *
 * Key features:
 * - Type-safe endpoint paths (must exist in Endpoints interface)
 * - Type-safe HTTP methods (must be supported by the endpoint)
 * - Type-safe request/response data structures
 * - API contract validation
 *
 * @example Using TypeSafeHttpClient
 * ```typescript
 * import { TypeSafeHttpClient } from '@test-utils/http';
 *
 * const client = new TypeSafeHttpClient(app);
 * const response = await client.get('/api/sessions');
 * // response.body is automatically typed based on the endpoint
 * ```
 *
 * @example Using with test classes (recommended)
 * ```typescript
 * import { IntegrationTest } from '@test-utils/base';
 *
 * const test = new IntegrationTest({ modules: [MyModule] });
 * await test.setup();
 * const response = await test.http.get('/api/sessions');
 * // Automatically type-safe through HttpMethodsMixin
 * ```
 *
 * @example API contract testing
 * ```typescript
 * import { ApiContractTester } from '@test-utils/http';
 *
 * const tester = new ApiContractTester(app);
 * await tester.testApiContract('/api/sessions', 'GET', {
 *   response: {
 *     status: 200,
 *     body: { required: ['data', 'meta'] }
 *   }
 * });
 * ```
 *
 * @module http
 */

/**
 * API Contract Tester
 *
 * Provides utilities for testing API contracts including:
 * - Response status code validation
 * - Response body structure validation
 * - Response header validation
 * - Error scenario testing
 *
 * Useful for ensuring API endpoints conform to their contracts.
 */
export * from './api-contract-tester';

/**
 * Type-Safe HTTP Client
 *
 * Provides a type-safe HTTP client with compile-time validation of:
 * - Endpoint paths (must exist in Endpoints interface)
 * - HTTP methods (must be supported by the endpoint)
 * - Request data structure (must match endpoint's expected input)
 * - Response data structure (automatically typed based on endpoint)
 *
 * Note: HttpMethodsMixin delegates to TypeSafeHttpClient internally,
 * so using test classes provides the same type safety with less boilerplate.
 */
export * from './type-safe-http-client';
