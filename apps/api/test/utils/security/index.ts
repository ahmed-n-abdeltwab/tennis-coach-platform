/**
 * Security test utilities
 *
 * This module provides utilities for testing authentication and authorization:
 * - Protected route testing
 * - Role-based access control testing
 */

// Export ProtectedRouteTester
export { ProtectedRouteTester } from './protected-route-tester';

// Export RoleBasedAccessTester and related types
export { RoleBasedAccessTester } from './role-based-access-tester';
export type { RoleAccessConfig, RoleAccessTestResult } from './role-based-access-tester';
