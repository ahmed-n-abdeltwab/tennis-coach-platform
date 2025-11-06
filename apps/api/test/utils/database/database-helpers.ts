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
