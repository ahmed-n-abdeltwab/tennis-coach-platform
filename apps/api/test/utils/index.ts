/**
 * Test utilities index
 * Exports all test utility functions and classes
 */

// Existing test utilities
export * from './base';
export * from './database';
export * from './database-helpers';
export * from './factories';
export * from './http-test-helpers';
export * from './test-helpers';

// ============================================================================
// NEW: Organized test utilities (recommended)
// ============================================================================

/**
 * Authentication utilities
 *
 * Provides helpers for creating JWT tokens and authenticated HTTP clients.
 *
 * @example
 * ```typescript
 * import { AuthTestHelper, AuthenticatedHttpClient } from './utils';
 *
 * const authHelper = new AuthTestHelper();
 * const token = authHelper.createUserToken();
 * const client = new AuthenticatedHttpClient(app, token);
 * ```
 */
export * from './auth';

/**
 * Security testing utilities
 *
 * Provides helpers for testing protected routes and role-based access control.
 *
 * @example
 * ```typescript
 * import { ProtectedRouteTester, RoleBasedAccessTester } from './utils';
 *
 * const tester = new ProtectedRouteTester(app);
 * await tester.testRequiresAuth('/api/sessions', 'GET');
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
 * import { UserRoleHelper } from './utils';
 *
 * const roleHelper = new UserRoleHelper();
 * const userHeaders = roleHelper.createStandardUserHeaders();
 * ```
 */
export * from './roles';

/**
 * HTTP test utilities
 *
 * @deprecated HttpTestHelper is deprecated. Use TypeSafeHttpClient from @auth-helpers instead.
 *
 * @example
 * ```typescript
 * // Old (deprecated):
 * import { HttpTestHelper } from './utils';
 *
 * // New (recommended):
 * import { TypeSafeHttpClient } from '@auth-helpers';
 * ```
 */
export * from './http';

// ============================================================================
// Re-exports from libraries for convenience
// ============================================================================

/**
 * Type-safe HTTP client (re-exported from @auth-helpers)
 *
 * Use this for making type-safe HTTP requests in tests.
 *
 * @example
 * ```typescript
 * import { TypeSafeHttpClient } from './utils';
 *
 * const client = new TypeSafeHttpClient(app);
 * const response = await client.get('/api/sessions');
 * ```
 */
export { TypeSafeHttpClient } from './http/type-safe-http-client';
export type { RequestOptions, TypedResponse } from './http/type-safe-http-client';

/**
 * Endpoints interface and utility types (re-exported from @routes-helpers)
 *
 * Use these for type-safe endpoint definitions and type extraction.
 *
 * @example
 * ```typescript
 * import { Endpoints, ExtractPaths, ExtractResponseType } from './utils';
 *
 * type AllPaths = ExtractPaths<Endpoints>;
 * type SessionsResponse = ExtractResponseType<Endpoints, '/api/sessions', 'GET'>;
 * ```
 */
export type {
  Endpoints,
  ExtractMethods,
  ExtractPaths,
  ExtractRequestType,
  ExtractResponseType,
} from '@routes-helpers';

// ============================================================================
// Deprecation notices
// ============================================================================

/**
 * @deprecated The following imports from @auth-helpers are deprecated:
 *
 * - AuthTestHelper: Import from './utils/auth' instead
 * - ProtectedRouteTestHelper: Use ProtectedRouteTester from './utils/security' instead
 * - UserRoleTestHelper: Use UserRoleHelper from './utils/roles' instead
 * - AuthenticatedHttpClient: Import from './utils/auth' instead
 *
 * These helpers have been moved to apps/api/test/utils for better organization
 * and to fix TypeScript build configuration issues.
 *
 * Migration example:
 * ```typescript
 * // Old (deprecated):
 * import { AuthTestHelper } from '@auth-helpers';
 *
 * // New (recommended):
 * import { AuthTestHelper } from './utils/auth';
 * // or
 * import { AuthTestHelper } from './utils';
 * ```
 */
