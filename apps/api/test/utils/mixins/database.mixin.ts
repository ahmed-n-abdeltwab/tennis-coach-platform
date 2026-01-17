/**
 * Database Mixin
 * Provides reusable database operations and test data factories
 * Eliminates duplication of database setup/cleanup
 */

import {
  Account,
  BookingType,
  Conversation,
  CustomService,
  Discount,
  Message,
  Payment,
  PaymentStatus,
  Prisma,
  Role,
  Session,
  SessionStatus,
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
  accountFactory,
  bookingTypeFactory,
  discountFactory,
  messageFactory,
  timeSlotFactory,
} from '../factories';

/**
 * Test data structure created during database seeding
 */
export interface TestData {
  users: Account[];
  coaches: Account[];
  bookingTypes: BookingType[];
}

/**
 * Base class for mixins that require a host implementing a capability interface
 */
export abstract class BaseMixin<THost> {
  constructor(protected readonly host: THost) {}
}

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
export class DatabaseMixin extends BaseMixin<DatabaseCapable> {
  private cachedCoach?: Account;
  private cachedUser?: Account;
  public testData: TestData;

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
   * Seeds the database with basic test data using factories
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

      // Create test users using factory
      const users: Account[] = [];
      for (let i = 0; i < 2; i++) {
        try {
          const mockUser = accountFactory.createUser();
          const user = await this.host.database.account.create({
            data: {
              email: mockUser.email,
              name: mockUser.name,
              passwordHash: mockUser.passwordHash,
              gender: mockUser.gender,
              age: mockUser.age,
              country: mockUser.country,
              role: Role.USER,
            },
          });
          users.push(user);
        } catch (userError) {
          console.warn(`Failed to create user:`, userError);
        }
      }

      // Create test coaches using factory
      const coaches: Account[] = [];
      for (let i = 0; i < 2; i++) {
        try {
          const mockCoach = accountFactory.createCoach();
          const coach = await this.host.database.account.create({
            data: {
              email: mockCoach.email,
              name: mockCoach.name,
              passwordHash: mockCoach.passwordHash,
              bio: mockCoach.bio,
              credentials: mockCoach.credentials,
              role: Role.COACH,
            },
          });
          coaches.push(coach);
        } catch (coachError) {
          console.warn(`Failed to create coach:`, coachError);
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

      if (coaches.length === 0) {
        throw createDatabaseError('seed test database', 'No coaches were created or found', {
          operation: 'seedTestDatabase',
        });
      }

      const firstCoach = coaches[0];
      if (!firstCoach?.id) {
        throw createDatabaseError('seed test database', 'First coach is undefined or has no id', {
          operation: 'seedTestDatabase',
        });
      }

      // Create test booking types using factory
      const bookingTypes: BookingType[] = [];
      for (let i = 0; i < 2; i++) {
        try {
          const mockBookingType = bookingTypeFactory.create();
          const bookingType = await this.host.database.bookingType.create({
            data: {
              name: mockBookingType.name,
              description: mockBookingType.description,
              basePrice: mockBookingType.basePrice,
              coachId: firstCoach.id,
              isActive: true,
            },
          });
          bookingTypes.push(bookingType);
        } catch (bookingTypeError) {
          console.warn(`Failed to create booking type:`, bookingTypeError);
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

  async getCachedCoach(): Promise<Account> {
    if (this.cachedCoach) {
      return this.cachedCoach;
    }

    // Try to get from cache by looking for any cached coach
    const mockCoach = accountFactory.createCoach();
    const cachedCoach = testEntityCache.getCoachByEmail(mockCoach.email);
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

    const mockUser = accountFactory.createUser();
    const cachedUser = testEntityCache.getUserByEmail(mockUser.email);
    if (cachedUser) {
      this.cachedUser = cachedUser;
      return cachedUser;
    }

    this.cachedUser = await this.createTestUser();
    testEntityCache.cacheUser(this.cachedUser);
    return this.cachedUser;
  }

  async createTestUser(overrides: Partial<Account> = {}): Promise<Account> {
    const mockUser = accountFactory.createUser();

    const userData = {
      email: generateUniqueEmail('test-user'),
      name: mockUser.name,
      passwordHash: mockUser.passwordHash,
      role: Role.USER,
      gender: mockUser.gender,
      age: mockUser.age,
      height: mockUser.height,
      weight: mockUser.weight,
      country: mockUser.country,
      address: mockUser.address,
      isActive: true,
      isOnline: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };

    return this.host.database.account.create({ data: userData });
  }

  async createTestCoach(overrides: Partial<Account> = {}): Promise<Account> {
    const mockCoach = accountFactory.createCoach();

    const coachData = {
      email: generateUniqueEmail('test-coach'),
      name: mockCoach.name,
      bio: mockCoach.bio,
      passwordHash: mockCoach.passwordHash,
      role: Role.COACH,
      credentials: mockCoach.credentials,
      philosophy: mockCoach.philosophy,
      profileImage: mockCoach.profileImage,
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
    const mockBookingType = bookingTypeFactory.create();

    const bookingTypeData = {
      coachId,
      name: mockBookingType.name,
      description: mockBookingType.description,
      basePrice: mockBookingType.basePrice,
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
      notes: `Session notes - ${Date.now()}`,
      dateTime: getFutureDate(24),
      durationMin: 60,
      status: SessionStatus.SCHEDULED,
      price: 75.0,
      isPaid: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
      coachId: overrides.coachId ?? coachId,
      userId: overrides.userId ?? userId,
      bookingTypeId: overrides.bookingTypeId ?? bookingTypeId,
      timeSlotId: overrides.timeSlotId ?? timeSlotId,
    };

    return this.host.database.session.create({ data: sessionData });
  }

  async createTestTimeSlot(overrides: Partial<TimeSlot> = {}): Promise<TimeSlot> {
    const coachId = overrides.coachId ?? (await this.getCachedCoach()).id;
    const mockTimeSlot = timeSlotFactory.create();

    const timeSlotData = {
      coachId,
      dateTime: getFutureDate(48),
      durationMin: mockTimeSlot.durationMin,
      isAvailable: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };

    return this.host.database.timeSlot.create({ data: timeSlotData });
  }

  async createTestDiscount(overrides: Partial<Discount> = {}): Promise<Discount> {
    const coachId = overrides.coachId ?? (await this.getCachedCoach()).id;
    const mockDiscount = discountFactory.create();

    const discountData = {
      coachId,
      code: mockDiscount.code,
      amount: mockDiscount.amount,
      isActive: true,
      expiry: getFutureDateByDays(30),
      useCount: 0,
      maxUsage: mockDiscount.maxUsage,
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
    const mockMessage = messageFactory.create();

    const messageData = {
      senderId,
      receiverId,
      sessionId,
      content: mockMessage.content,
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

  async createTestCustomService(overrides: Partial<CustomService> = {}): Promise<CustomService> {
    const coachId = overrides.coachId ?? (await this.getCachedCoach()).id;

    const customServiceData = {
      coachId,
      name: overrides.name ?? `Custom Service ${Date.now()}`,
      description: overrides.description ?? 'Test custom service description',
      basePrice: overrides.basePrice ?? 100.0,
      duration: overrides.duration ?? 60,
      isTemplate: overrides.isTemplate ?? false,
      isPublic: overrides.isPublic ?? false,
      usageCount: overrides.usageCount ?? 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };

    return this.host.database.customService.create({ data: customServiceData });
  }

  async createTestConversation(overrides: Partial<Conversation> = {}): Promise<Conversation> {
    const participantIds = overrides.participantIds ?? [
      (await this.getCachedUser()).id,
      (await this.getCachedCoach()).id,
    ];

    const conversationData = {
      participantIds,
      isPinned: overrides.isPinned ?? false,
      pinnedAt: overrides.pinnedAt ?? null,
      pinnedBy: overrides.pinnedBy ?? null,
      lastMessageAt: overrides.lastMessageAt ?? new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };

    return this.host.database.conversation.create({ data: conversationData });
  }

  async createTestPayment(overrides: Partial<Payment> = {}): Promise<Payment> {
    const userId = overrides.userId ?? (await this.getCachedUser()).id;

    const paymentData = {
      userId,
      amount: overrides.amount ?? 100.0,
      currency: overrides.currency ?? 'USD',
      status: overrides.status ?? PaymentStatus.PENDING,
      paypalOrderId: overrides.paypalOrderId ?? null,
      paypalCaptureId: overrides.paypalCaptureId ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };

    return this.host.database.payment.create({ data: paymentData });
  }

  async withTransaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.host.database.$transaction(callback);
  }
}
