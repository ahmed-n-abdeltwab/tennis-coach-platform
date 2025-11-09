/**
 * TestDatabaseManager - Singleton pattern for managing test databases
 *
 * This class provides czed database management for tests including:
 * - Creating isolated test databases for different test types
 * - Managing database lifecycle (setup, cleanup, teardown)
 * - Transaction rollback mechanisms for integration tests
 * - Database migration management for tests
 */

import { execSync } from 'child_process';
import { randomUUID } from 'crypto';

import { Prisma, PrismaClient, Role } from '@prisma/client';

export interface TestDatabaseConfig {
  type: 'unit' | 'integration' | 'e2e';
  isolationLevel: 'database' | 'transaction' | 'none';
  autoCleanup: boolean;
  seedData: boolean;
}

export interface DatabaseConnection {
  url: string;
  client: PrismaClient;
  name: string;
  type: string;
}

export class TestDatabaseManager {
  private static instance: TestDatabaseManager;
  private testDatabases: Map<string, DatabaseConnection> = new Map();
  private activeTransactions: Map<string, any> = new Map();
  private baseUrl: string;
  private isInitialized = false;

  private constructor() {
    this.baseUrl = this.extractBaseUrl(process.env.DATABASE_URL || '');
  }

  /**
   * Get singleton instance of TestDatabaseManager
   */
  public static getInstance(): TestDatabaseManager {
    if (!TestDatabaseManager.instance) {
      TestDatabaseManager.instance = new TestDatabaseManager();
    }
    return TestDatabaseManager.instance;
  }

  /**
   * Initialize the test database manager
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Ensure we're in test environment
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('TestDatabaseManager can only be used in test environment');
    }

    this.isInitialized = true;
  }

  /**
   * Create a test database for a specific test suite
   */
  public async createTestDatabase(
    testSuite: string,
    config: TestDatabaseConfig = {
      type: 'integration',
      isolationLevel: 'database',
      autoCleanup: true,
      seedData: false,
    }
  ): Promise<DatabaseConnection> {
    await this.initialize();

    const existingConnection = this.testDatabases.get(testSuite);
    if (existingConnection) {
      return existingConnection;
    }

    const dbName = this.generateTestDatabaseName(testSuite, config.type);
    const dbUrl = this.buildDatabaseUrl(dbName);

    try {
      // Create the database
      await this.createDatabase(dbName);

      // Create Prisma client for the test database
      const client = new PrismaClient({
        datasources: {
          db: {
            url: dbUrl,
          },
        },
      });

      // Connect to the database
      await client.$connect();

      // Run migrations
      await this.runMigrations(dbUrl);

      const connection: DatabaseConnection = {
        url: dbUrl,
        client,
        name: dbName,
        type: config.type,
      };

      this.testDatabases.set(testSuite, connection);

      // Seed data if requested
      if (config.seedData) {
        await this.seedDatabase(testSuite);
      }

      return connection;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to create test database for ${testSuite}: ${error.message}`);
      }
      throw new Error(`Failed to create test database for ${testSuite}: ${String(error)}`);
    }
  }

  /**
   * Get existing test database connection
   */
  public getTestDatabase(testSuite: string): DatabaseConnection | undefined {
    return this.testDatabases.get(testSuite);
  }

  /**
   * Clean up a specific test database
   */
  public async cleanupTestDatabase(testSuite: string): Promise<void> {
    const connection = this.testDatabases.get(testSuite);
    if (!connection) {
      return;
    }

    try {
      // Clean up any active transactions
      await this.rollbackActiveTransactions(testSuite);

      // Disconnect the client
      await connection.client.$disconnect();

      // Drop the database
      await this.dropDatabase(connection.name);

      // Remove from tracking
      this.testDatabases.delete(testSuite);
    } catch (error) {
      if (error instanceof Error) {
        console.warn(
          `Warning: Failed to cleanup test database ${connection.name}: ${error.message}`
        );
      }
      console.warn(`Warning: Failed to cleanup test database ${connection.name}: ${String(error)}`);
    }
  }

  /**
   * Clean up all test databases
   */
  public async cleanupAllTestDatabases(): Promise<void> {
    const cleanupPromises = Array.from(this.testDatabases.keys()).map(testSuite =>
      this.cleanupTestDatabase(testSuite)
    );

    await Promise.allSettled(cleanupPromises);
    this.testDatabases.clear();
    this.activeTransactions.clear();
  }

  /**
   * Seed a test database with test data
   */
  public async seedDatabase(testSuite: string, seedData?: any[]): Promise<void> {
    const connection = this.testDatabases.get(testSuite);
    if (!connection) {
      throw new Error(`No test database found for ${testSuite}`);
    }

    try {
      // Clear existing data first
      await this.clearDatabaseData(connection.client);

      // Use provided seed data or default seed data
      if (seedData) {
        await this.insertSeedData(connection.client, seedData);
      } else {
        await this.insertDefaultSeedData(connection.client);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to seed database for ${testSuite}: ${error.message}`);
      }
      throw new Error(`Failed to seed database for ${testSuite}: ${String(error)}`);
    }
  }

  /**
   * Start a transaction for integration tests
   */
  public async startTransaction(testSuite: string): Promise<any> {
    const connection = this.testDatabases.get(testSuite);
    if (!connection) {
      throw new Error(`No test database found for ${testSuite}`);
    }

    // For Prisma, we'll use the interactive transaction API
    const transactionId = randomUUID();

    // Store a reference to the transaction
    this.activeTransactions.set(`${testSuite}:${transactionId}`, {
      testSuite,
      transactionId,
      client: connection.client,
    });

    return transactionId;
  }

  /**
   * Rollback a specific transaction
   */
  public async rollbackTransaction(testSuite: string, transactionId: string): Promise<void> {
    const transactionKey = `${testSuite}:${transactionId}`;
    const transaction = this.activeTransactions.get(transactionKey);

    if (!transaction) {
      return;
    }

    try {
      // For integration tests, we'll clear the database instead of rollback
      // since Prisma doesn't support manual transaction rollback in the same way
      await this.clearDatabaseData(transaction.client);

      // Remove from active transactions
      this.activeTransactions.delete(transactionKey);
    } catch (error) {
      if (error instanceof Error) {
        console.warn(`Warning: Failed to rollback transaction ${transactionId}: ${error.message}`);
      }
      console.warn(`Warning: Failed to rollback transaction ${transactionId}: ${String(error)}`);
    }
  }

  /**
   * Rollback all active transactions for a test suite
   */
  public async rollbackActiveTransactions(testSuite: string): Promise<void> {
    const transactionKeys = Array.from(this.activeTransactions.keys()).filter(key =>
      key.startsWith(`${testSuite}:`)
    );

    for (const key of transactionKeys) {
      const transactionId = key.split(':')[1] ?? 'no-key';
      await this.rollbackTransaction(testSuite, transactionId);
    }
  }

  /**
   * Execute database operations within a transaction
   */
  public async withTransaction<T>(
    testSuite: string,
    callback: (client: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    const connection: DatabaseConnection | undefined = this.testDatabases.get(testSuite);
    if (!connection) {
      throw new Error(`No test database found for ${testSuite}`);
    }

    return connection.client.$transaction(callback);
  }

  /**
   * Run database migrations on a test database
   */
  public async runMigrations(databaseUrl: string): Promise<void> {
    try {
      // Set the database URL for migration
      const originalUrl = process.env.DATABASE_URL;
      process.env.DATABASE_URL = databaseUrl;

      // Run Prisma migrations
      execSync('npx prisma migrate deploy', {
        cwd: process.cwd(),
        stdio: 'pipe',
        env: { ...process.env, DATABASE_URL: databaseUrl },
      });

      // Restore original URL
      if (originalUrl) {
        process.env.DATABASE_URL = originalUrl;
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to run migrations: ${error.message}`);
      }
      throw new Error(`Failed to run migrations: ${String(error)}`);
    }
  }

  /**
   * Generate Prisma client for test database
   */
  public async generatePrismaClient(databaseUrl: string): Promise<void> {
    try {
      execSync('npx prisma generate', {
        cwd: process.cwd(),
        stdio: 'pipe',
        env: { ...process.env, DATABASE_URL: databaseUrl },
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to generate Prisma client: ${error.message}`);
      }
      throw new Error(`Failed to generate Prisma client: ${String(error)}`);
    }
  }

  // Private helper methods

  private extractBaseUrl(fullUrl: string): string {
    try {
      const url = new URL(fullUrl);
      return `${url.protocol}//${url.username}:${url.password}@${url.host}`;
    } catch (error) {
      throw new Error(`Invalid database URL: ${fullUrl}`);
    }
  }

  private generateTestDatabaseName(testSuite: string, type: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `test_${type}_${testSuite.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}_${random}`;
  }

  private buildDatabaseUrl(dbName: string): string {
    return `${this.baseUrl}/${dbName}`;
  }

  private async createDatabase(dbName: string): Promise<void> {
    const adminClient = new PrismaClient({
      datasources: {
        db: {
          url: `${this.baseUrl}/postgres`, // Connect to default postgres database
        },
      },
    });

    try {
      await adminClient.$connect();
      await adminClient.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
    } catch (error) {
      if (error instanceof Error && !error.message.includes('already exists')) {
        throw error;
      }
    } finally {
      await adminClient.$disconnect();
    }
  }

  private async dropDatabase(dbName: string): Promise<void> {
    const adminClient = new PrismaClient({
      datasources: {
        db: {
          url: `${this.baseUrl}/postgres`, // Connect to default postgres database
        },
      },
    });

    try {
      await adminClient.$connect();

      // Terminate active connections to the database
      await adminClient.$executeRawUnsafe(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = '${dbName}' AND pid <> pg_backend_pid()
      `);

      // Drop the database
      await adminClient.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${dbName}"`);
    } catch (error) {
      if (error instanceof Error) {
        console.warn(`Warning: Failed to drop database ${dbName}: ${error.message}`);
      }
      console.warn(`Warning: Failed to drop database ${dbName}: ${String(error)}`);
    } finally {
      await adminClient.$disconnect();
    }
  }

  private async clearDatabaseData(client: PrismaClient): Promise<void> {
    // Delete in reverse order of dependencies to avoid foreign key constraints
    await client.message.deleteMany();
    await client.session.deleteMany();
    await client.discount.deleteMany();
    await client.timeSlot.deleteMany();
    await client.bookingType.deleteMany();
    await client.account.deleteMany();
  }

  private async insertSeedData(client: PrismaClient, seedData: any[]): Promise<void> {
    // Implementation depends on the structure of seedData
    // This is a placeholder for custom seed data insertion
    for (const data of seedData) {
      // Insert data based on type
      // This would need to be implemented based on specific requirements
    }
  }

  private async insertDefaultSeedData(client: PrismaClient): Promise<void> {
    // Create default test users
    const users = await Promise.all([
      client.account.create({
        data: {
          email: 'testuser1@example.com',
          name: 'Test User 1',
          passwordHash: '$2b$10$test.hash.for.user1',
          gender: 'male',
          age: 25,
          country: 'US',
          role: Role.USER,
        },
      }),
      client.account.create({
        data: {
          email: 'testuser2@example.com',
          name: 'Test User 2',
          passwordHash: '$2b$10$test.hash.for.user2',
          gender: 'female',
          age: 30,
          country: 'US',
          role: Role.USER,
        },
      }),
    ]);

    // Create default test coaches
    const coaches = await Promise.all([
      client.account.create({
        data: {
          email: 'testcoach1@example.com',
          name: 'Test Coach 1',
          passwordHash: '$2b$10$test.hash.for.coach1',
          bio: 'Experienced tennis coach with 10+ years',
          credentials: 'USPTA Certified',
          role: Role.COACH,
        },
      }),
      client.account.create({
        data: {
          email: 'testcoach2@example.com',
          name: 'Test Coach 2',
          passwordHash: '$2b$10$test.hash.for.coach2',
          bio: 'Professional tennis instructor',
          credentials: 'PTR Certified',
          role: Role.COACH,
        },
      }),
    ]);

    // Create default booking types
    await Promise.all([
      client.bookingType.create({
        data: {
          name: 'Individual Lesson',
          description: 'One-on-one tennis coaching session',
          basePrice: 75.0,
          coachId: coaches[0].id,
          isActive: true,
        },
      }),
      client.bookingType.create({
        data: {
          name: 'Group Lesson',
          description: 'Small group tennis coaching session',
          basePrice: 50.0,
          coachId: coaches[0].id,
          isActive: true,
        },
      }),
    ]);

    // Create default time slots
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    await Promise.all([
      client.timeSlot.create({
        data: {
          dateTime: tomorrow,
          durationMin: 60,
          isAvailable: true,
          coachId: coaches[0].id,
        },
      }),
      client.timeSlot.create({
        data: {
          dateTime: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000), // 2 hours later
          durationMin: 60,
          isAvailable: true,
          coachId: coaches[0].id,
        },
      }),
    ]);
  }
}

// Export singleton instance
export const testDatabaseManager = TestDatabaseManager.getInstance();
