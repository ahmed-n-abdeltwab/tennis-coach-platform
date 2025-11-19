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
export async function cleanDatabase(prisma: PrismaService): Promise<void> {
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
export async function seedTestDatabase(prisma: PrismaService): Promise<{
  users: Account[];
  coaches: Account[];
  bookingTypes: BookingType[];
}> {
  // Create test users
  const users = await Promise.all([
    prisma.account.create({
      data: {
        email: 'user1@test.com',
        name: 'Test User 1',
        passwordHash: '$2b$10$test.hash.for.user1',
        role: Role.USER,
      },
    }),
    prisma.account.create({
      data: {
        email: 'user2@test.com',
        name: 'Test User 2',
        passwordHash: '$2b$10$test.hash.for.user2',
        role: Role.USER,
      },
    }),
  ]);

  // Create test coaches
  const coaches = await Promise.all([
    prisma.account.create({
      data: {
        email: 'testcoach1@test.com',
        name: 'Test Coach 1',
        passwordHash: '$2b$10$test.hash.for.coach1',
        bio: 'Experienced tennis coach',
        role: Role.COACH,
      },
    }),
  ]);

  // Create test booking types
  const bookingTypes = await Promise.all([
    prisma.bookingType.create({
      data: {
        name: 'Individual Lesson',
        description: 'One-on-one tennis lesson',
        basePrice: 75.0,
        coachId: coaches[0].id,
        isActive: true,
      },
    }),
    prisma.bookingType.create({
      data: {
        name: 'Group Lesson',
        description: 'Group tennis lesson',
        basePrice: 50.0,
        coachId: coaches[0].id,
        isActive: true,
      },
    }),
  ]);

  return { users, coaches, bookingTypes };
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
  prisma: PrismaService,
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
export async function cleanTable(prisma: PrismaService, tableName: string): Promise<void> {
  if (prisma[tableName]) {
    await prisma[tableName].deleteMany();
  } else {
    throw new Error(`Table ${tableName} not found in Prisma schema`);
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
  prisma: PrismaService,
  tableName: string,
  where: any = {}
): Promise<number> {
  if (prisma[tableName]) {
    return prisma[tableName].count({ where });
  }
  throw new Error(`Table ${tableName} not found in Prisma schema`);
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
  prisma: PrismaService,
  tableName: string,
  where: any
): Promise<any> {
  if (prisma[tableName]) {
    return prisma[tableName].findFirst({ where });
  }
  throw new Error(`Table ${tableName} not found in Prisma schema`);
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
  prisma: PrismaService,
  tableName: string,
  where: any = {}
): Promise<any[]> {
  if (prisma[tableName]) {
    return prisma[tableName].findMany({ where });
  }
  throw new Error(`Table ${tableName} not found in Prisma schema`);
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
  prisma: PrismaService,
  tableName: string,
  data: any
): Promise<any> {
  if (prisma[tableName]) {
    return prisma[tableName].create({ data });
  }
  throw new Error(`Table ${tableName} not found in Prisma schema`);
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
  prisma: PrismaService,
  tableName: string,
  where: any,
  data: any
): Promise<any> {
  if (prisma[tableName]) {
    return prisma[tableName].update({ where, data });
  }
  throw new Error(`Table ${tableName} not found in Prisma schema`);
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
  prisma: PrismaService,
  tableName: string,
  where: any
): Promise<any> {
  if (prisma[tableName]) {
    return prisma[tableName].delete({ where });
  }
  throw new Error(`Table ${tableName} not found in Prisma schema`);
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
  prisma: PrismaService,
  tableName: string,
  where: any = {}
): Promise<any> {
  if (prisma[tableName]) {
    return prisma[tableName].deleteMany({ where });
  }
  throw new Error(`Table ${tableName} not found in Prisma schema`);
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
  prisma: PrismaService,
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
  prisma: PrismaService,
  tableName: string,
  where: any,
  timeout = 5000,
  interval = 100
): Promise<any> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const record = await findRecord(prisma, tableName, where);
    if (record) {
      return record;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Record not found in ${tableName} within ${timeout}ms`);
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
  prisma: PrismaService,
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
export async function resetSequences(prisma: PrismaService): Promise<void> {
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
  } catch  {
    // Ignore errors if not using PostgreSQL or sequences don't exist
  }
}
