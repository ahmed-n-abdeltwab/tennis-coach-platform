/**
 * Database Infrastructure Utilities
 *
 * Low-level database infrastructure for test environments including:
 * - TestDatabaseManager for managing test database lifecycle
 * - ConnectionPoolManager for efficient connection reuse
 * - BatchCleanupManager for optimized database cleanup
 *
 * These are infrastructure-level utilities that power the higher-level
 * test abstractions in @test-utils/base.
 *
 * For most tests, use IntegrationTest or E2ETest classes from @test-utils/base
 * which provide DatabaseMixin with a cleaner API.
 *
 * @example Direct usage (advanced scenarios)
 * ```typescript
 * import { testDatabaseManager } from '@test-infrastructure/database';
 *
 * const connection = await testDatabaseManager.createTestDatabase('my-test');
 * // ... use connection.client for database operations
 * await testDatabaseManager.cleanupTestDatabase('my-test');
 * ```
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
 * @module infrastructure/database
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
