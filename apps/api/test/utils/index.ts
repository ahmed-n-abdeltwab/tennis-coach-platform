/**
 * Test Utilities Index
 *
 * Central export point for all test utilities in the application.
 * This module provides a comprehensive set of tools for writing tests including:
 * - Base test classes with mixins (recommended approach)
 * - Type-safe HTTP clients
 * - Authentication utilities
 * - Database helpers and seeders
 * - Mock factories
 * - Property-based testing utilities
 * - Performance monitoring
 *
 * @module test-utils
 */

// ============================================================================
// Base Test Classes - DRY, Composable, Configuration-based
// ============================================================================

/**
 * DRY Base test classes with clean composition
 *
 * These classes follow DRY principles and use composition over inheritance:
 * - Single Responsibility: Each mixin handles one concern
 * - Composable: Mix and match capabilities as needed
 * - Type-safe: Full TypeScript support with generics
 * - Zero boilerplate: Simple configuration objects
 *
 * Benefits:
 * - Easy to read and understand (< 200 lines per file)
 * - Easy to extend (add new mixins without touching existing code)
 * - Easy to test (each mixin can be tested independently)
 * - No code duplication (HTTP methods defined once, used everywhere)
 *
 * @example Integration Test
 * ```typescript
 * import { IntegrationTest } from '@test-utils';
 *
 * const test = new IntegrationTest({
 *   modules: [MyModule],
 *   moduleName: 'booking-types',
 * });
 *
 * await test.setup();
 * const response = await test.http.get('/api/booking-types');
 * const user = await test.db.createTestUser();
 * test.assert.assertSuccessResponse(response);
 * ```
 *
 * @example Controller Test
 * ```typescript
 * import { ControllerTest } from '@test-utils';
 *
 * const test = new ControllerTest({
 *   controllerClass: BookingTypesController,
 *   moduleName: 'booking-types',
 *   providers: [mockService],
 * });
 *
 * await test.setup();
 * const token = await test.auth.createRoleToken(Role.COACH);
 * await test.http.authenticatedPost('/api/booking-types', token, { body: data });
 * ```
 *
 * @example Service Test
 * ```typescript
 * import { ServiceTest } from '@test-utils';
 *
 * const test = new ServiceTest({
 *   serviceClass: BookingTypesService,
 *   mocks: [{ provide: PrismaService, useValue: mockPrisma }],
 * });
 *
 * await test.setup();
 * test.prisma.bookingType.findMany.mockResolvedValue([]);
 * const result = await test.service.findAll();
 * ```
 *
 * @example E2E Test
 * ```typescript
 * import { E2ETest } from '@test-utils';
 *
 * const test = new E2ETest();
 * await test.setup();
 * await test.http.authenticatedPost('/api/sessions', token, { body: data });
 * ```
 */
export * from './base';

// ============================================================================
// Type-Safe Test Utilities
// ============================================================================

/**
 * Authentication type definitions
 *
 * Provides type definitions for authentication in tests.
 * For authentication functionality, use AuthMixin through test classes.
 *
 * @example
 * ```typescript
 * import { IntegrationTest, AuthHeaders } from '@test-utils';
 * const test = new IntegrationTest({ modules: [MyModule] });
 * await test.setup();
 * const token = await test.auth.createTestJwtToken();
 * const headers: AuthHeaders = await test.auth.createAuthHeaders(token);
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
 * Database utilities
 *
 * Provides database management utilities including:
 * - TestDatabaseManager for managing test database lifecycle
 * - Performance optimization utilities (connection pooling, batch cleanup)
 *
 * For database operations in tests, use DatabaseMixin through test classes.
 *
 * @example
 * ```typescript
 * import { IntegrationTest } from '@test-utils';
 * const test = new IntegrationTest({ modules: [MyModule] });
 * await test.setup(); // Automatically handles database setup
 * const user = await test.db.createTestUser();
 * await test.cleanup(); // Automatically handles database cleanup
 * ```
 */
export * from './database';

/**
 * Test data factories
 *
 * Provides factories for creating mock test data with sensible defaults.
 * These factories create mock data objects (not database records).
 *
 * For creating database records, use DatabaseMixin through test classes.
 *
 * @example
 * ```typescript
 * import { AccountMockFactory } from '@test-utils';
 * const factory = new AccountMockFactory();
 * const mockUser = factory.createUser(); // Creates mock object, not DB record
 * ```
 */
export * from './factories';

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
 * Provides helpers for role-based testing scenarios.
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
 * Mock utilities
 *
 * Provides mock data and mock service creation utilities.
 *
 * @example
 * ```typescript
 * import { MockBookingType } from '@test-utils';
 * const mockData = MockBookingType.create();
 * ```
 */
export * from './mocks';

/**
 * Type utilities for test infrastructure
 *
 * Provides comprehensive type utilities for type-safe testing including:
 * - DeepPartial: Make all properties optional recursively
 * - MockRequest/MockResponse: Type-safe mock HTTP objects
 * - Type guards: Runtime type checking utilities
 * - Utility types: RequireProps, OptionalProps, Merge, etc.
 *
 * @example
 * ```typescript
 * import { DeepPartial, MockRequest, isDefined } from '@test-utils';
 *
 * const partialUser: DeepPartial<User> = { name: 'John' };
 * const mockReq: MockRequest = createMockRequest();
 * if (isDefined(value)) { ... }
 * ```
 */
export * from './types';

/**
 * Property-based testing utilities
 *
 * Provides configuration, generators (arbitraries), and helpers for
 * property-based testing using fast-check library.
 *
 * Property-based testing validates that properties hold true across
 * many randomly generated inputs, providing stronger correctness guarantees
 * than example-based tests.
 *
 * @example
 * ```typescript
 * import { defaultPropertyTestConfig, jwtPayloadArbitrary } from '@test-utils';
 * import * as fc from 'fast-check';
 *
 * it('should maintain token round-trip consistency', () => {
 *   fc.assert(
 *     fc.property(jwtPayloadArbitrary(), async (payload) => {
 *       const token = await authHelper.createToken(payload);
 *       const decoded = await authHelper.decodeToken(token);
 *       expect(decoded).toMatchObject(payload);
 *     }),
 *     defaultPropertyTestConfig
 *   );
 * });
 * ```
 */
export * from './property-testing';

/**
 * Performance monitoring utilities
 *
 * Provides tools for tracking and reporting test performance including:
 * - Test execution time tracking
 * - Database operation timing
 * - Slow test detection
 * - Performance warnings and reports
 *
 * @example
 * ```typescript
 * import { performanceMonitor } from '@test-utils';
 *
 * await performanceMonitor.trackDatabaseOperation('create-user', async () => {
 *   return await prisma.account.create({ data: userData });
 * });
 *
 * const report = performanceMonitor.generateReport();
 * console.log(report);
 * ```
 */
export * from './performance';

/**
 * Cache utilities
 *
 * Provides caching for frequently used test data to improve performance:
 * - User and coach caching
 * - Booking type caching
 * - Automatic cache invalidation
 * - Cache statistics
 *
 * Note: DatabaseMixin automatically uses testDataCache internally.
 * These exports are provided for advanced use cases and monitoring.
 *
 * @example
 * ```typescript
 * import { testDataCache } from '@test-utils';
 *
 * // Cache a user
 * testDataCache.cacheUser(user);
 *
 * // Get cached user
 * const cachedUser = testDataCache.getUser(userId);
 *
 * // Get cache stats
 * const stats = testDataCache.getStats();
 * ```
 */
export * from './cache';

/**
 * Test constants
 *
 * Provides default values and constants used across test utilities.
 * These constants ensure consistency in test data creation.
 *
 * @example
 * ```typescript
 * import { DEFAULT_TEST_USER, DEFAULT_TEST_COACH } from '@test-utils';
 *
 * const userData = {
 *   ...DEFAULT_TEST_USER,
 *   email: 'custom@example.com',
 * };
 * ```
 */
export * from './constants';

/**
 * Helper utilities
 *
 * Provides common helper functions for test data generation and manipulation.
 *
 * @example
 * ```typescript
 * import { generateUniqueEmail, getFutureDate } from '@test-utils';
 *
 * const email = generateUniqueEmail('test-user');
 * const futureDate = getFutureDate(24); // 24 hours from now
 * ```
 */
export * from './helpers';

/**
 * Error utilities
 *
 * Provides custom error types for test infrastructure.
 * These errors provide better context when test setup or cleanup fails.
 *
 * @example
 * ```typescript
 * import { TestSetupError, TestCleanupError } from '@test-utils';
 *
 * throw new TestSetupError('Failed to initialize database', originalError);
 * ```
 */
export * from './errors';
