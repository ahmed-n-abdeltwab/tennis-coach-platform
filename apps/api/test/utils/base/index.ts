/**
 * DRY Base Test Classes
 * Clean, composable test utilities following DRY principles
 *
 * Usage:
 * ```typescript
 * import { IntegrationTest, ControllerTest, ServiceTest, E2ETest } from '@test-utils/base-dry';
 *
 * // Integration Test
 * const integrationTest = new IntegrationTest({
 *   modules: [MyModule],
 *   moduleName: 'my-module',
 * });
 *
 * // Controller Test
 * const controllerTest = new ControllerTest({
 *   controllerClass: MyController,
 *   moduleName: 'my-module',
 *   providers: [mockService],
 * });
 *
 * // Service Test
 * const serviceTest = new ServiceTest({
 *   serviceClass: MyService,
 *   mocks: [mockPrisma],
 * });
 *
 * // E2E Test
 * const e2eTest = new E2ETest();
 * ```
 */

// Core
export { BaseTest } from './core/base-test';

// Mixins
export { AssertionsMixin } from './mixins/assertions.mixin';
export { AuthMixin } from './mixins/auth.mixin';
export { DatabaseMixin, type DatabaseCapable } from './mixins/database.mixin';
export { HttpMethodsMixin, type HttpCapable } from './mixins/http-methods.mixin';
export { MockMixin } from './mixins/mock.mixin';

// Implementations
export { ControllerTest, type ControllerTestConfig } from './implementations/controller-test';
export { E2ETest, type E2ETestConfig } from './implementations/e2e-test';
export { IntegrationTest, type IntegrationTestConfig } from './implementations/integration-test';
export { ServiceTest, type ServiceTestConfig } from './implementations/service-test';
