/**
 * Database Testing Utilities
 *
 * This module exports all database-related testing utiluding:
 * - TestDatabaseManager for managing test database lifecycle
 * - DatabaseSeeder for creating consistent test data
 * - TransactionManager for transaction-based test isolation
 * - MigrationManager for handling database migrations in tests
 */

import { createDatabaseSeeder, DatabaseSeeder, SeedDataOptions } from './database-seeder';
import { MigrationOptions } from './migration-manager';
import { DatabaseConnection, testDatabaseManager } from './test-database-manager';
import { createTransactionManager, TransactionManager } from './transaction-manager';

/**
 * Convenience function to setup a complete test database environment
 *
 * This function combines all the utilities to create a fully configured
 * test database with migrations, seeding, and transaction support.
 */
export async function setupTestDatabaseEnvironment(
  testSuite: string,
  options: {
    type?: 'unit' | 'integration' | 'e2e';
    seedData?: boolean;
    seedOptions?: SeedDataOptions;
    migrationOptions?: MigrationOptions;
    verbose?: boolean;
  } = {}
): Promise<{
  connection: DatabaseConnection;
  seeder: DatabaseSeeder;
  transactionManager: TransactionManager;
  cleanup: () => Promise<void>;
}> {
  const {
    type = 'integration',
    seedData = true,
    seedOptions = {},
    migrationOptions = {},
    verbose = false,
  } = options;

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

  // Create transaction manager
  const txManager = createTransactionManager();

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
    transactionManager: txManager,
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
