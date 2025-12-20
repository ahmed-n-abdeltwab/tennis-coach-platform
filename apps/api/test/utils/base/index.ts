/**
 * DRY Base Test Classes
 * Clean, composable test utilities following DRY principles
 *
 * This module provides the foundation for all test types in the application.
 * It follows a layered architecture with mixins for cross-cutting concerns
 * and concrete implementations for specific test scenarios.
 *
 * Architecture:
 * - Layer 1: Core (BaseTest) - Abstract foundation for all test types
 * - Layer 2: Mixins - Reusable functionality (Auth, Database, HTTP, Assertions, Mocks)
 * - Layer 3: Implementations - Concrete test classes (Integration, Controller, Service, E2E)
 *
 * @example Integration Test
 * ```typescript
 * import { IntegrationTest } from '@test-utils/base';
 *
 * const test = new IntegrationTest({
 *   modules: [MyModule],
 *   moduleName: 'my-module',
 * });
 *
 * await test.setup();
 * const token = await test.auth.createTestJwtToken();
 * const response = await test.http.authenticatedGet('/api/my-module', token);
 * test.assert.assertSuccessResponse(response);
 * await test.cleanup();
 * ```
 *
 * @example Controller Test
 * ```typescript
 * import { ControllerTest } from '@test-utils/base';
 *
 * const test = new ControllerTest({
 *   controllerClass: MyController,
 *   moduleName: 'my-module',
 *   providers: [mockService],
 * });
 *
 * await test.setup();
 * const result = await test.controller.findAll();
 * test.assert.assertArrayResponse(result);
 * await test.cleanup();
 * ```
 *
 * @example Service Test
 * ```typescript
 * import { ServiceTest } from '@test-utils/base';
 *
 * const test = new ServiceTest({
 *   serviceClass: MyService,
 *   mocks: [mockPrisma],
 * });
 *
 * await test.setup();
 * test.mock.mockMethodToReturn(test.prisma.account.findMany, []);
 * const result = await test.service.findAll();
 * await test.cleanup();
 * ```
 *
 * @example E2E Test
 * ```typescript
 * import { E2ETest } from '@test-utils/base';
 *
 * const test = new E2ETest();
 * await test.setup();
 * const user = await test.db.createTestUser();
 * const token = await test.auth.createTestJwtToken({ sub: user.id });
 * const response = await test.http.authenticatedGet('/api/accounts', token);
 * await test.cleanup();
 * ```
 *
 * @module base
 */

// ============================================================================
// Core Base Classes
// ============================================================================

/**
 * Abstract base class for all test types
 *
 * Provides common patterns for setup, cleanup, and resource access.
 * All test implementations extend this class.
 *
 * @see {@link IntegrationTest}
 * @see {@link ControllerTest}
 * @see {@link ServiceTest}
 * @see {@link E2ETest}
 */
export { BaseTest } from './core/base-test';

/**
 * Configuration interface for BaseTest
 *
 * @property timeout - Optional timeout for setup/cleanup operations
 */
export type { BaseTestConfig } from './core/base-test';

// ============================================================================
// Mixins - Cross-Cutting Concerns
// ============================================================================

/**
 * Assertions Mixin
 *
 * Provides reusable assertion helpers for HTTP responses, arrays, and mocks.
 * Eliminates duplication of common assertion patterns across test files.
 *
 * @example
 * ```typescript
 * const assert = new AssertionsMixin();
 * assert.assertSuccessResponse(response);
 * assert.assertArrayResponse(result, 3);
 * assert.assertCalledWith(mockMethod, expectedArg);
 * ```
 */
export { AssertionsMixin } from './mixins/assertions.mixin';

/**
 * Authentication Mixin
 *
 * Provides JWT token creation and authentication utilities.
 * Supports all user roles and token scenarios (valid, expired, etc.).
 *
 * @example
 * ```typescript
 * const auth = new AuthMixin();
 * const token = await auth.createTestJwtToken();
 * const coachToken = await auth.createRoleToken(Role.COACH);
 * const headers = await auth.createAuthHeaders(token);
 * ```
 */
export { AuthMixin } from './mixins/auth.mixin';

/**
 * Database Mixin
 *
 * Provides database operations, test data factories, and cleanup utilities.
 * Includes caching for frequently used test data to improve performance.
 *
 * @example
 * ```typescript
 * const db = new DatabaseMixin(host);
 * await db.setupDatabase();
 * const user = await db.createTestUser();
 * const coach = await db.getCachedCoach();
 * await db.cleanupDatabase();
 * ```
 */
export { DatabaseMixin } from './mixins/database.mixin';

/**
 * Interface for classes that can use database operations
 *
 * Requires a `database` property that provides access to PrismaService.
 *
 * @property database - PrismaService instance for database operations
 */
export type { DatabaseCapable } from './mixins/database.mixin';

/**
 * HTTP Methods Mixin
 *
 * Provides type-safe HTTP request methods for integration and E2E tests.
 * Supports both authenticated and unauthenticated requests with full type safety.
 *
 * @example
 * ```typescript
 * const http = new HttpMethodsMixin(host);
 * const response = await http.get('/api/sessions');
 * const authResponse = await http.authenticatedPost('/api/sessions', token, { body: data });
 * ```
 */
export { HttpMethodsMixin } from './mixins/http-methods.mixin';

/**
 * Interface for classes that can make HTTP requests
 *
 * Requires an `application` property and a method to create auth headers.
 *
 * @property application - NestJS application instance
 * @method createAuthHeaders - Creates authentication headers from a token
 */
export type { HttpCapable } from './mixins/http-methods.mixin';

/**
 * Mock Mixin
 *
 * Provides utilities for creating and configuring mocks.
 * Simplifies mock setup for common services and repositories.
 *
 * @example
 * ```typescript
 * const mock = new MockMixin();
 * const mockPrisma = mock.createMockPrismaService();
 * mock.mockMethodToReturn(mockPrisma.account.findMany, []);
 * mock.mockMethodToThrow(mockPrisma.account.create, new Error('Failed'));
 * ```
 */
export { MockMixin } from './mixins/mock.mixin';

// ============================================================================
// Type Exports
// ============================================================================

/**
 * Authentication headers type
 *
 * Used for adding authentication to HTTP requests.
 * Re-exported from auth utilities for convenience.
 */
export type { AuthHeaders } from '../auth/auth.types';

// ============================================================================
// Test Implementations
// ============================================================================

/**
 * Integration Test
 *
 * Full integration testing with real dependencies (database, HTTP server).
 * Provides access to HTTP methods, authentication, database operations, and assertions.
 *
 * Use this for testing complete workflows with real database and HTTP interactions.
 *
 * @example
 * ```typescript
 * const test = new IntegrationTest({
 *   modules: [BookingTypesModule],
 *   moduleName: 'booking-types',
 * });
 *
 * await test.setup();
 * const token = await test.auth.createRoleToken(Role.COACH);
 * const response = await test.http.authenticatedGet('/api/booking-types', token);
 * test.assert.assertSuccessResponse(response);
 * await test.cleanup();
 * ```
 */
export { IntegrationTest } from './implementations/integration-test';

/**
 * Configuration for IntegrationTest
 *
 * @property modules - NestJS modules to import
 * @property controllers - Optional controllers to include
 * @property providers - Optional providers to include
 * @property moduleName - Optional module name for type-safe routing
 */
export type { IntegrationTestConfig } from './implementations/integration-test';

/**
 * Controller Test
 *
 * Controller testing with mocked services.
 * Provides access to the controller instance, authentication, assertions, and mocks.
 *
 * Use this for testing controller logic in isolation with mocked dependencies.
 *
 * @example Using ControllerTest class (with HTTP testing)
 * ```typescript
 * const test = new ControllerTest({
 *   controllerClass: BookingTypesController,
 *   moduleName: 'booking-types',
 *   providers: [{ provide: BookingTypesService, useValue: mockService }],
 * });
 *
 * await test.setup();
 * jest.spyOn(test.service, 'findAll').mockResolvedValue([]);
 * const result = await test.controller.findAll();
 * test.assert.assertArrayResponse(result);
 * await test.cleanup();
 * ```
 *
 * @example Using createControllerTest function (recommended for simple tests)
 * ```typescript
 * let controller: SessionsController;
 * let service: jest.Mocked<SessionsService>;
 *
 * beforeEach(async () => {
 *   const mockService = {
 *     create: jest.fn(),
 *     findByUser: jest.fn(),
 *     findOne: jest.fn(),
 *   };
 *
 *   const result = await createControllerTest({
 *     controllerClass: SessionsController,
 *     serviceClass: SessionsService,
 *     mockService,
 *   });
 *   controller = result.controller;
 *   service = result.service;
 * });
 *
 * afterEach(() => {
 *   jest.clearAllMocks();
 * });
 * ```
 */
export { ControllerTest, createControllerTest } from './implementations/controller-test';

/**
 * Configuration for ControllerTest
 *
 * @property controllerClass - Controller class to test
 * @property providers - Providers (typically mocked services)
 * @property moduleName - Optional module name for type-safe routing
 */
export type {
  ControllerTestConfig,
  ControllerTestResult,
  CreateControllerTestConfig,
} from './implementations/controller-test';

/**
 * Service Test
 *
 * Service testing with mocked repositories.
 * Provides access to the service instance, mocks, and assertions.
 *
 * Use this for testing service logic in isolation with mocked database access.
 *
 * @example Using ServiceTest class (legacy approach)
 * ```typescript
 * const test = new ServiceTest({
 *   serviceClass: BookingTypesService,
 *   mocks: [{ provide: PrismaService, useValue: mockPrisma }],
 * });
 *
 * await test.setup();
 * test.prisma.bookingType.findMany.mockResolvedValue([]);
 * const result = await test.service.findAll();
 * test.assert.assertArrayResponse(result);
 * await test.cleanup();
 * ```
 *
 * @example Using createServiceTest function (recommended)
 * ```typescript
 * let service: SessionsService;
 * let prisma: jest.Mocked<PrismaService>;
 *
 * beforeEach(async () => {
 *   const result = await createServiceTest({
 *     serviceClass: SessionsService,
 *     mockPrisma: {
 *       session: { create: jest.fn(), findMany: jest.fn() },
 *     },
 *   });
 *   service = result.service;
 *   prisma = result.prisma;
 * });
 *
 * afterEach(() => {
 *   jest.clearAllMocks();
 * });
 * ```
 */
export { ServiceTest, createServiceTest } from './implementations/service-test';

/**
 * Configuration for ServiceTest
 *
 * @property serviceClass - Service class to test
 * @property mocks - Mock providers (typically PrismaService)
 */
export type {
  CreateServiceTestConfig,
  ServiceTestConfig,
  ServiceTestResult,
} from './implementations/service-test';

/**
 * E2E Test
 *
 * End-to-end testing with complete application setup.
 * Provides access to HTTP methods, authentication, database operations, and assertions.
 *
 * Use this for testing complete user workflows from start to finish.
 *
 * @example
 * ```typescript
 * const test = new E2ETest();
 * await test.setup();
 *
 * // Create test data
 * const coach = await test.db.createTestCoach();
 * const user = await test.db.createTestUser();
 *
 * // Create tokens
 * const userToken = await test.auth.createTestJwtToken({ sub: user.id, role: Role.USER });
 *
 * // Test workflow
 * const response = await test.http.authenticatedGet('/api/sessions', userToken);
 * test.assert.assertSuccessResponse(response);
 *
 * await test.cleanup();
 * ```
 */
export { E2ETest } from './implementations/e2e-test';

/**
 * Configuration for E2ETest
 *
 * @property timeout - Optional timeout for setup/cleanup operations
 */
export type { E2ETestConfig } from './implementations/e2e-test';
