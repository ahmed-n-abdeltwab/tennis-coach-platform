/**
 * HTTP Test Utilities (Internal)
 *
 * These utilities are internal implementation details used by HttpMethodsMixin.
 * For testing, use the test classes (IntegrationTest, E2ETest, etc.) which
 * provide HTTP methods through the `http` property.
 *
 * @example Using test classes (recommended)
 * ```typescript
 * import { IntegrationTest } from '@test-utils';
 *
 * const test = new IntegrationTest({ modules: [MyModule] });
 * await test.setup();
 *
 * // Unauthenticated requests
 * const response = await test.http.get('/api/sessions');
 *
 * // Authenticated requests
 * const token = await test.auth.createTestJwtToken();
 * const authResponse = await test.http.authenticatedGet('/api/accounts/me', token);
 * ```
 *
 * @internal
 * @module base/http
 */

export * from './type-safe-http-client';
