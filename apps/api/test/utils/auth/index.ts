/**
 * Authentication Test Utilities
 *
 * This module provides type definitions for authentication in tests.
 * For authentication functionality, use AuthMixin through IntegrationTest,
 * ControllerTest, or E2ETest classes.
 *
 * @example Recommended approach
 * ```typescript
 * import { IntegrationTest } from '@test-utils/base';
 *
 * const test = new IntegrationTest({ modules: [MyModule] });
 * await test.setup();
 * const token = await test.auth.createTestJwtToken();
 * const headers = await test.auth.createAuthHeaders(token);
 * const response = await test.http.authenticatedGet('/api/endpoint', token);
 * ```
 *
 * @module auth
 */

/**
 * AuthHeaders - Type definition for authentication headers
 *
 * Used for adding authentication to HTTP requests.
 */
export type { AuthHeaders } from './auth.types';

/**
 * AuthenticatedHttpClient - HTTP client with built-in authentication
 *
 * Provides a convenient wrapper around supertest with automatic
 * authentication header injection.
 */
export { AuthenticatedHttpClient } from './authenticated-client';
