/**
 * Abstract base class for in testing
 * Provides database setup, cleanup, and common integration testing patterns
 */

import { INestApplication, Provider } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';

import { Test, TestingModule } from '@nestjs/testing';
import {
  Account,
  BookingType,
  Discount,
  Message,
  Prisma,
  RefreshToken,
  Session,
  TimeSlot,
} from '@prisma/client';
import request from 'supertest';
import { JwtPayload } from '../auth/auth-test-helper';

import { PrismaService } from '../../../src/app/prisma/prisma.service';
import { cleanDatabase, seedTestDatabase } from '../database/database-helpers';

export abstract class BaseIntegrationTest {
  protected app: INestApplication;
  protected prisma: PrismaService;
  protected module: TestingModule;
  protected testData: any;
  private cachedCoach?: Account;
  private cachedUser?: Account;

  protected async getCachedCoach(): Promise<Account> {
    if (!this.cachedCoach) {
      this.cachedCoach = await this.createTestCoach();
    }
    return this.cachedCoach;
  }

  protected async getCachedUser(): Promise<Account> {
    if (!this.cachedUser) {
      this.cachedUser = await this.createTestUser();
    }
    return this.cachedUser;
  }
  /**
   * Abstract method to setup the test application
   * Must be implemented by concrete test classes
   */
  abstract setupTestApp(): Promise<void>;

  /**
   * Abstract method to get the modules to import
   * Must be implemented by concrete test classes
   */
  abstract getTestModules(): any[];

  /**
   * Setup method called before each test
   * Creates the test application and sets up the database
   */
  async setup(): Promise<void> {
    this.module = await Test.createTestingModule({
      imports: this.getTestModules(),
      providers: this.getTestProviders(),
    }).compile();

    await this.setupTestApp();

    this.app = this.module.createNestApplication();
    this.app.setGlobalPrefix('api');
    await this.app.init();

    this.prisma = this.module.get<PrismaService>(PrismaService);
    await this.setupDatabase();
  }

  /**
   * Cleanup method called after each test
   */
  async cleanup(): Promise<void> {
    await this.cleanupDatabase();

    if (this.app) {
      await this.app.close();
    }
    if (this.module) {
      await this.module.close();
    }
  }

  /**
   * Gets additional providers for the test module
   * Can be overridden by concrete test classes
   */
  getTestProviders(): Provider[] {
    return [];
  }

  /**
   * Sets up the test database with clean state
   */
  async setupDatabase(): Promise<void> {
    await this.cleanupDatabase();
    await this.seedTestData();
  }

  /**
   * Cleans up the test database
   */
  async cleanupDatabase(): Promise<void> {
    if (this.prisma) {
      await cleanDatabase(this.prisma);
    }
  }

  /**
   * Seeds the database with test data
   * Can be overridden by concrete test classes for custom seeding
   */
  async seedTestData(): Promise<void> {
    this.testData = await seedTestDatabase(this.prisma);
  }

  /**
   * Creates a test JWT token for authentication
   */
  protected createTestJwtToken(
    payload: Partial<JwtPayload> = {
      sub: 'test-user-id',
      email: 'test@example.com',
      role: Role.USER,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    }
  ): string {
    const jwtService = new JwtService({
      secret: process.env.JWT_SECRET || 'test-secret',
      signOptions: { expiresIn: '1h' },
    });
    return jwtService.sign(payload);
  }

  /**
   * Creates authorization headers for HTTP requests
   */
  protected createAuthHeaders(token?: string): { authorization: string } {
    const authToken = token || this.createTestJwtToken();
    return {
      authorization: `Bearer ${authToken}`,
    };
  }

  /**
   * Makes an authenticated GET request
   */
  protected authenticatedGet(endpoint: string, token?: string): request.Test {
    return request(this.app.getHttpServer())
      .get(`/api${endpoint}`)
      .set(this.createAuthHeaders(token));
  }

  /**
   * Makes an authenticated POST request
   */
  protected authenticatedPost(endpoint: string, data?: any, token?: string): request.Test {
    return request(this.app.getHttpServer())
      .post(`/api${endpoint}`)
      .set(this.createAuthHeaders(token))
      .send(data || {});
  }

  /**
   * Makes an authenticated PUT request
   */
  protected authenticatedPut(endpoint: string, data?: any, token?: string): request.Test {
    return request(this.app.getHttpServer())
      .put(`/api${endpoint}`)
      .set(this.createAuthHeaders(token))
      .send(data || {});
  }

  /**
   * Makes an authenticated DELETE request
   */
  protected authenticatedDelete(endpoint: string, token?: string): request.Test {
    return request(this.app.getHttpServer())
      .delete(`/api${endpoint}`)
      .set(this.createAuthHeaders(token));
  }

  /**
   * Makes an unauthenticated GET request
   */
  protected get(endpoint: string): request.Test {
    return request(this.app.getHttpServer()).get(`/api${endpoint}`);
  }

  /**
   * Makes an unauthenticated POST request
   */
  protected post(endpoint: string, data?: any): request.Test {
    return request(this.app.getHttpServer())
      .post(`/api${endpoint}`)
      .send(data || {});
  }

  /**
   * Executes a database transaction for testing
   */
  protected async withTransaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    return this.prisma.$transaction(callback);
  }

  /**
   * Creates test user data in the database with sensible defaults.
   * Allows overriding any field via partial parameter.
   */
  protected async createTestUser(overrides: Partial<Account> = {}): Promise<Account> {
    const userData = {
      email: `test-user-${Date.now()}@example.com`,
      name: 'Test User',
      passwordHash: 'hashed-password',
      role: Role.USER,
      gender: 'OTHER',
      age: 30,
      height: 170,
      weight: 70,
      country: 'Test User Country',
      address: '123 Test St, Test City',
      isActive: true,
      isOnline: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };

    return this.prisma.account.create({
      data: userData,
    });
  }

  /**
   * Creates test coach data in the database with sensible defaults.
   * Allows overriding any field via partial parameter.
   */
  protected async createTestCoach(overrides: Partial<Account> = {}): Promise<Account> {
    const coachData = {
      email: `test-coach-${Date.now()}@example.com`,
      name: 'Test Coach',
      bio: 'Test coach bio',
      passwordHash: 'hashed-password',
      role: Role.COACH,
      credentials: 'Certified Coach',
      philosophy: 'Coaching Philosophy',
      profileImage: 'http://example.com/profile.jpg',
      isActive: true,
      isOnline: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };

    return this.prisma.account.create({
      data: coachData,
    });
  }

  /**
   * Creates test booking type data in the database with sensible defaults.
   * Related entities (coach) are created if not provided.
   * Allows overriding any field via partial parameter.
   */
  protected async createTestBookingType(
    overrides: Partial<BookingType> = {}
  ): Promise<BookingType> {
    const coachId = overrides.coachId ?? (await this.getCachedCoach()).id;

    const bookingTypeData = {
      coachId,
      name: 'Test Booking Type',
      description: 'Test booking type description',
      basePrice: 75.0,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      ...overrides,
    };

    return this.prisma.bookingType.create({
      data: bookingTypeData,
    });
  }

  /**
   * Creates test session data in the database with sensible defaults.
   * Related entities (coach, user, bookingType, timeSlot) are created if not provided.
   * Allows overriding any field via partial parameter.
   */
  protected async createTestSession(overrides: Partial<Session> = {}): Promise<Session> {
    const coachId = overrides.coachId ?? (await this.getCachedCoach()).id;
    const userId = overrides.userId ?? (await this.getCachedUser()).id;
    const bookingTypeId =
      overrides.bookingTypeId ?? (await this.createTestBookingType({ coachId })).id;
    const timeSlotId = overrides.timeSlotId ?? (await this.createTestTimeSlot({ coachId })).id;

    const sessionData = {
      coachId,
      userId,
      notes: 'Test session notes',
      dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      durationMin: 60,
      status: 'SCHEDULED',
      price: 75.0,
      isPaid: false,
      bookingTypeId,
      timeSlotId,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };

    return this.prisma.session.create({
      data: sessionData,
    });
  }

  /**
   * Creates test Time slot data in the database with sensible defaults.
   * Related entities (coach) are created if not provided.
   * Allows overriding any field via partial parameter.
   */
  protected async createTestTimeSlot(overrides: Partial<TimeSlot> = {}): Promise<TimeSlot> {
    const coachId = overrides.coachId ?? (await this.getCachedCoach()).id;

    const timeSlotData = {
      coachId,
      dateTime: new Date(Date.now() + 48 * 60 * 60 * 1000), // Day after tomorrow
      durationMin: 60,
      isAvailable: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };

    return this.prisma.timeSlot.create({
      data: timeSlotData,
    });
  }

  /**
   * Creates test Discount data in the database with sensible defaults.
   * Related entities (coach) are created if not provided.
   * Allows overriding any field via partial parameter.
   */
  protected async createTestDiscount(overrides: Partial<Discount> = {}): Promise<Discount> {
    const coachId = overrides.coachId ?? (await this.getCachedCoach()).id;

    const discountedData = {
      coachId,
      code: `DISCOUNT${Date.now()}`,
      amount: 10.0,
      isActive: true,
      expiry: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      useCount: 0,
      maxUsage: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };

    return this.prisma.discount.create({
      data: discountedData,
    });
  }

  /**
   * Creates test Message data in the database with sensible defaults.
   * Related entities (coach, user, session) are created if not provided.
   * Allows overriding any field via partial parameter.
   */
  protected async createTestMessage(overrides: Partial<Message> = {}): Promise<Message> {
    const senderId = overrides.senderId ?? (await this.getCachedUser()).id;
    const receiverId = overrides.receiverId ?? (await this.getCachedCoach()).id;
    const sessionId = overrides.sessionId ?? (await this.createTestSession()).id;

    const messageData = {
      senderId,
      receiverId,
      sessionId,
      content: 'Test message content',
      sentAt: overrides.sentAt ?? new Date(),
      senderType: overrides.senderType ?? Role.USER,
      receiverType: overrides.receiverType ?? Role.COACH,
      ...overrides,
    };

    return this.prisma.message.create({
      data: messageData,
    });
  }

  /**
   * Creates test RefreshToken data in the database with sensible defaults.
   * Related entities (coach, user, JwtToken) are created if not provided.
   * Allows overriding any field via partial parameter.
   */
  protected async createTestRefreshToken(
    overrides: Partial<RefreshToken> = {}
  ): Promise<RefreshToken> {
    const account = await this.getCachedUser();
    const token =
      overrides.token ??
      (await this.createTestJwtToken({
        sub: overrides.accountId ?? account.id,
        email: account.email,
      }));
    const refreshTokenData = {
      accountId: overrides.accountId ?? account.id,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };

    return this.prisma.refreshToken.create({
      data: refreshTokenData,
    });
  }

  /**
   * Asserts that a response has the expected structure
   */
  protected assertResponseStructure(response: any, expectedKeys: string[]): void {
    expect(response.body).toBeDefined();
    expectedKeys.forEach(key => {
      expect(response.body).toHaveProperty(key);
    });
  }

  /**
   * Asserts that a response is a successful API response
   */
  protected assertSuccessResponse(response: any, expectedStatus = 200): void {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toBeDefined();
  }

  /**
   * Asserts that a response is an error response
   */
  protected assertErrorResponse(
    response: any,
    expectedStatus: number,
    expectedMessage?: string
  ): void {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toBeDefined();

    // For error responses, check the message
    if (expectedMessage && !response.ok) {
      expect(response.body.message).toContain(expectedMessage);
    }
  }

  /**
   * Asserts that data exists in the database
   */
  protected async assertDataExists(model: string, where: any): Promise<void> {
    const data = await this.prisma[model].findFirst({ where });
    expect(data).toBeDefined();
  }

  /**
   * Asserts that data does not exist in the database
   */
  protected async assertDataNotExists(model: string, where: any): Promise<void> {
    const data = await this.prisma[model].findFirst({ where });
    expect(data).toBeNull();
  }

  /**
   * Counts records in a database table
   */
  protected async countRecords(model: string, where: any = {}): Promise<number> {
    return this.prisma[model].count({ where });
  }
}
