/**
 * Tests for database utilities
 *
 * This test suite verifies that all database management utilities work correctly:
 * - TestDatabaseManager
 * - TestDatabaseSeeder
 * - TransactionManager
 * - MigrationManager
 */

import { Prisma, PrismaClient, User } from '@prisma/client';
import { setupMinimalTestDatabase, setupTestDatabaseEnvironment } from '..';
import { createDatabaseSeeder, DatabaseSeeder, SeedDataOptions } from '../database-seeder';
import { TestDatabaseConfig, testDatabaseManager } from '../test-database-manager';
import { transactionManager } from '../transaction-manager';

describe('Database Utilities', () => {
  const testSuiteName = 'database-utilities-test';
  let testClient: PrismaClient;

  afterAll(async () => {
    // Cleanup all test databases
    await testDatabaseManager.cleanupAllTestDatabases();
  });

  describe('TestDatabaseManager', () => {
    it('should create a test database with proper configuration', async () => {
      const config: TestDatabaseConfig = {
        type: 'integration',
        isolationLevel: 'database',
        autoCleanup: true,
        seedData: false,
      };

      const connection = await testDatabaseManager.createTestDatabase(
        `${testSuiteName}-create`,
        config
      );

      expect(connection).toBeDefined();
      expect(connection.client).toBeInstanceOf(PrismaClient);
      expect(connection.name).toContain('test_integration');
      expect(connection.type).toBe('integration');
      expect(connection.url).toContain(connection.name);

      // Verify database connection works
      await connection.client.$queryRaw`SELECT 1 as test`;

      // Cleanup
      await testDatabaseManager.cleanupTestDatabase(`${testSuiteName}-create`);
    });

    it('should reuse existing database connection', async () => {
      const testName = `${testSuiteName}-reuse`;

      const connection1 = await testDatabaseManager.createTestDatabase(testName);
      const connection2 = await testDatabaseManager.createTestDatabase(testName);

      expect(connection1).toBe(connection2);
      expect(connection1.name).toBe(connection2.name);

      await testDatabaseManager.cleanupTestDatabase(testName);
    });

    it('should seed database when requested', async () => {
      const testName = `${testSuiteName}-seed`;

      const connection = await testDatabaseManager.createTestDatabase(testName, {
        type: 'integration',
        isolationLevel: 'database',
        autoCleanup: true,
        seedData: true,
      });

      // Verify seeded data exists
      const users = await connection.client.user.findMany();
      const coaches = await connection.client.coach.findMany();

      expect(users.length).toBeGreaterThan(0);
      expect(coaches.length).toBeGreaterThan(0);

      await testDatabaseManager.cleanupTestDatabase(testName);
    });

    it('should cleanup test database properly', async () => {
      const testName = `${testSuiteName}-cleanup`;

      const connection = await testDatabaseManager.createTestDatabase(testName);
      expect(testDatabaseManager.getTestDatabase(testName)).toBeDefined();

      await testDatabaseManager.cleanupTestDatabase(testName);
      expect(testDatabaseManager.getTestDatabase(testName)).toBeUndefined();
    });
  });

  describe('DatabaseSeeder', () => {
    beforeEach(async () => {
      const connection = await testDatabaseManager.createTestDatabase(`${testSuiteName}-seeder`, {
        seedData: false,
      } as TestDatabaseConfig);
      testClient = connection.client;
    });

    afterEach(async () => {
      await testDatabaseManager.cleanupTestDatabase(`${testSuiteName}-seeder`);
    });

    it('should seed minimal data correctly', async () => {
      const seeder = createDatabaseSeeder(testClient);
      const seededData = await seeder.seedMinimal();

      expect(seededData.users).toHaveLength(1);
      expect(seededData.coaches).toHaveLength(1);
      expect(seededData.bookingTypes).toHaveLength(1);
      expect(seededData.timeSlots).toHaveLength(2);
      expect(seededData.sessions).toHaveLength(1);
      expect(seededData.messages).toHaveLength(0);
      expect(seededData.discounts).toHaveLength(0);

      // Verify data in database
      const users = await testClient.user.findMany();
      const coaches = await testClient.coach.findMany();

      expect(users).toHaveLength(1);
      expect(coaches).toHaveLength(1);
      expect(users[0].email).toContain('@example.com');
      expect(coaches[0].email).toContain('@example.com');
    });

    it('should seed comprehensive data correctly', async () => {
      const seeder = createDatabaseSeeder(testClient);
      const seededData = await seeder.seedComprehensive();

      expect(seededData.users.length).toBeGreaterThan(1);
      expect(seededData.coaches.length).toBeGreaterThan(1);
      expect(seededData.bookingTypes.length).toBeGreaterThan(1);
      expect(seededData.timeSlots.length).toBeGreaterThan(5);
      expect(seededData.sessions.length).toBeGreaterThan(1);
      expect(seededData.messages.length).toBeGreaterThan(0);
      expect(seededData.discounts.length).toBeGreaterThan(0);
    });

    it('should seed custom data with options', async () => {
      const seeder = createDatabaseSeeder(testClient);
      const options: SeedDataOptions = {
        userCount: 3,
        coachCount: 2,
        bookingTypeCount: 2,
        timeSlotCount: 6,
        sessionCount: 3,
        includeMessages: true,
        includeDiscounts: false,
      };

      const seededData = await seeder.seedAll(options);

      expect(seededData.users).toHaveLength(3);
      expect(seededData.coaches).toHaveLength(2);
      expect(seededData.bookingTypes).toHaveLength(4); // 2 per coach
      expect(seededData.timeSlots).toHaveLength(6);
      expect(seededData.sessions).toHaveLength(3);
      expect(seededData.messages.length).toBeGreaterThan(0);
      expect(seededData.discounts).toHaveLength(0);
    });

    it('should clear all data correctly', async () => {
      const seeder = createDatabaseSeeder(testClient);

      // Seed some data first
      await seeder.seedMinimal();

      // Verify data exists
      let users = await testClient.user.findMany();
      expect(users.length).toBeGreaterThan(0);

      // Clear all data
      await seeder.clearAll();

      // Verify data is cleared
      users = await testClient.user.findMany();
      const coaches = await testClient.coach.findMany();
      const sessions = await testClient.session.findMany();

      expect(users).toHaveLength(0);
      expect(coaches).toHaveLength(0);
      expect(sessions).toHaveLength(0);
    });
  });

  describe('TransactionManager', () => {
    beforeEach(async () => {
      const connection = await testDatabaseManager.createTestDatabase(
        `${testSuiteName}-transaction`,
        { seedData: false } as TestDatabaseConfig
      );
      testClient = connection.client;
    });

    afterEach(async () => {
      await testDatabaseManager.cleanupTestDatabase(`${testSuiteName}-transaction`);
    });

    it('should rollback transaction automatically', async () => {
      let createdUserId: string;

      // Execute operation in transaction
      await transactionManager.withTransaction(testClient, async tx => {
        const user = await tx.user.create({
          data: {
            email: 'transaction-test@example.com',
            name: 'Transaction Test User',
            passwordHash: '$2b$10$test.hash',
          },
        });
        createdUserId = user.id;

        // Verify user exists within transaction
        const foundUser = await tx.user.findUnique({
          where: { id: createdUserId },
        });
        expect(foundUser).toBeDefined();
      });

      // Verify user was rolled back
      const users = await testClient.user.findMany();
      expect(users).toHaveLength(0);
    });

    it('should commit transaction when using withCommittedTransaction', async () => {
      let createdUserId: string = '';

      // Execute operation in committed transaction
      await transactionManager.withCommittedTransaction(testClient, async tx => {
        const user: User = await tx.user.create({
          data: {
            email: 'committed-test@example.com',
            name: 'Committed Test User',
            passwordHash: '$2b$10$test.hash',
          },
        });
        createdUserId = user.id;
      });

      // Verify user was committed
      const user: User | null = await testClient.user.findUnique({
        where: { id: createdUserId },
      });
      expect(user).toBeDefined();
      expect(user?.email).toBe('committed-test@example.com');
    });

    it('should handle multiple transactions independently', async () => {
      const callbacks = [
        async (tx: Prisma.TransactionClient) => {
          return tx.user.create({
            data: {
              email: 'user1@example.com',
              name: 'User 1',
              passwordHash: '$2b$10$test.hash',
            },
          });
        },
        async (tx: Prisma.TransactionClient) => {
          return tx.user.create({
            data: {
              email: 'user2@example.com',
              name: 'User 2',
              passwordHash: '$2b$10$test.hash',
            },
          });
        },
      ];

      const results = await transactionManager.withMultipleTransactions(testClient, callbacks);

      expect(results).toHaveLength(2);
      expect(results[0].email).toBe('user1@example.com');
      expect(results[1].email).toBe('user2@example.com');

      // Verify users were rolled back
      const users = await testClient.user.findMany();
      expect(users).toHaveLength(0);
    });

    it('should create transaction test helper', async () => {
      const helper = transactionManager.createTransactionTestHelper(testClient);

      const setupResult = await helper.setup(async tx => {
        return tx.user.create({
          data: {
            email: 'helper-test@example.com',
            name: 'Helper Test User',
            passwordHash: '$2b$10$test.hash',
          },
        });
      });

      expect(setupResult.email).toBe('helper-test@example.com');

      // Verify rollback
      const users = await testClient.user.findMany();
      expect(users).toHaveLength(0);
    });
  });

  describe('Integration Tests', () => {
    it('should setup complete test database environment', async () => {
      const testName = `${testSuiteName}-integration`;

      const environment = await setupTestDatabaseEnvironment(testName, {
        type: 'integration',
        seedData: true,
        seedOptions: {
          userCount: 2,
          coachCount: 1,
          includeMessages: false,
          includeDiscounts: false,
        },
      });

      expect(environment.connection).toBeDefined();
      expect(environment.seeder).toBeInstanceOf(DatabaseSeeder);
      expect(environment.transactionManager).toBeDefined();
      expect(environment.cleanup).toBeInstanceOf(Function);

      // Verify seeded data
      const users = await environment.connection.client.user.findMany();
      const coaches = await environment.connection.client.coach.findMany();

      expect(users).toHaveLength(2);
      expect(coaches).toHaveLength(1);

      // Test transaction functionality
      await environment.transactionManager.withTransaction(
        environment.connection.client,
        async tx => {
          const newUser = await tx.user.create({
            data: {
              email: 'tx-test@example.com',
              name: 'Transaction Test',
              passwordHash: '$2b$10$test.hash',
            },
          });
          expect(newUser).toBeDefined();
        }
      );

      // Verify transaction was rolled back
      const usersAfterTx = await environment.connection.client.user.findMany();
      expect(usersAfterTx).toHaveLength(2); // Same as before

      // Cleanup
      await environment.cleanup();
    });

    it('should setup minimal test database quickly', async () => {
      const testName = `${testSuiteName}-minimal`;

      const environment = await setupMinimalTestDatabase(testName);

      expect(environment.connection).toBeDefined();
      expect(environment.seeder).toBeInstanceOf(DatabaseSeeder);

      // Verify minimal data
      const users = await environment.connection.client.user.findMany();
      const coaches = await environment.connection.client.coach.findMany();
      const sessions = await environment.connection.client.session.findMany();

      expect(users).toHaveLength(1);
      expect(coaches).toHaveLength(1);
      expect(sessions).toHaveLength(1);

      await environment.cleanup();
    });
  });
});
