/**
 * Test Utilities Index
 *
 * Central export point for all test utilities in the application.
 *
 * @module test-utils
 */

// ============================================================================
// Test Implementations
// ============================================================================

export * from './implementations/controller-test';
export * from './implementations/e2e-test';
export * from './implementations/gateway-test';
export * from './implementations/integration-test';
export * from './implementations/service-test';

// ============================================================================
// Mixins
// ============================================================================

export * from './mixins/assertions.mixin';
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

// ============================================================================
// Factories
// ============================================================================

export * from './factories';

// ============================================================================
// HTTP Utilities
// ============================================================================

export * from './http';

// ============================================================================
// Constants
// ============================================================================

export * from './constants';

// ============================================================================
// Cache
// ============================================================================

export * from './cache';

// ============================================================================
// Core
// ============================================================================

export * from './core/base-test';

// ============================================================================
// Infrastructure (re-exported for convenience)
// ============================================================================

export * from '../infrastructure/database';
export * from '../infrastructure/errors';
export * from '../infrastructure/helpers';
export * from '../infrastructure/performance';
export * from '../infrastructure/redis';
