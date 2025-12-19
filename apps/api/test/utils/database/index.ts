/**
 * Database Testing Utilities
 *
 * This module exports all database-related testing utilities including:
 * - TestDatabaseManager for managing test database lifecycle
 * - DatabaseSeeder for creating consistent test data
 * - Simple database helpers for common operations
 */

/**
 * Simple database helper functions
 * For quick database operations in tests
 *
 * Note: These functions now delegate to DatabaseMixin internally.
 * For new code, consider using IntegrationTest or E2ETest classes
 * which provide access to DatabaseMixin through the `db` property.
 */
export * from './database-helpers';

/**
 * Database seeder utilities
 * For creating consistent test data
 *
 * Note: DatabaseSeeder now delegates to DatabaseMixin internally.
 * For new code, consider using IntegrationTest or E2ETest classes.
 */
export * from './database-seeder';

/**
 * Test database manager
 * For managing test database lifecycle
 */
export * from './test-database-manager';

/**
 * Performance optimization utilities
 * For improved test performance through connection pooling and batch operations
 */
export * from './batch-cleanup-manager';
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
