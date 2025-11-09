/**
 * Test utilities index
 * Exports all test utility functions and classes
 */

// Base test utilities
export * from './base'; // Includes test app helpers
export * from './database'; // Includes database helpers
export * from './factories';

// ============================================================================
// Type-Safe Test Utilities (Recommended)
// ============================================================================

/**
 * Authentication utilities
 *
 * Provides helpers for creating JWT tokens and authenticated HTTP clients.
 *
 * @example
 * ```typescript
 * import { AuthTestHelper, AuthenticatedHttpClient } from '@test-utils';
 *
 * const authHelper = new AuthTestHelper();
 * const token = authHelper.createUserToken();
 * const client = new AuthenticatedHttpClient(app, token);
 * ```
 */
export * from './auth';

/**
 * HTTP test utilities
 *
 * Provides type-safe HTTP client with compile-time validation of:
 * - Endpoint paths (must exist in Endpoints interface)
 * - HTTP methods (must be supported by the endpoint)
 * - Request data structure (must match endpoint's expected input)
 * - Response data structure (automatically typed based on endpoint)
 *
 * Also includes API contract testing utilities for validating:
 * - Response status codes
 * - Response headers
 * - Response body structure
 * - Error scenarios
 * - Validation errors
 *
 * @example
 * ```typescript
 * import { TypeSafeHttpClient, ApiContractTester } from '@test-utils';
 *
 * // Type-safe HTTP requests
 * const client = new TypeSafeHttpClient(app);
 * const response = await client.get('/api/sessions');
 * // response.body is automatically typed based on the endpoint
 *
 * // API contract testing
 * const tester = new ApiContractTester(app);
 * await tester.testApiContract('/api/sessions', 'GET', {
 *   response: {
 *     status: 200,
 *     body: {
 *       required: ['data', 'meta']
 *     }
 *   }
 * });
 * ```
 */
export * from './http';

/**
 * Security testing utilities
 *
 * Provides helpers for testing protected routes and role-based access control.
 *
 * @example
 * ```typescript
 * import { ProtectedRouteTester, RoleBasedAccessTester } from '@test-utils';
 *
 * const tester = new ProtectedRouteTester(app);
 * await tester.testRequiresAuth('/api/sessions', 'GET');
 * await tester.testRoleBasedAccess('/api/admin/users', [Role.ADMIN], 'GET');
 * ```
 */
export * from './security';

/**
 * Role management utilities
 *
 * Provides helpers for creating test users with different roles.
 *
 * @example
 * ```typescript
 * import { UserRoleHelper } from '@test-utils';
 *
 * const roleHelper = new UserRoleHelper();
 * const userHeaders = roleHelper.createStandardUserHeaders();
 * ```
 */
export * from './roles';

/**
 * Mocks management utilities
 *
 * Provides helpers for creating mocks for the test users.
 *
 * @example
 * ```typescript
 * import { MockBookingType } from '@test-utils';
 *
 * const roleHelper = new UserRoleHelper();
 * const userHeaders = roleHelper.createStandardUserHeaders();
 * ```
 */
export * from './mocks';

// ============================================================================
// Re-exports from libraries for convenience
// ============================================================================

/**
 * Endpoints interface and utility types (re-exported from @routes-helpers)
 *
 * Use these for type-safe endpoint definitions and type extraction.
 *
 * @example
 * ```typescript
 * import { Endpoints, ExtractPaths, ExtractResponseType } from '@test-utils';
 *
 * type AllPaths = ExtractPaths<Endpoints>;
 * type SessionsResponse = ExtractResponseType<Endpoints, '/api/sessions', 'GET'>;
 * ```
 */
export { buildPath } from '@routes-helpers';
export type {
  AcceptPath,
  Endpoints,
  ExtractMethods,
  ExtractPathParams,
  ExtractPaths,
  ExtractRequestType,
  ExtractResponseType,
  PathsWithMethod,
  PathWithValues,
  RequiresParams,
} from '@routes-helpers';

export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;
