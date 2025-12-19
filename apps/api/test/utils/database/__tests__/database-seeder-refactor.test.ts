/**
 * Test to verify DatabaseSeeder refactoring maintains backward compatibility
 */

import { PrismaClient } from '@prisma/client';

import { createDatabaseSeeder, DatabaseSeeder } from '../database-seeder';

describe('DatabaseSeeder Refactoring', () => {
  let mockClient: PrismaClient;
  let seeder: DatabaseSeeder;

  beforeEach(() => {
    // Create a mock PrismaClient
    mockClient = {
      account: {
        create: jest.fn(),
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      bookingType: {
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      timeSlot: {
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      session: {
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      discount: {
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      message: {
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      refreshToken: {
        deleteMany: jest.fn(),
      },
    } as unknown as PrismaClient;

    seeder = createDatabaseSeeder(mockClient);
  });

  it('should create DatabaseSeeder instance', () => {
    expect(seeder).toBeInstanceOf(DatabaseSeeder);
  });

  it('should have database property', () => {
    expect(seeder.database).toBeDefined();
  });

  it('should have all public methods', () => {
    expect(typeof seeder.seedAll).toBe('function');
    expect(typeof seeder.seedUsers).toBe('function');
    expect(typeof seeder.seedCoaches).toBe('function');
    expect(typeof seeder.seedBookingTypes).toBe('function');
    expect(typeof seeder.seedTimeSlots).toBe('function');
    expect(typeof seeder.seedDiscounts).toBe('function');
    expect(typeof seeder.seedSessions).toBe('function');
    expect(typeof seeder.seedMessages).toBe('function');
    expect(typeof seeder.clearAll).toBe('function');
    expect(typeof seeder.seedMinimal).toBe('function');
    expect(typeof seeder.seedComprehensive).toBe('function');
  });

  it('should maintain backward compatibility with factory function', () => {
    const seederFromFactory = createDatabaseSeeder(mockClient);
    expect(seederFromFactory).toBeInstanceOf(DatabaseSeeder);
  });
});
