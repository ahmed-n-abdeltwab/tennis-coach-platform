/**
 * Simple test to verify database cleanup functionality
 * This is a simplified version to test the basic cleanup behavior
 */

import { PrismaClient, Role } from '@prisma/client';

import { TestDatabaseManager } from '../../database/test-database-manager';

describe('Database Cleanup - Simple Test', () => {
  let dbManager: TestDatabaseManager;

  beforeAll(() => {
    dbManager = TestDatabaseManager.getInstance();
  });

  afterAll(async () => {
    await dbManager.cleanupAllTestDatabases();
  });

  it('should remove database after cleanup', async () => {
    const testSuite = 'simple_cleanup_test';

    // Create a test database
    const db = await dbManager.createTestDatabase(testSuite, {
      type: 'integration',
      isolationLevel: 'database',
      autoCleanup: false,
      seedData: false,
    });

    const dbUrl = db.url;
    const _dbName = db.name;

    // Add some test data
    await db.client.account.create({
      data: {
        email: 'test@cleanup.com',
        name: 'Test User',
        passwordHash: 'hash',
        role: Role.USER,
      },
    });

    // Verify data exists
    const countBefore = await db.client.account.count();
    expect(countBefore).toBe(1);

    // Perform cleanup
    await dbManager.cleanupTestDatabase(testSuite);

    // Verify the database connection is removed from manager
    const connection = dbManager.getTestDatabase(testSuite);
    expect(connection).toBeUndefined();

    // Verify the database no longer exists by trying to connect
    const testClient = new PrismaClient({
      datasources: {
        db: {
          url: dbUrl,

        },
      },
    });

    let connectionFailed = false;
    try {
      await testClient.$connect();
      // Try to query - this should fail if database doesn't exist
      await testClient.$executeRawUnsafe(`SELECT 1`);
      await testClient.$disconnect();
    } catch  {
      // Expected: connection or query should fail because database doesn't exist
      connectionFailed = true;
      try {
        await testClient.$disconnect();
      } catch {
        // Ignore disconnect errors
      }
    }

    // The connection should have failed because the database was dropped
    expect(connectionFailed).toBe(true);
  }, 60000); // 1 minute timeout
});
