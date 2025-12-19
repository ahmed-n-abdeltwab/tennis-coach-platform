/**
 * Authentication Test Utilities
 *
 * This module provides utilities for creating and managing JWT tokens
 * and authenticated HTTP clients in tests.
 *
 * @deprecated For new code, prefer using AuthMixin through IntegrationTest,
 * ControllerTest, or E2ETest classes. These standalone utilities are
 * maintained for backward compatibility.
 *
 * @example Recommended approach
 * ```typescript
 * import { IntegrationTest } from '@test-utils/base';
 *
 * const test = new IntegrationTest({ modules: [MyModule] });
 * await test.setup();
 * const token = await test.auth.createTestJwtToken();
 * const response = await test.http.authenticatedGet('/api/endpoint', token);
 * ```
 *
 * @example Legacy approach (still supported)
 * ```typescript
 * import { AuthTestHelper } from '@test-utils/auth';
 *
 * const authHelper = new AuthTestHelper();
 * const token = authHelper.createUserToken();
 * ```
 *
 * @module auth
 */

/**
 * AuthTestHelper - Helper class for creating JWT tokens
 *
 * Provides methods for creating test JWT tokens with various payloads and roles.
 *
 * @deprecated Use AuthMixin through test classes instead
 */
export { AuthTestHelper } from './auth-test-helper';

/**
 * AuthHeaders - Type definition for authentication headers
 *
 * Used for adding authentication to HTTP requests.
 */
export type { AuthHeaders } from './auth-test-helper';

/**
 * AuthenticatedHttpClient - HTTP client with built-in authentication
 *
 * Provides a convenient wrapper around supertest with automatic
 * authentication header injection.
 *
 * @deprecated Use HttpMethodsMixin through test classes instead
 */
export { AuthenticatedHttpClient } from './authenticated-client';
