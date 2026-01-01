/**
 * Test Utilities Index
 *
 * Central export point for all test utilities in the application.
 *
 * @module test-utils
 */

export * from './implementations/controller-test';
export * from './implementations/e2e-test';
export * from './implementations/gateway-test';
export * from './implementations/guard-test';
export * from './implementations/integration-test';
export * from './implementations/service-test';

export * from './mixins/auth.mixin';
export * from './mixins/database.mixin';
export * from './mixins/factory.mixin';
export * from './mixins/http-methods.mixin';
export {
  buildProviders,
  createDeepMock,
  isClassProvider,
  isCustomMockProvider,
} from './mixins/mock.mixin';
export type { CustomMockProvider, DeepMocked, MockProvider } from './mixins/mock.mixin';

export * from './factories';

// HTTP types re-exported from @api-sdk/testing for convenience
// For TypeSafeHttpClient, import directly from '@api-sdk/testing'
export type {
  DeepPartial,
  ErrorResponse,
  FailureResponse,
  RequestOptions,
  RequestType,
  SuccessResponse,
  SuccessStatus,
  TypedResponse,
  ValidationErrorResponse,
} from '@api-sdk/testing';

export * from './constants';

export * from './cache';

export * from './core/base-test';

export * from '../infrastructure/database';
export * from '../infrastructure/errors';
export * from '../infrastructure/helpers';
export * from '../infrastructure/performance';

export * from './mocks';
