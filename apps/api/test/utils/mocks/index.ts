/**
 * Test Mocks
 *
 * Centralized exports for all test mock data and mock service utilities.
 *
 * This module provides:
 * - Mock data objects for all domain entities
 * - Mock service implementations (Redis, HTTP, etc.)
 * - Mock factories for creating test data
 *
 * @deprecated For new code, prefer using DatabaseMixin methods through
 * IntegrationTest or E2ETest classes for creating real test data, or
 * MockMixin for creating mock services. These mock objects are maintained
 * for backward compatibility.
 *
 * @example Recommended approach for test data
 * ```typescript
 * import { IntegrationTest } from '@test-utils/base';
 *
 * const test = new IntegrationTest({ modules: [MyModule] });
 * await test.setup();
 * const user = await test.db.createTestUser(); // Real data
 * ```
 *
 * @example Recommended approach for mock services
 * ```typescript
 * import { ServiceTest } from '@test-utils/base';
 *
 * const test = new ServiceTest({
 *   serviceClass: MyService,
 *   mocks: [mockPrisma],
 * });
 * await test.setup();
 * const mockPrisma = test.mock.createMockPrismaService();
 * ```
 *
 * @example Legacy approach (still supported)
 * ```typescript
 * import { MockAccount, MockSession } from '@test-utils/mocks';
 *
 * const mockUser = MockAccount.createUser();
 * const mockSession = MockSession.create();
 * ```
 *
 * @module mocks
 */

/** Mock account data and utilities */
export * from './account.mock';

/** Mock authentication data and utilities */
export * from './auth.mock';

/** Mock booking type data and utilities */
export * from './booking-type.mock';

/** Mock coach data and utilities */
export * from './coach.mock';

/** Mock discount data and utilities */
export * from './discount.mock';

/** Mock HTTP request/response utilities */
export * from './http.mock';

/** Mock message data and utilities */
export * from './message.mock';

/** Mock notification data and utilities */
export * from './notification.mock';

/** Mock payment data and utilities */
export * from './payment.mock';

/** Mock Redis client utilities */
export * from './redis.mock';

/** Mock session data and utilities */
export * from './session.mock';

/** Mock time slot data and utilities */
export * from './time-slot.mock';

/** Mock user data and utilities */
export * from './user.mock';
