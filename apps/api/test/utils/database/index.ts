/**
 * Database Testing Utilities
 *
 * This module exports database-related testing utilities including:
 * - TestDatabaseManager for managing test database lifecycle
 * - Performance optimization utilities (connection pooling, batch cleanup)
 *
 * For database operations in tests, use DatabaseMixin through IntegrationTest
 * or E2ETest classes.
 *
 * @example Recommended approach
 * ```typescript
 * import { IntegrationTest } from '@test-utils/base';
 *
 * const test = new IntegrationTest({ modules: [MyModule] });
 * await test.setup(); // Automatically handles database setup
 * const user = await test.db.createTestUser();
 * await test.cleanup(); // Automatically handles database cleanup
 * ```
 *
 * @module database
 */

/**
 * Test database manager
 *
 * Manages test database lifecycle including creation, isolation, and cleanup.
 * Useful for advanced scenarios requiring multiple isolated test databases.
 */
export * from './test-database-manager';

/**
 * Batch cleanup manager
 *
 * Provides optimized batch cleanup operations for improved test performance.
 * Automatically used by DatabaseMixin for efficient database cleanup.
 */
export * from './batch-cleanup-manager';

/**
 * Connection pool manager
 *
 * Manages database connection pooling for improved test performance.
 * Automatically used by test infrastructure for efficient connection reuse.
 */
export * from './connection-pool-manager';
