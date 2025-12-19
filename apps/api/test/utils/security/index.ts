/**
 * Security Test Utilities
 *
 * This module provides utilities for testing authentication and authorization:
 * - Protected route testing (ensuring routes require authentication)
 * - Role-based access control testing (ensuring proper role restrictions)
 *
 * These utilities remain recommended for security-focused testing scenarios.
 *
 * @example Testing protected routes
 * ```typescript
 * import { ProtectedRouteTester } from '@test-utils/security';
 *
 * const tester = new ProtectedRouteTester(app);
 * await tester.testRequiresAuth('/api/sessions', 'GET');
 * await tester.testRequiresAuth('/api/sessions', 'POST');
 * ```
 *
 * @example Testing role-based access
 * ```typescript
 * import { RoleBasedAccessTester } from '@test-utils/security';
 * import { Role } from '@prisma/client';
 *
 * const tester = new RoleBasedAccessTester(app);
 * await tester.testRoleBasedAccess('/api/admin/users', [Role.ADMIN], 'GET');
 * await tester.testRoleBasedAccess('/api/coach/sessions', [Role.COACH, Role.ADMIN], 'POST');
 * ```
 *
 * @module security
 */

/**
 * Protected Route Tester
 *
 * Provides utilities for testing that routes require authentication.
 * Verifies that unauthenticated requests are properly rejected.
 */
export { ProtectedRouteTester } from './protected-route-tester';

/**
 * Role-Based Access Tester
 *
 * Provides utilities for testing role-based access control.
 * Verifies that routes are only accessible to users with appropriate roles.
 */
export { RoleBasedAccessTester } from './role-based-access-tester';

/**
 * Role access configuration type
 *
 * Defines the configuration for role-based access tests.
 */
export type { RoleAccessConfig, RoleAccessTestResult } from './role-based-access-tester';
