/**
 * Database Testing Utilities
 *
 * This module exports all database-related testing utilities including:
 * - TestDatabaseManager for managing test database lifecycle
 * - DatabaseSeeder for creating consistent test data
 * - Simple database helpers for common operations
 * - Performance optimization utilities (connection pooling, batch cleanup)
 *
 * @deprecated For new code, prefer using DatabaseMixin through IntegrationTest
 * or E2ETest classes. These standalone utilities are maintained for backward
 * compatibility and advanced use cases.
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
 * @example Legacy approach (still supported)
 * ```typescript
 * import { cleanDatabase, seedTestDatabase } from '@test-utils/database';
 *
 * await cleanDatabase(prisma);
 * await seedTestDatabase(prisma);
 * ```
 *
 * @module database
 */

/**
 * Simple database helper functions
 *
 * Provides quick database operations for tests including:
 * - cleanDatabase: Clean all test data from database
 * - seedTestDatabase: Seed database with test data
 * - createTestUser: Create a test user
 * - createTestCoach: Create a test coach
 *
 * @deprecated These functions now delegate to DatabaseMixin internally.
 * For new code, use IntegrationTest or E2ETest classes which provide
 * access to DatabaseMixin through the `db` property.
 */
export * from './database-helpers';

/**
 * Database seeder utilities
 *
 * Provides DatabaseSeeder class for creating consistent test data with
 * configurable options for user count, coach count, sessions, etc.
 *
 * @deprecated DatabaseSeeder now delegates to DatabaseMixin internally.
 * For new code, use IntegrationTest or E2ETest classes.
 */
export * from './database-seeder';

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

// Re-import for convenience functions below
import { createDatabaseSeeder, DatabaseSeeder, SeedDataOptions } from './database-seeder';
import { DatabaseConnection, testDatabaseManager } from './test-database-manager';

/**
 * Convenience function to setup a complete test database environment
 *
 * This function combines all the utilities to create a fully configured
 * test database with seeding support.
 */
export async function setupTestDatabaseEnvironment(
  testSuite: string,
  options: {
    type?: 'unit' | 'integration' | 'e2e';
    seedData?: boolean;
    seedOptions?: SeedDataOptions;
    verbose?: boolean;
  } = {}
): Promise<{
  connection: DatabaseConnection;
  seeder: DatabaseSeeder;
  cleanup: () => Promise<void>;
}> {
  const { type = 'integration', seedData = true, seedOptions = {}, verbose = false } = options;

  if (verbose) {
    console.log(`Setting up test database environment for: ${testSuite}`);
  }

  // Create test database
  const connection = await testDatabaseManager.createTestDatabase(testSuite, {
    type,
    isolationLevel: 'database',
    autoCleanup: true,
    seedData: false, // We'll handle seeding separately
  });

  // Create seeder instance
  const seeder = createDatabaseSeeder(connection.client);

  // Seed data if requested
  if (seedData) {
    if (verbose) {
      console.log('Seeding test database...');
    }
    await seeder.seedAll(seedOptions);
  }

  // Cleanup function
  const cleanup = async () => {
    if (verbose) {
      console.log(`Cleaning up test database environment for: ${testSuite}`);
    }
    await testDatabaseManager.cleanupTestDatabase(testSuite);
  };

  if (verbose) {
    console.log(`Test database environment ready for: ${testSuite}`);
  }

  return {
    connection,
    seeder,
    cleanup,
  };
}

/**
 * Convenience function for quick test database setup with minimal configuration
 */
export async function setupMinimalTestDatabase(testSuite: string) {
  return setupTestDatabaseEnvironment(testSuite, {
    type: 'integration',
    seedData: true,
    seedOptions: {
      userCount: 1,
      coachCount: 1,
      bookingTypeCount: 1,
      timeSlotCount: 2,
      sessionCount: 1,
      includeMessages: false,
      includeDiscounts: false,
    },
    verbose: false,
  });
}

/**
 * Convenience function for comprehensive test database setup
 */
export async function setupComprehensiveTestDatabase(testSuite: string) {
  return setupTestDatabaseEnvironment(testSuite, {
    type: 'integration',
    seedData: true,
    seedOptions: {
      userCount: 5,
      coachCount: 3,
      bookingTypeCount: 4,
      timeSlotCount: 20,
      sessionCount: 10,
      includeMessages: true,
      includeDiscounts: true,
    },
    verbose: false,
  });
}

/**
 * Global cleanup function for all test databases
 * Use this in global test teardown
 */
export async function cleanupAllTestDatabases(): Promise<void> {
  await testDatabaseManager.cleanupAllTestDatabases();
}
