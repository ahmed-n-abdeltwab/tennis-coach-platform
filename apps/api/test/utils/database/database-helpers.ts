/**
 * Database helper functions for testing
 *
 * Simple utility functions for common database operations in tests.
 * For more advanced database testing utilities, see:
 * - TestDatabaseManager for database lifecycle management
 * - DatabaseSeeder for consistent test data creation
 * - TransactionManager for transaction-based test isolation
 */

import { Account, BookingType, Prisma, Role } from '@prisma/client';

import { PrismaService } from '../../../src/app/prisma/prisma.service';
import {
  DATABASE_CONSTANTS,
  ERROR_MESSAGES,
  SEED_DATA_CONSTANTS,
} from '../constants/test-constants';
import { createDatabaseError } from '../errors/test-infrastructure-errors';

/**
 * Type representing the minimal Prisma client interface needed for database helpers
 * This allows for easier mocking in unit tests by accepting any object with string keys
 */
export type PrismaClient =
  | PrismaService
  | {
      [key: string]: any;
    };

/**
 * Cleans all data from the test database
 *
 * Deletes data in reverse order of dependencies to avoid foreign key constraints.
 *
 * @param prisma - PrismaService instance
 *
 * @example
 * ```typescript
 * beforeEach(async () => {
 *   await cleanDatabase(prisma);
 * });
 * ```
 */
export async function cleanDatabase(prisma: PrismaClient): Promise<void> {
  // Delete in reverse order of dependencies to avoid foreign key constraints
  await prisma.message.deleteMany();
  await prisma.session.deleteMany();
  await prisma.discount.deleteMany();
  await prisma.timeSlot.deleteMany();
  await prisma.bookingType.deleteMany();
  await prisma.account.deleteMany();
}

/**
 * Seeds the database with basic test data
 *
 * Creates a minimal set of test data including users, coaches, and booking types.
 * For more advanced seeding options, use DatabaseSeeder.
 *
 * @param prisma - PrismaService instance
 * @returns Object containing created test data
 *
 * @example
 * ```typescript
 * beforeEach(async () => {
 *   const { users, coaches, bookingTypes } = await seedTestDatabase(prisma);
 *   testUser = users[0];
 *   testCoach = coaches[0];
 * });
 * ```
 */
export async function seedTestDatabase(prisma: PrismaClient): Promise<{
  users: Account[];
  coaches: Account[];
  bookingTypes: BookingType[];
}> {
  try {
    // Create test users using seed data constants
    const users = await Promise.all(
      SEED_DATA_CONSTANTS.DEFAULT_USERS.map(userData =>
        prisma.account.create({
          data: {
            ...userData,
            role: Role.USER,
          },
        })
      )
    );

    // Create test coaches using seed data constants
    const coaches = await Promise.all(
      SEED_DATA_CONSTANTS.DEFAULT_COACHES.map(coachData =>
        prisma.account.create({
          data: {
            ...coachData,
            role: Role.COACH,
          },
        })
      )
    );

    // Ensure at least one coach exists before creating booking types
    if (coaches.length === 0) {
      throw createDatabaseError(
        'seed test database',
        'No coaches were created. Cannot create booking types without a coach.',
        {
          operation: 'seedTestDatabase',
          coachesCount: coaches.length,
        }
      );
    }

    // Extract the first coach for booking types (safe because we checked length above)
    const firstCoach = coaches[0] as Account;

    // Verify the coach exists in the database before creating booking types
    const verifyCoach = await prisma.account.findUnique({
      where: { id: firstCoach.id },
    });

    if (!verifyCoach) {
      throw createDatabaseError(
        'seed test database',
        `Coach with id ${firstCoach.id} was not found in database after creation`,
        {
          operation: 'seedTestDatabase',
          coachId: firstCoach.id,
        }
      );
    }

    // Create test booking types using seed data constants sequentially to avoid race conditions
    const bookingTypes: BookingType[] = [];
    for (const bookingTypeData of SEED_DATA_CONSTANTS.DEFAULT_BOOKING_TYPES) {
      const bookingType = await prisma.bookingType.create({
        data: {
          ...bookingTypeData,
          coachId: firstCoach.id,
          isActive: true,
        },
      });
      bookingTypes.push(bookingType);
    }

    return { users, coaches, bookingTypes };
  } catch (error) {
    throw createDatabaseError(
      'seed test database',
      error instanceof Error ? error.message : String(error),
      {
        operation: 'seedTestDatabase',
        errorType: error instanceof Error ? error.constructor.name : typeof error,
      },
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Creates a test database transaction
 *
 * Wraps a callback in a Prisma transaction for test isolation.
 * For more advanced transaction management, use TransactionManager.
 *
 * @param prisma - PrismaService instance
 * @param callback - Function to execute within the transaction
 * @returns Result of the callback
 *
 * @example
 * ```typescript
 * const result = await withTransaction(prisma, async (tx) => {
 *   const user = await tx.account.create({ data: { ... } });
 *   const session = await tx.session.create({ data: { ... } });
 *   return { user, session };
 * });
 * ```
 */
export async function withTransaction<T>(
  prisma: PrismaClient,
  callback: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(callback);
}

/**
 * Cleans a specific table in the database
 *
 * @param prisma - PrismaService instance
 * @param tableName - Name of the table to clean
 *
 * @example
 * ```typescript
 * await cleanTable(prisma, 'session');
 * ```
 */
export async function cleanTable(prisma: PrismaClient, tableName: string): Promise<void> {
  if (prisma[tableName]) {
    try {
      await prisma[tableName].deleteMany();
    } catch (error) {
      throw createDatabaseError(
        'clean table',
        error instanceof Error ? error.message : String(error),
        {
          tableName,
          operation: 'deleteMany',
        },
        error instanceof Error ? error : undefined
      );
    }
  } else {
    throw createDatabaseError('clean table', 'Table not found in Prisma schema', {
      tableName,
      availableTables: Object.keys(prisma).filter(key => typeof prisma[key] === 'object'),
    });
  }
}

/**
 * Counts records in a specific table
 *
 * @param prisma - PrismaService instance
 * @param tableName - Name of the table
 * @param where - Optional filter conditions
 * @returns Number of records
 *
 * @example
 * ```typescript
 * const userCount = await countRecords(prisma, 'account', { role: 'USER' });
 * ```
 */
export async function countRecords(
  prisma: PrismaClient,
  tableName: string,
  where: any = {}
): Promise<number> {
  if (prisma[tableName]) {
    try {
      return await prisma[tableName].count({ where });
    } catch (error) {
      throw createDatabaseError(
        'count records',
        error instanceof Error ? error.message : String(error),
        {
          tableName,
          whereConditions: where,
          operation: 'count',
        },
        error instanceof Error ? error : undefined
      );
    }
  }
  throw createDatabaseError('count records', ERROR_MESSAGES.TABLE_NOT_FOUND, {
    tableName,
  });
}

/**
 * Finds a single record in the database
 *
 * @param prisma - PrismaService instance
 * @param tableName - Name of the table
 * @param where - Filter conditions
 * @returns Found record or null
 *
 * @example
 * ```typescript
 * const user = await findRecord(prisma, 'account', { email: 'test@example.com' });
 * ```
 */
export async function findRecord(
  prisma: PrismaClient,
  tableName: string,
  where: any
): Promise<any> {
  if (prisma[tableName]) {
    try {
      return await prisma[tableName].findFirst({ where });
    } catch (error) {
      throw createDatabaseError(
        'find record',
        error instanceof Error ? error.message : String(error),
        {
          tableName,
          whereConditions: where,
          operation: 'findFirst',
        },
        error instanceof Error ? error : undefined
      );
    }
  }
  throw createDatabaseError('find record', ERROR_MESSAGES.TABLE_NOT_FOUND, {
    tableName,
  });
}

/**
 * Finds multiple records in the database
 *
 * @param prisma - PrismaService instance
 * @param tableName - Name of the table
 * @param where - Optional filter conditions
 * @returns Array of found records
 *
 * @example
 * ```typescript
 * const users = await findRecords(prisma, 'account', { role: 'USER' });
 * ```
 */
export async function findRecords(
  prisma: PrismaClient,
  tableName: string,
  where: any = {}
): Promise<any[]> {
  if (prisma[tableName]) {
    try {
      return await prisma[tableName].findMany({ where });
    } catch (error) {
      throw createDatabaseError(
        'find records',
        error instanceof Error ? error.message : String(error),
        {
          tableName,
          whereConditions: where,
          operation: 'findMany',
        },
        error instanceof Error ? error : undefined
      );
    }
  }
  throw createDatabaseError('find records', ERROR_MESSAGES.TABLE_NOT_FOUND, {
    tableName,
  });
}

/**
 * Creates a record in the database
 *
 * @param prisma - PrismaService instance
 * @param tableName - Name of the table
 * @param data - Data to create
 * @returns Created record
 *
 * @example
 * ```typescript
 * const user = await createRecord(prisma, 'account', {
 *   email: 'test@example.com',
 *   name: 'Test User',
 *   passwordHash: 'hash',
 *   role: 'USER'
 * });
 * ```
 */
export async function createRecord(
  prisma: PrismaClient,
  tableName: string,
  data: any
): Promise<any> {
  if (prisma[tableName]) {
    try {
      return await prisma[tableName].create({ data });
    } catch (error) {
      throw createDatabaseError(
        'create record',
        error instanceof Error ? error.message : String(error),
        {
          tableName,
          operation: 'create',
          dataKeys: Object.keys(data),
        },
        error instanceof Error ? error : undefined
      );
    }
  }
  throw createDatabaseError('create record', ERROR_MESSAGES.TABLE_NOT_FOUND, {
    tableName,
  });
}

/**
 * Updates a record in the database
 *
 * @param prisma - PrismaService instance
 * @param tableName - Name of the table
 * @param where - Filter to find the record
 * @param data - Data to update
 * @returns Updated record
 *
 * @example
 * ```typescript
 * const user = await updateRecord(prisma, 'account',
 *   { id: userId },
 *   { name: 'Updated Name' }
 * );
 * ```
 */
export async function updateRecord(
  prisma: PrismaClient,
  tableName: string,
  where: any,
  data: any
): Promise<any> {
  if (prisma[tableName]) {
    try {
      return await prisma[tableName].update({ where, data });
    } catch (error) {
      throw createDatabaseError(
        'update record',
        error instanceof Error ? error.message : String(error),
        {
          tableName,
          whereConditions: where,
          dataKeys: Object.keys(data),
          operation: 'update',
        },
        error instanceof Error ? error : undefined
      );
    }
  }
  throw createDatabaseError('update record', ERROR_MESSAGES.TABLE_NOT_FOUND, {
    tableName,
  });
}

/**
 * Deletes a record from the database
 *
 * @param prisma - PrismaService instance
 * @param tableName - Name of the table
 * @param where - Filter to find the record
 * @returns Deleted record
 *
 * @example
 * ```typescript
 * await deleteRecord(prisma, 'account', { id: userId });
 * ```
 */
export async function deleteRecord(
  prisma: PrismaClient,
  tableName: string,
  where: any
): Promise<any> {
  if (prisma[tableName]) {
    try {
      return await prisma[tableName].delete({ where });
    } catch (error) {
      throw createDatabaseError(
        'delete record',
        error instanceof Error ? error.message : String(error),
        {
          tableName,
          whereConditions: where,
          operation: 'delete',
        },
        error instanceof Error ? error : undefined
      );
    }
  }
  throw createDatabaseError('delete record', ERROR_MESSAGES.TABLE_NOT_FOUND, {
    tableName,
  });
}

/**
 * Deletes multiple records from the database
 *
 * @param prisma - PrismaService instance
 * @param tableName - Name of the table
 * @param where - Optional filter conditions
 * @returns Count of deleted records
 *
 * @example
 * ```typescript
 * await deleteRecords(prisma, 'session', { status: 'CANCELLED' });
 * ```
 */
export async function deleteRecords(
  prisma: PrismaClient,
  tableName: string,
  where: any = {}
): Promise<any> {
  if (prisma[tableName]) {
    try {
      return await prisma[tableName].deleteMany({ where });
    } catch (error) {
      throw createDatabaseError(
        'delete records',
        error instanceof Error ? error.message : String(error),
        {
          tableName,
          whereConditions: where,
          operation: 'deleteMany',
        },
        error instanceof Error ? error : undefined
      );
    }
  }
  throw createDatabaseError('delete records', ERROR_MESSAGES.TABLE_NOT_FOUND, {
    tableName,
  });
}

/**
 * Checks if a record exists in the database
 *
 * @param prisma - PrismaService instance
 * @param tableName - Name of the table
 * @param where - Filter conditions
 * @returns True if record exists, false otherwise
 *
 * @example
 * ```typescript
 * const exists = await recordExists(prisma, 'account', { email: 'test@example.com' });
 * ```
 */
export async function recordExists(
  prisma: PrismaClient,
  tableName: string,
  where: any
): Promise<boolean> {
  const record = await findRecord(prisma, tableName, where);
  return record !== null;
}

/**
 * Waits for a record to exist in the database
 *
 * Polls the database until the record exists or timeout is reached.
 *
 * @param prisma - PrismaService instance
 * @param tableName - Name of the table
 * @param where - Filter conditions
 * @param timeout - Maximum time to wait in milliseconds
 * @param interval - Polling interval in milliseconds
 * @returns Found record
 * @throws Error if timeout is reached
 *
 * @example
 * ```typescript
 * const user = await waitForRecord(prisma, 'account', { email: 'test@example.com' }, 5000);
 * ```
 */
export async function waitForRecord(
  prisma: PrismaClient,
  tableName: string,
  where: any,
  timeout: number = DATABASE_CONSTANTS.WAIT_FOR_RECORD_TIMEOUT_MS,
  interval: number = DATABASE_CONSTANTS.WAIT_FOR_RECORD_INTERVAL_MS
): Promise<any> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const record = await findRecord(prisma, tableName, where);
    if (record) {
      return record;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw createDatabaseError('wait for record', ERROR_MESSAGES.RECORD_NOT_FOUND_TIMEOUT, {
    tableName,
    whereConditions: where,
    timeout,
    interval,
    elapsedTime: Date.now() - startTime,
  });
}

/**
 * Executes raw SQL query
 *
 * @param prisma - PrismaService instance
 * @param query - SQL query string
 * @param params - Query parameters
 * @returns Query result
 *
 * @example
 * ```typescript
 * const result = await executeRawQuery(prisma, 'SELECT * FROM account WHERE role = $1', ['USER']);
 * ```
 */
export async function executeRawQuery(
  prisma: PrismaClient,
  query: string,
  ...params: any[]
): Promise<any> {
  return prisma.$queryRawUnsafe(query, ...params);
}

/**
 * Resets database sequences (useful for PostgreSQL)
 *
 * @param prisma - PrismaService instance
 *
 * @example
 * ```typescript
 * await resetSequences(prisma);
 * ```
 */
export async function resetSequences(prisma: PrismaClient): Promise<void> {
  // This is PostgreSQL specific
  try {
    await prisma.$executeRawUnsafe(`
      DO $$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'ALTER SEQUENCE IF EXISTS ' || quote_ident(r.tablename) || '_id_seq RESTART WITH 1';
        END LOOP;
      END $$;
    `);
  } catch {
    // Ignore errors if not using PostgreSQL or sequences don't exist
  }
}
