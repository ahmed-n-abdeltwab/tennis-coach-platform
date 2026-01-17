/**
 * TestDatabaseManager - Singleton pattern for managing test databases
 *
 * This class provides centralized database management for tests including:
 * - Creating isolated test databases for different test types
 * - Managing database lifecycle (setup, cleanup, teardown)
 * - Transaction rollback mechanisms for integration tests
 * - Database migration management for tests
 */

import { execSync } from 'child_process';
import { randomUUID } from 'crypto';

import { Account, Prisma, PrismaClient } from '@prisma/client';

import { accountFactory, bookingTypeFactory, timeSlotFactory } from '../../utils';
import {
  DATABASE_CONSTANTS,
  ERROR_MESSAGES,
  SECURITY_CONSTANTS,
  TEST_ENV_CONSTANTS,
} from '../../utils/constants/test-constants';
import { createDatabaseError } from '../errors/test-infrastructure-errors';
import {
  generateUniqueId,
  getFutureDate,
  sanitizeForDatabaseName,
  truncateString,
} from '../helpers/common-helpers';

import { batchCleanupManager } from './batch-cleanup-manager';
import { connectionPoolManager } from './connection-pool-manager';

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
  private activeTransactions: Map<string, ActiveTransaction> = new Map();
  private baseUrl: string;
  private isInitialized = false;

  private constructor() {
    this.baseUrl = this.extractBaseUrl(process.env.DATABASE_URL ?? '');
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
    if (process.env.NODE_ENV !== TEST_ENV_CONSTANTS.REQUIRED_ENV) {
      throw createDatabaseError('initialize', ERROR_MESSAGES.INVALID_ENVIRONMENT, {
        currentEnvironment: process.env.NODE_ENV ?? 'undefined',
        expectedEnvironment: TEST_ENV_CONSTANTS.REQUIRED_ENV,
      });
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

      // Get or create Prisma client from connection pool
      const client = await connectionPoolManager.getConnection(dbUrl);

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
      throw createDatabaseError(
        'create test database',
        error instanceof Error ? error.message : String(error),
        {
          testSuite,
          databaseName: dbName,
          databaseUrl: dbUrl,
          configType: config.type,
          isolationLevel: config.isolationLevel,
        },
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get existing test database connection
   */
  public getTestDatabase(testSuite: string): DatabaseConnection | undefined {
    return this.testDatabases.get(testSuite);
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Clean up a specific test database
   */
  public async cleanupTestDatabase(testSuite: string): Promise<void> {
    const connection = this.testDatabases.get(testSuite);
    if (!connection) {
      return;
    }

    // Remove from tracking first to prevent double cleanup
    this.testDatabases.delete(testSuite);

    try {
      // Clear active transaction references without trying to rollback
      // (database will be dropped anyway)
      const transactionKeys = Array.from(this.activeTransactions.keys()).filter(key =>
        key.startsWith(`${testSuite}:`)
      );
      for (const key of transactionKeys) {
        this.activeTransactions.delete(key);
      }

      // Release connection back to pool
      connectionPoolManager.releaseConnection(connection.url);

      // Drop the database
      await this.dropDatabase(connection.name);

      // Remove connection from pool
      await connectionPoolManager.removeConnection(connection.url);
    } catch (error) {
      const dbError = createDatabaseError(
        'cleanup test database',
        error instanceof Error ? error.message : String(error),
        {
          testSuite,
          databaseName: connection.name,
          databaseUrl: connection.url,
        },
        error instanceof Error ? error : undefined
      );
      console.warn(dbError.toLogFormat());
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
  public async seedDatabase(testSuite: string, seedData?: SeedDataItem[]): Promise<void> {
    const connection = this.testDatabases.get(testSuite);
    if (!connection) {
      throw createDatabaseError('seed database', ERROR_MESSAGES.NO_DATABASE_CONNECTION, {
        testSuite,
        availableDatabases: Array.from(this.testDatabases.keys()),
      });
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
      throw createDatabaseError(
        'seed database',
        error instanceof Error ? error.message : String(error),
        {
          testSuite,
          databaseName: connection.name,
          seedDataProvided: !!seedData,
          seedDataCount: seedData?.length ?? 0,
        },
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Start a transaction for integration tests
   */
  public async startTransaction(testSuite: string): Promise<string> {
    const connection = this.testDatabases.get(testSuite);
    if (!connection) {
      throw createDatabaseError('start transaction', ERROR_MESSAGES.NO_DATABASE_CONNECTION, {
        testSuite,
        availableDatabases: Array.from(this.testDatabases.keys()),
      });
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
      const dbError = createDatabaseError(
        'rollback transaction',
        error instanceof Error ? error.message : String(error),
        {
          testSuite,
          transactionId,
          transactionKey,
        },
        error instanceof Error ? error : undefined
      );
      console.warn(dbError.toLogFormat());
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
      throw createDatabaseError('execute transaction', ERROR_MESSAGES.NO_DATABASE_CONNECTION, {
        testSuite,
        availableDatabases: Array.from(this.testDatabases.keys()),
      });
    }

    try {
      return await connection.client.$transaction(callback);
    } catch (error) {
      throw createDatabaseError(
        'execute transaction',
        error instanceof Error ? error.message : String(error),
        {
          testSuite,
          databaseName: connection.name,
        },
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Run database migrations on a test database
   */
  public async runMigrations(databaseUrl: string): Promise<void> {
    const originalUrl = process.env.DATABASE_URL;
    try {
      // Set the database URL for migration
      process.env.DATABASE_URL = databaseUrl;

      // Run Prisma migrations with timeout and explicit schema and config paths
      execSync(
        `npx prisma migrate deploy --schema=${DATABASE_CONSTANTS.SCHEMA_PATH} --config=./apps/api/prisma/prisma.config.ts`,
        {
          cwd: process.cwd(),
          stdio: 'pipe',
          env: { ...process.env, DATABASE_URL: databaseUrl },
          timeout: DATABASE_CONSTANTS.MIGRATION_TIMEOUT_MS,
        }
      );

      // Restore original URL
      if (originalUrl) {
        process.env.DATABASE_URL = originalUrl;
      }
    } catch (error) {
      // Restore original URL even on error
      if (originalUrl) {
        process.env.DATABASE_URL = originalUrl;
      }

      throw createDatabaseError(
        'run migrations',
        error instanceof Error ? error.message : String(error),
        {
          databaseUrl,
          schemaPath: DATABASE_CONSTANTS.SCHEMA_PATH,
          timeout: DATABASE_CONSTANTS.MIGRATION_TIMEOUT_MS,
        },
        error instanceof Error ? error : undefined
      );
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
      throw createDatabaseError(
        'generate Prisma client',
        error instanceof Error ? error.message : String(error),
        {
          databaseUrl,
          workingDirectory: process.cwd(),
        },
        error instanceof Error ? error : undefined
      );
    }
  }

  // Private helper methods

  extractBaseUrl(fullUrl: string): string {
    // Validate input
    if (!fullUrl || typeof fullUrl !== 'string' || fullUrl.trim() === '') {
      throw createDatabaseError('parse database URL', ERROR_MESSAGES.INVALID_DATABASE_URL, {
        providedUrl: truncateString(fullUrl, SECURITY_CONSTANTS.URL_TRUNCATE_LENGTH),
      });
    }

    try {
      const url = new URL(fullUrl);

      // Additional validation for database URLs
      if (!url.protocol || !url.host) {
        throw new Error('Missing protocol or host');
      }

      return `${url.protocol}//${url.username}:${url.password}@${url.host}`;
    } catch (error) {
      throw createDatabaseError(
        'parse database URL',
        ERROR_MESSAGES.INVALID_DATABASE_URL,
        {
          providedUrl: truncateString(fullUrl, SECURITY_CONSTANTS.URL_TRUNCATE_LENGTH),
        },
        error instanceof Error ? error : undefined
      );
    }
  }

  generateTestDatabaseName(testSuite: string, type: string): string {
    const sanitizedSuite = sanitizeForDatabaseName(testSuite);
    return `test_${type}_${sanitizedSuite}_${generateUniqueId('')}`.replace(/__/g, '_');
  }

  buildDatabaseUrl(dbName: string): string {
    return `${this.baseUrl}/${dbName}`;
  }

  async createDatabase(dbName: string): Promise<void> {
    const adminUrl = `${this.baseUrl}/${DATABASE_CONSTANTS.ADMIN_DATABASE}?connect_timeout=${DATABASE_CONSTANTS.CONNECTION_TIMEOUT_MS / 1000}`;

    // Prisma 7 requires adapter pattern
    const { Pool } = await import('pg');
    const { PrismaPg } = await import('@prisma/adapter-pg');
    const pool = new Pool({ connectionString: adminUrl });
    const adapter = new PrismaPg(pool);

    const adminClient = new PrismaClient({
      adapter,
    });

    try {
      // Add timeout to connection attempt
      const connectPromise = adminClient.$connect();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              createDatabaseError(
                'connect to admin database',
                `${ERROR_MESSAGES.CONNECTION_TIMEOUT} after ${DATABASE_CONSTANTS.CONNECTION_TIMEOUT_MS / 1000}s`,
                {
                  adminUrl,
                  databaseName: dbName,
                  timeout: DATABASE_CONSTANTS.CONNECTION_TIMEOUT_MS,
                }
              )
            ),
          DATABASE_CONSTANTS.CONNECTION_TIMEOUT_MS
        )
      );

      await Promise.race([connectPromise, timeoutPromise]);
      await adminClient.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
    } catch (error) {
      if (error instanceof Error && !error.message.includes('already exists')) {
        throw createDatabaseError(
          'create database',
          error.message,
          {
            databaseName: dbName,
            adminUrl,
          },
          error
        );
      }
    } finally {
      await adminClient.$disconnect();
      await pool.end();
    }
  }

  private async dropDatabase(dbName: string): Promise<void> {
    const adminUrl = `${this.baseUrl}/${DATABASE_CONSTANTS.ADMIN_DATABASE}`;

    // Prisma 7 requires adapter pattern
    const { Pool } = await import('pg');
    const { PrismaPg } = await import('@prisma/adapter-pg');
    const pool = new Pool({ connectionString: adminUrl });
    const adapter = new PrismaPg(pool);

    const adminClient = new PrismaClient({
      adapter,
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
      const dbError = createDatabaseError(
        'drop database',
        error instanceof Error ? error.message : String(error),
        {
          databaseName: dbName,
          adminUrl,
        },
        error instanceof Error ? error : undefined
      );
      console.warn(dbError.toLogFormat());
    } finally {
      await adminClient.$disconnect();
      await pool.end();
    }
  }

  private async clearDatabaseData(client: PrismaClient): Promise<void> {
    // Use optimized batch cleanup
    await batchCleanupManager.cleanDatabase(client, { parallel: true });
  }

  private async insertSeedData(_client: PrismaClient, _seedData: SeedDataItem[]): Promise<void> {
    // Placeholder for custom seed data insertion
  }

  private async insertDefaultSeedData(client: PrismaClient): Promise<void> {
    // Create test users using factory
    const users: Account[] = [];
    for (let i = 0; i < 2; i++) {
      const mockUser = accountFactory.createUserWithNulls();
      const user = await client.account.create({
        data: mockUser,
      });
      users.push(user);
    }

    // Create test coaches using factory
    const coaches: Account[] = [];
    for (let i = 0; i < 2; i++) {
      const mockCoach = accountFactory.createCoachWithNulls();
      const coach = await client.account.create({
        data: mockCoach,
      });
      coaches.push(coach);
    }

    // Create booking types and time slots for first coach
    const firstCoach = coaches[0];
    if (firstCoach) {
      // Create booking types using factory
      for (let i = 0; i < 2; i++) {
        const mockBookingType = bookingTypeFactory.create();
        await client.bookingType.create({
          data: {
            name: mockBookingType.name,
            description: mockBookingType.description,
            basePrice: mockBookingType.basePrice,
            coachId: firstCoach.id,
            isActive: true,
          },
        });
      }

      // Create time slots using factory
      for (let i = 0; i < 2; i++) {
        const mockTimeSlot = timeSlotFactory.create();
        await client.timeSlot.create({
          data: {
            dateTime: getFutureDate(24 + i * 24), // 24h and 48h in future
            durationMin: mockTimeSlot.durationMin,
            isAvailable: true,
            coachId: firstCoach.id,
          },
        });
      }
    }
  }
}

// Internal types
interface ActiveTransaction {
  testSuite: string;
  transactionId: string;
  client: PrismaClient;
}

interface SeedDataItem {
  type: string;
  data: Record<string, unknown>;
}

// Export singleton instance
export const testDatabaseManager = TestDatabaseManager.getInstance();
