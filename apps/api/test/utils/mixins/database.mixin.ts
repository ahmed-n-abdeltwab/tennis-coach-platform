/**
 * Database Mixin
 * Provides reusable database operations and test data factories
 * Eliminates duplication of database setup/clean
 */

import {
  Account,
  BookingType,
  Discount,
  Message,
  Prisma,
  Role,
  Session,
  TimeSlot,
} from '@prisma/client';

import { PrismaService } from '../../../src/app/prisma/prisma.service';
import { batchCleanupManager } from '../../infrastructure/database/batch-cleanup-manager';
import { createDatabaseError } from '../../infrastructure/errors/test-infrastructure-errors';
import {
  generateUniqueEmail,
  getFutureDate,
  getFutureDateByDays,
} from '../../infrastructure/helpers/common-helpers';
import { testEntityCache } from '../cache/test-entity-cache';
import {
  DEFAULT_TEST_BOOKING_TYPE,
  DEFAULT_TEST_COACH,
  DEFAULT_TEST_DISCOUNT,
  DEFAULT_TEST_MESSAGE,
  DEFAULT_TEST_SESSION,
  DEFAULT_TEST_TIME_SLOT,
  DEFAULT_TEST_USER,
  SEED_DATA_CONSTANTS,
} from '../constants/test-constants';

/**
 * Interface for classes that can use database operations
 */
export interface DatabaseCapable {
  readonly database: PrismaService;
}

/**
 * Database Mixin
 * Handles all database operations, cleanup, and test data creation
 */
export class DatabaseMixin {
  private cachedCoach?: Account;
  private cachedUser?: Account;
  public testData: any;

  constructor(private readonly host: DatabaseCapable) {}

  // ============================================================================
  // Setup & Cleanup
  // ============================================================================

  async setupDatabase(): Promise<void> {
    await this.cleanupDatabase();
    await this.seedTestData();
  }

  async cleanupDatabase(): Promise<void> {
    try {
      await batchCleanupManager.cleanDatabase(this.host.database, { parallel: false });
    } catch (error) {
      if (error instanceof Error && !error.message.includes('pool after calling end')) {
        throw error;
      }
    }

    this.cachedCoach = undefined;
    this.cachedUser = undefined;
    testEntityCache.clear();
  }

  /**
   * Seeds the database with basic test data
   *
   * Creates a minimal set of test data including users, coaches, and booking types.
   */
  async seedTestData(): Promise<void> {
    try {
      // Verify database connection first
      try {
        await this.host.database.$queryRaw`SELECT 1`;
      } catch (connectionError) {
        throw createDatabaseError(
          'seed test database',
          'Database connection failed. Ensure the test database exists and is migrated.',
          {
            operation: 'verifyConnection',
            error:
              connectionError instanceof Error ? connectionError.message : String(connectionError),
          },
          connectionError instanceof Error ? connectionError : undefined
        );
      }

      // Create test users using seed data constants
      const usersData = SEED_DATA_CONSTANTS.DEFAULT_USERS;
      const users: Account[] = [];
      for (const userData of usersData) {
        try {
          const user = await this.host.database.account.create({
            data: {
              ...userData,
              role: Role.USER,
            },
          });
          users.push(user);
        } catch (userError) {
          // Log but continue - user might already exist
          console.warn(`Failed to create user ${userData.email}:`, userError);
        }
      }

      // Create test coaches using seed data constants
      const coachesData = SEED_DATA_CONSTANTS.DEFAULT_COACHES;
      const coaches: Account[] = [];
      for (const coachData of coachesData) {
        try {
          const coach = await this.host.database.account.create({
            data: {
              ...coachData,
              role: Role.COACH,
            },
          });
          coaches.push(coach);
        } catch (coachError) {
          // Log but continue - coach might already exist
          console.warn(`Failed to create coach ${coachData.email}:`, coachError);
        }
      }

      // If no coaches were created, try to find existing ones
      if (coaches.length === 0) {
        const existingCoaches = await this.host.database.account.findMany({
          where: { role: Role.COACH },
          take: 1,
        });
        if (existingCoaches.length > 0) {
          coaches.push(...existingCoaches);
        }
      }

      // Ensure at least one coach exists before creating booking types
      if (coaches.length === 0) {
        throw createDatabaseError(
          'seed test database',
          `No coaches were created or found. Coaches data count: ${coachesData.length}`,
          {
            operation: 'seedTestDatabase',
            coachesDataCount: coachesData.length,
          }
        );
      }

      // Extract the first coach for booking types
      const firstCoach = coaches[0];
      if (!firstCoach?.id) {
        throw createDatabaseError('seed test database', 'First coach is undefined or has no id', {
          operation: 'seedTestDatabase',
          firstCoach: firstCoach ? JSON.stringify(firstCoach) : 'undefined',
          coachesLength: coaches.length,
        });
      }

      // Create test booking types using seed data constants sequentially to avoid race conditions
      const bookingTypes: BookingType[] = [];
      for (const bookingTypeData of SEED_DATA_CONSTANTS.DEFAULT_BOOKING_TYPES) {
        try {
          const bookingType = await this.host.database.bookingType.create({
            data: {
              ...bookingTypeData,
              coachId: firstCoach.id,
              isActive: true,
            },
          });
          bookingTypes.push(bookingType);
        } catch (bookingTypeError) {
          // Log but continue
          console.warn(`Failed to create booking type ${bookingTypeData.name}:`, bookingTypeError);
        }
      }

      this.testData = { users, coaches, bookingTypes };
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

  // ============================================================================
  // Cached Test Users
  // ============================================================================

  async getCachedCoach(): Promise<Account> {
    if (this.cachedCoach) {
      return this.cachedCoach;
    }

    const cachedCoach = testEntityCache.getCoachByEmail(DEFAULT_TEST_COACH.NAME);
    if (cachedCoach) {
      this.cachedCoach = cachedCoach;
      return cachedCoach;
    }

    this.cachedCoach = await this.createTestCoach();
    testEntityCache.cacheCoach(this.cachedCoach);
    return this.cachedCoach;
  }

  async getCachedUser(): Promise<Account> {
    if (this.cachedUser) {
      return this.cachedUser;
    }

    const cachedUser = testEntityCache.getUserByEmail(DEFAULT_TEST_USER.EMAIL);
    if (cachedUser) {
      this.cachedUser = cachedUser;
      return cachedUser;
    }

    this.cachedUser = await this.createTestUser();
    testEntityCache.cacheUser(this.cachedUser);
    return this.cachedUser;
  }

  // ============================================================================
  // Test Data Factories
  // ============================================================================

  async createTestUser(overrides: Partial<Account> = {}): Promise<Account> {
    const userData = {
      email: generateUniqueEmail('test-user'),
      name: DEFAULT_TEST_USER.NAME,
      passwordHash: DEFAULT_TEST_USER.PASSWORD_HASH,
      role: Role.USER,
      gender: DEFAULT_TEST_USER.GENDER,
      age: DEFAULT_TEST_USER.AGE,
      height: DEFAULT_TEST_USER.HEIGHT,
      weight: DEFAULT_TEST_USER.WEIGHT,
      country: DEFAULT_TEST_USER.COUNTRY,
      address: DEFAULT_TEST_USER.ADDRESS,
      isActive: true,
      isOnline: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };

    return this.host.database.account.create({ data: userData });
  }

  async createTestCoach(overrides: Partial<Account> = {}): Promise<Account> {
    const coachData = {
      email: generateUniqueEmail('test-coach'),
      name: DEFAULT_TEST_COACH.NAME,
      bio: DEFAULT_TEST_COACH.BIO,
      passwordHash: DEFAULT_TEST_USER.PASSWORD_HASH,
      role: Role.COACH,
      credentials: DEFAULT_TEST_COACH.CREDENTIALS,
      philosophy: DEFAULT_TEST_COACH.PHILOSOPHY,
      profileImage: DEFAULT_TEST_COACH.PROFILE_IMAGE,
      isActive: true,
      isOnline: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };

    return this.host.database.account.create({ data: coachData });
  }

  async createTestBookingType(overrides: Partial<BookingType> = {}): Promise<BookingType> {
    const coachId = overrides.coachId ?? (await this.getCachedCoach()).id;

    const bookingTypeData = {
      coachId,
      name: DEFAULT_TEST_BOOKING_TYPE.NAME,
      description: DEFAULT_TEST_BOOKING_TYPE.DESCRIPTION,
      basePrice: DEFAULT_TEST_BOOKING_TYPE.BASE_PRICE,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      ...overrides,
    };

    return this.host.database.bookingType.create({ data: bookingTypeData });
  }

  async createTestSession(overrides: Partial<Session> = {}): Promise<Session> {
    const coachId = overrides.coachId ?? (await this.getCachedCoach()).id;
    const userId = overrides.userId ?? (await this.getCachedUser()).id;

    let bookingTypeId = overrides.bookingTypeId;
    if (!bookingTypeId) {
      const bookingType = await this.createTestBookingType({ coachId });
      bookingTypeId = bookingType.id;
    }

    let timeSlotId = overrides.timeSlotId;
    if (!timeSlotId) {
      const timeSlot = await this.createTestTimeSlot({ coachId });
      timeSlotId = timeSlot.id;
    }

    const sessionData = {
      notes: DEFAULT_TEST_SESSION.NOTES,
      dateTime: getFutureDate(DEFAULT_TEST_SESSION.FUTURE_OFFSET_HOURS),
      durationMin: DEFAULT_TEST_SESSION.DURATION_MIN,
      status: DEFAULT_TEST_SESSION.STATUS,
      price: DEFAULT_TEST_SESSION.PRICE,
      isPaid: DEFAULT_TEST_SESSION.IS_PAID,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
      // Ensure required IDs are not overwritten by undefined values in overrides
      coachId: overrides.coachId ?? coachId,
      userId: overrides.userId ?? userId,
      bookingTypeId: overrides.bookingTypeId ?? bookingTypeId,
      timeSlotId: overrides.timeSlotId ?? timeSlotId,
    };

    return this.host.database.session.create({ data: sessionData });
  }

  async createTestTimeSlot(overrides: Partial<TimeSlot> = {}): Promise<TimeSlot> {
    const coachId = overrides.coachId ?? (await this.getCachedCoach()).id;

    const timeSlotData = {
      coachId,
      dateTime: getFutureDate(DEFAULT_TEST_TIME_SLOT.FUTURE_OFFSET_HOURS),
      durationMin: DEFAULT_TEST_TIME_SLOT.DURATION_MIN,
      isAvailable: DEFAULT_TEST_TIME_SLOT.IS_AVAILABLE,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };

    return this.host.database.timeSlot.create({ data: timeSlotData });
  }

  async createTestDiscount(overrides: Partial<Discount> = {}): Promise<Discount> {
    const coachId = overrides.coachId ?? (await this.getCachedCoach()).id;

    const discountData = {
      coachId,
      code: `DISCOUNT${Date.now()}`,
      amount: DEFAULT_TEST_DISCOUNT.AMOUNT,
      isActive: DEFAULT_TEST_DISCOUNT.IS_ACTIVE,
      expiry: getFutureDateByDays(DEFAULT_TEST_DISCOUNT.EXPIRY_OFFSET_DAYS),
      useCount: DEFAULT_TEST_DISCOUNT.USE_COUNT,
      maxUsage: DEFAULT_TEST_DISCOUNT.MAX_USAGE,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };

    return this.host.database.discount.create({ data: discountData });
  }

  async createTestMessage(overrides: Partial<Message> = {}): Promise<Message> {
    const senderId = overrides.senderId ?? (await this.getCachedUser()).id;
    const receiverId = overrides.receiverId ?? (await this.getCachedCoach()).id;
    const sessionId = overrides.sessionId ?? (await this.createTestSession()).id;

    const messageData = {
      senderId,
      receiverId,
      sessionId,
      content: DEFAULT_TEST_MESSAGE.CONTENT,
      sentAt: overrides.sentAt ?? new Date(),
      senderType: overrides.senderType ?? Role.USER,
      receiverType: overrides.receiverType ?? Role.COACH,
      ...overrides,
    };

    return this.host.database.message.create({ data: messageData });
  }

  async createTestUsers(count = 3): Promise<Account[]> {
    const users: Account[] = [];
    for (let i = 0; i < count; i++) {
      users.push(await this.createTestUser({ email: generateUniqueEmail(`test-user-${i}`) }));
    }
    return users;
  }

  async createTestCoaches(count = 3): Promise<Account[]> {
    const coaches: Account[] = [];
    for (let i = 0; i < count; i++) {
      coaches.push(await this.createTestCoach({ email: generateUniqueEmail(`test-coach-${i}`) }));
    }
    return coaches;
  }

  // ============================================================================
  // Database Helpers
  // ============================================================================

  async withTransaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.host.database.$transaction(callback);
  }

  async executeTransaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.withTransaction(callback);
  }

  async countRecords(model: string, where: any = {}): Promise<number> {
    return this.host.database[model].count({ where });
  }

  async findRecord(model: string, where: any): Promise<any> {
    return this.host.database[model].findFirst({ where });
  }

  async findRecords(model: string, where: any = {}): Promise<any[]> {
    return this.host.database[model].findMany({ where });
  }

  async updateRecord(model: string, where: any, data: any): Promise<any> {
    return this.host.database[model].update({ where, data });
  }

  async deleteRecord(model: string, where: any): Promise<any> {
    return this.host.database[model].delete({ where });
  }

  async assertDataExists(model: string, where: any): Promise<void> {
    const record = await this.findRecord(model, where);
    expect(record).toBeDefined();
    expect(record).not.toBeNull();
  }

  async assertDataNotExists(model: string, where: any): Promise<void> {
    const record = await this.findRecord(model, where);
    expect(record).toBeNull();
  }

  async waitForCondition(
    condition: () => boolean | Promise<boolean>,
    timeout = 5000,
    interval = 100
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const result = await Promise.resolve(condition());
      if (result) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error('Condition not met within timeout');
  }

  async waitForRecord(model: string, where: any, timeout = 5000, interval = 100): Promise<any> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const record = await this.findRecord(model, where);
      if (record) {
        return record;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error(`Record not found within timeout: ${JSON.stringify(where)}`);
  }
}
