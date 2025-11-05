/**
 * Database helper functions for testing
 */

import { BookingType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Cleans all data from the test database
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
 */
export async function withTransaction<T>(
  prisma: PrismaService,
  callback: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(callback);
}
