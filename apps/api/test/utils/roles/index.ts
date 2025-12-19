/**
 * Role Test Utilities
 *
 * This module provides utilities for creating test users with different roles
 * and managing role-based test scenarios.
 *
 * @deprecated For new code, prefer using AuthMixin through test classes
 * (e.g., test.auth.createRoleToken(Role.USER)). These utilities are
 * maintained for backward compatibility.
 *
 * @example Recommended approach
 * ```typescript
 * import { IntegrationTest } from '@test-utils/base';
 * import { Role } from '@prisma/client';
 *
 * const test = new IntegrationTest({ modules: [MyModule] });
 * await test.setup();
 *
 * const userToken = await test.auth.createRoleToken(Role.USER);
 * const coachToken = await test.auth.createRoleToken(Role.COACH);
 * const adminToken = await test.auth.createRoleToken(Role.ADMIN);
 * ```
 *
 * @example Legacy approach (still supported)
 * ```typescript
 * import { UserRoleHelper } from '@test-utils/roles';
 *
 * const roleHelper = new UserRoleHelper();
 * const userHeaders = roleHelper.createStandardUserHeaders();
 * const coachHeaders = roleHelper.createCoachHeaders();
 * ```
 *
 * @module roles
 */

/**
 * User Role Helper
 *
 * Provides methods for creating authentication headers for different user roles.
 *
 * @deprecated Use AuthMixin through test classes instead
 */
export { UserRoleHelper } from './user-role-helper';
