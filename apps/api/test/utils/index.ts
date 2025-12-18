/**
 * Test utilities index
 * Exports all test utility functions and classes
 */

// Base test utilities
export * from './database'; // Includes database helpers
export * from './factories';

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
 * await test.http.get('/api/booking-types');
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
// Type-Safe Test Utilities (Recommended)
// ============================================================================

/**
 * Authentication utilities
 *
 * Provides helpers for creating JWT tokens and authenticated HTTP clients.
 *
 * @example
 * ```typescript
 * import { AuthTestHelper, AuthenticatedHttpClient } from '@test-utils';
 *
 * const authHelper = new AuthTestHelper();
 * const token = authHelper.createUserToken();
 * const client = new AuthenticatedHttpClient(app, token);
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
 * Provides helpers for creating test users with different roles.
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
 * Mocks management utilities
 *
 * Provides helpers for creating mocks for the test users.
 *
 * @example
 * ```typescript
 * import { MockBookingType } from '@test-utils';
 *
 * const roleHelper = new UserRoleHelper();
 * const userHeaders = roleHelper.createStandardUserHeaders();
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
