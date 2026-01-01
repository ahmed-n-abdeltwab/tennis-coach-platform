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
 * const token = await test.auth.createToken();
 * const authResponse = await test.http.authenticatedGet('/api/accounts/me', token);
 * ```
 *
 * @internal
 * @module base/http
 */

// Re-export from @api-sdk/testing for backward compatibility
export {
  TypeSafeHttpClient,
  type DeepPartial,
  type ErrorResponse,
  type FailureResponse,
  type RequestOptions,
  type RequestType,
  type SuccessResponse,
  type SuccessStatus,
  type TypedResponse,
  type ValidationErrorResponse,
} from '@api-sdk/testing';
