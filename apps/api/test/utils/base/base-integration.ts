/**
 * Abstract base class for integration testing
 * Provides database setup, cleanup, and common integration testing patterns
 * Enhanced with type-safe HTTP methods using routes-helpers type utilities
 */

import { JwtPayload } from '@common';
import { INestApplication, Provider } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
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
import request from 'supertest';

import { PrismaService } from '../../../src/app/prisma/prisma.service';
import type { AuthHeaders } from '../auth/auth-test-helper';
import { testDataCache } from '../cache/test-data-cache';
import {
  DEFAULT_TEST_BOOKING_TYPE,
  DEFAULT_TEST_COACH,
  DEFAULT_TEST_DISCOUNT,
  DEFAULT_TEST_MESSAGE,
  DEFAULT_TEST_SESSION,
  DEFAULT_TEST_TIME_SLOT,
  DEFAULT_TEST_USER,
  ERROR_MESSAGES,
  HTTP_CONSTANTS,
  JWT_CONSTANTS,
  TEST_ENV_CONSTANTS,
} from '../constants/test-constants';
import { batchCleanupManager } from '../database/batch-cleanup-manager';
import { seedTestDatabase } from '../database/database-helpers';
import { generateUniqueEmail, getFutureDate, getFutureDateByDays } from '../helpers/common-helpers';
import type { RequestOptions, RequestType } from '../http/type-safe-http-client';
import { performanceMonitor } from '../performance/test-performance-monitor';
import type { Endpoints, ExtractMethods, ExtractPaths, PathsWithMethod } from '../types/type-utils';
import { buildPath } from '../types/type-utils';

export abstract class BaseIntegrationTest<E extends Record<string, any> = Endpoints> {
  protected app: INestApplication;
  protected prisma: PrismaService;
  protected module: TestingModule;
  protected testData: any;
  private cachedCoach?: Account;
  private cachedUser?: Account;

  async getCachedCoach(): Promise<Account> {
    // Try to get from cache first
    if (this.cachedCoach) {
      return this.cachedCoach;
    }

    // Check global cache
    const cachedCoach = testDataCache.getCoachByEmail(DEFAULT_TEST_COACH.NAME);
    if (cachedCoach) {
      this.cachedCoach = cachedCoach;
      return cachedCoach;
    }

    // Create new coach and cache it
    this.cachedCoach = await this.createTestCoach();
    testDataCache.cacheCoach(this.cachedCoach);
    return this.cachedCoach;
  }

  async getCachedUser(): Promise<Account> {
    // Try to get from cache first
    if (this.cachedUser) {
      return this.cachedUser;
    }

    // Check global cache
    const cachedUser = testDataCache.getUserByEmail(DEFAULT_TEST_USER.EMAIL);
    if (cachedUser) {
      this.cachedUser = cachedUser;
      return cachedUser;
    }

    // Create new user and cache it
    this.cachedUser = await this.createTestUser();
    testDataCache.cacheUser(this.cachedUser);
    return this.cachedUser;
  }

  getApp(): INestApplication {
    return this.app;
  }

  getPrisma(): PrismaService {
    return this.prisma;
  }

  getModule(): TestingModule {
    return this.module;
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
   * Gets test controllers for the test module
   * Can be overridden by concrete test classes
   */
  getTestControllers(): any[] {
    return [];
  }

  /**
   * Setup method called before each test
   * Creates the test application and sets up the database
   */
  async setup(): Promise<void> {
    await performanceMonitor.trackSetup(async () => {
      this.module = await Test.createTestingModule({
        imports: this.getTestModules(),
        controllers: this.getTestControllers(),
        providers: this.getTestProviders(),
      }).compile();

      this.app = this.module.createNestApplication();
      this.app.setGlobalPrefix('api');
      await this.app.init();

      // Call setupTestApp after app is initialized
      await this.setupTestApp();

      // Only get PrismaService if it's available in the module
      try {
        this.prisma = this.module.get<PrismaService>(PrismaService, { strict: false });
      } catch {
        // PrismaService not available, skip database setup
      }

      await this.setupDatabase();
    });
  }

  /**
   * Cleanup method called after each test
   */
  async cleanup(): Promise<void> {
    await performanceMonitor.trackCleanup(async () => {
      await this.cleanupDatabase();

      if (this.app) {
        await this.app.close();
      }
      if (this.module) {
        await this.module.close();
      }

      // Clear local caches
      this.cachedCoach = undefined;
      this.cachedUser = undefined;
    });
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
    if (this.prisma) {
      await this.cleanupDatabase();
      await this.seedTestData();
    }
  }

  /**
   * Cleans up the test database
   */
  async cleanupDatabase(): Promise<void> {
    if (this.prisma) {
      // Use optimized batch cleanup with sequential mode to avoid foreign key issues
      await batchCleanupManager.cleanDatabase(this.prisma, { parallel: false });

      // Clear local caches after database cleanup
      this.cachedCoach = undefined;
      this.cachedUser = undefined;

      // Clear global cache
      testDataCache.clear();
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
  async createTestJwtToken(
    payload: Partial<JwtPayload> = {
      sub: DEFAULT_TEST_USER.ID,
      email: DEFAULT_TEST_USER.EMAIL,
      role: Role.USER,
    }
  ): Promise<string> {
    const jwtService = new JwtService({
      secret: process.env.JWT_SECRET ?? JWT_CONSTANTS.DEFAULT_SECRET,
      signOptions: { expiresIn: JWT_CONSTANTS.DEFAULT_EXPIRY },
    });
    return jwtService.signAsync(payload);
  }

  /**
   * Creates Authorization headers for HTTP requests
   */
  async createAuthHeaders(token?: string): Promise<AuthHeaders> {
    const authToken = token ?? (await this.createTestJwtToken());
    return {
      [HTTP_CONSTANTS.AUTHORIZATION_HEADER]: `${HTTP_CONSTANTS.BEARER_PREFIX}${authToken}`,
    };
  }

  /**
   * Makes an request
   */
  async request<P extends ExtractPaths<E>, M extends ExtractMethods<E, P>>(
    endpoint: P,
    method: M,
    payload?: RequestType<E, P, M>,
    options?: RequestOptions
  ): Promise<request.Test> {
    const { body, params } = payload ?? {};
    const builtPath = this.buildPathWithParams(endpoint, params as any);

    const normalizedMethod = method.toLowerCase() as Lowercase<M>;
    let req = request(this.app.getHttpServer())[normalizedMethod](builtPath);

    // Add headers
    if (options?.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        req = req.set(key, value);
      });
    }

    // body/query
    if (params) req = req.query(params);
    if (body) req = req.send(body);

    // Set timeout
    if (options?.timeout) req = req.timeout(options.timeout);

    // Set expected status
    if (options?.expectedStatus) req = req.expect(options.expectedStatus);

    return req;
  }
  /**
   * Makes an unauthenticated GET request
   */
  async get<P extends PathsWithMethod<E, 'GET'>>(
    endpoint: P,
    payload?: RequestType<E, P, 'GET'>,
    options?: RequestOptions
  ): Promise<request.Test> {
    return this.request(endpoint, 'GET', payload, options);
  }

  /**
   * Makes an unauthenticated POST request
   */
  async post<P extends PathsWithMethod<E, 'POST'>>(
    endpoint: P,
    payload?: RequestType<E, P, 'POST'>,
    options?: RequestOptions
  ): Promise<request.Test> {
    return this.request(endpoint, 'POST', payload, options);
  }

  /**
   * Makes an unauthenticated PUT request
   */
  async put<P extends PathsWithMethod<E, 'PUT'>>(
    endpoint: P,
    payload?: RequestType<E, P, 'PUT'>,
    options?: RequestOptions
  ): Promise<request.Test> {
    return this.request(endpoint, 'PUT', payload, options);
  }

  /**
   * Makes an unauthenticated DELETE request
   */
  async delete<P extends PathsWithMethod<E, 'DELETE'>>(
    endpoint: P,
    payload?: RequestType<E, P, 'DELETE'>,
    options?: RequestOptions
  ): Promise<request.Test> {
    return this.request(endpoint, 'DELETE', payload, options);
  }
  /**
   * Makes an authenticated request
   */
  async authenticatedRequest<P extends ExtractPaths<E>, M extends ExtractMethods<E, P>>(
    endpoint: P,
    method: M,
    token: string,
    payload?: RequestType<E, P, M>,
    options?: RequestOptions
  ): Promise<request.Test> {
    const authHeaders = await this.createAuthHeaders(token);
    return this.request(endpoint, method, payload, {
      ...options,
      headers: { ...authHeaders, ...options?.headers },
    });
  }

  /**
   * Makes an authenticated GET request
   */
  async authenticatedGet<P extends PathsWithMethod<E, 'GET'>>(
    endpoint: P,
    token: string,
    payload?: RequestType<E, P, 'GET'>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<request.Test> {
    return this.authenticatedRequest(endpoint, 'GET', token, payload, options);
  }

  /**
   * Makes an authenticated POST request
   */
  async authenticatedPost<P extends PathsWithMethod<E, 'POST'>>(
    endpoint: P,
    token: string,
    payload?: RequestType<E, P, 'POST'>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<request.Test> {
    return this.authenticatedRequest(endpoint, 'POST', token, payload, options);
  }

  /**
   * Makes an authenticated PUT request
   */
  async authenticatedPut<P extends PathsWithMethod<E, 'PUT'>>(
    endpoint: P,
    token: string,
    payload?: RequestType<E, P, 'PUT'>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<request.Test> {
    return this.authenticatedRequest(endpoint, 'PUT', token, payload, options);
  }

  /**
   * Makes an authenticated DELETE request
   */
  authenticatedDelete<P extends PathsWithMethod<E, 'DELETE'>>(
    endpoint: P,
    token: string,
    payload?: RequestType<E, P, 'DELETE'>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<request.Test> {
    return this.authenticatedRequest(endpoint, 'DELETE', token, payload, options);
  }

  /**
   * Build path with parameters (replace {id} with actual values)
   * @private
   */
  private buildPathWithParams(path: string, data?: Record<string, any>): string {
    if (!data || typeof data !== 'object') return path;
    return buildPath(path, data);
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

    return this.prisma.account.create({
      data: userData,
    });
  }

  /**
   * Creates test coach data in the database with sensible defaults.
   * Allows overriding any field via partial parameter.
   */
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

    return this.prisma.account.create({
      data: coachData,
    });
  }

  /**
   * Creates test booking type data in the database with sensible defaults.
   * Related entities (coach) are created if not provided.
   * Allows overriding any field via partial parameter.
   */
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

    return this.prisma.bookingType.create({
      data: bookingTypeData,
    });
  }

  /**
   * Creates test session data in the database with sensible defaults.
   * Related entities (coach, user, bookingType, timeSlot) are created if not provided.
   * Allows overriding any field via partial parameter.
   */
  async createTestSession(overrides: Partial<Session> = {}): Promise<Session> {
    const coachId = overrides.coachId ?? (await this.getCachedCoach()).id;
    const userId = overrides.userId ?? (await this.getCachedUser()).id;

    // Create bookingType and timeSlot first, ensuring they exist before session creation
    let bookingTypeId = overrides.bookingTypeId;
    if (!bookingTypeId) {
      const bookingType = await this.createTestBookingType({ coachId });
      bookingTypeId = bookingType.id;

      // Verify bookingType exists
      const verifyBookingType = await this.prisma.bookingType.findUnique({
        where: { id: bookingTypeId },
      });
      if (!verifyBookingType) {
        throw new Error(`BookingType ${bookingTypeId} was not found after creation`);
      }
    }

    let timeSlotId = overrides.timeSlotId;
    if (!timeSlotId) {
      const timeSlot = await this.createTestTimeSlot({ coachId });
      timeSlotId = timeSlot.id;
    }

    const sessionData = {
      coachId,
      userId,
      notes: DEFAULT_TEST_SESSION.NOTES,
      dateTime: getFutureDate(DEFAULT_TEST_SESSION.FUTURE_OFFSET_HOURS),
      durationMin: DEFAULT_TEST_SESSION.DURATION_MIN,
      status: DEFAULT_TEST_SESSION.STATUS,
      price: DEFAULT_TEST_SESSION.PRICE,
      isPaid: DEFAULT_TEST_SESSION.IS_PAID,
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
      amount: DEFAULT_TEST_DISCOUNT.AMOUNT,
      isActive: DEFAULT_TEST_DISCOUNT.IS_ACTIVE,
      expiry: getFutureDateByDays(DEFAULT_TEST_DISCOUNT.EXPIRY_OFFSET_DAYS),
      useCount: DEFAULT_TEST_DISCOUNT.USE_COUNT,
      maxUsage: DEFAULT_TEST_DISCOUNT.MAX_USAGE,
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
      content: DEFAULT_TEST_MESSAGE.CONTENT,
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
  async countRecords(model: string, where: any = {}): Promise<number> {
    return this.prisma[model].count({ where });
  }

  /**
   * Finds a single record in the database
   */
  async findRecord(model: string, where: any): Promise<any> {
    return this.prisma[model].findFirst({ where });
  }

  /**
   * Finds multiple records in the database
   */
  async findRecords(model: string, where: any = {}): Promise<any[]> {
    return this.prisma[model].findMany({ where });
  }

  /**
   * Updates a record in the database
   */
  async updateRecord(model: string, where: any, data: any): Promise<any> {
    return this.prisma[model].update({ where, data });
  }

  /**
   * Deletes a record from the database
   */
  async deleteRecord(model: string, where: any): Promise<any> {
    return this.prisma[model].delete({ where });
  }

  /**
   * Deletes multiple records from the database
   */
  protected async deleteRecords(model: string, where: any = {}): Promise<any> {
    return this.prisma[model].deleteMany({ where });
  }

  /**
   * Asserts that a response contains pagination metadata
   */
  protected assertHasPagination(response: any): void {
    expect(response.body).toBeDefined();
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('meta');
    expect(response.body.meta).toHaveProperty('total');
    expect(response.body.meta).toHaveProperty('page');
    expect(response.body.meta).toHaveProperty('limit');
  }

  /**
   * Asserts that a response array has expected length
   */
  protected assertArrayLength(response: any, expectedLength: number): void {
    expect(response.body).toBeDefined();
    const data = Array.isArray(response.body) ? response.body : response.body.data;
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(expectedLength);
  }

  /**
   * Asserts that a response array contains an item matching criteria
   */
  protected assertArrayContains(response: any, matcher: any): void {
    expect(response.body).toBeDefined();
    const data = Array.isArray(response.body) ? response.body : response.body.data;
    expect(Array.isArray(data)).toBe(true);
    expect(
      data.some((item: any) => Object.keys(matcher).every(key => item[key] === matcher[key]))
    ).toBe(true);
  }

  /**
   * Asserts that a response is a validation error
   */
  protected assertValidationError(response: any, expectedFields?: string[]): void {
    expect(response.status).toBe(400);
    expect(response.body).toBeDefined();
    expect(response.body.message).toBeDefined();

    if (expectedFields) {
      const messages = Array.isArray(response.body.message)
        ? response.body.message
        : [response.body.message];
      expectedFields.forEach(field => {
        expect(messages.some((msg: string) => msg.includes(field))).toBe(true);
      });
    }
  }

  /**
   * Asserts that a response is unauthorized (401)
   */
  protected assertUnauthorized(response: any): void {
    expect(response.status).toBe(401);
    expect(response.body).toBeDefined();
  }

  /**
   * Asserts that a response is forbidden (403)
   */
  protected assertForbidden(response: any): void {
    expect(response.status).toBe(403);
    expect(response.body).toBeDefined();
  }

  /**
   * Asserts that a response is not found (404)
   */
  protected assertNotFound(response: any): void {
    expect(response.status).toBe(404);
    expect(response.body).toBeDefined();
  }

  /**
   * Asserts that a response body matches expected data
   */
  protected assertResponseBody(response: any, expectedData: any): void {
    expect(response.body).toBeDefined();
    expect(response.body).toMatchObject(expectedData);
  }

  /**
   * Extracts a specific field from response body
   */
  protected async extractField<T = any>(response: any, fieldPath: string): Promise<T> {
    const fields = fieldPath.split('.');
    let value = response.body;
    for (const field of fields) {
      value = value?.[field];
    }
    return value as T;
  }

  /**
   * Creates a token for a specific role
   */
  async createRoleToken(role: Role, overrides?: Partial<JwtPayload>): Promise<string> {
    return this.createTestJwtToken({
      sub: generateUniqueEmail(`test-${role.toLowerCase()}`),
      email: generateUniqueEmail(`test-${role.toLowerCase()}`),
      role,
      ...overrides,
    });
  }

  /**
   * Creates an expired JWT token for testing authentication failures
   */
  async createExpiredToken(payload?: Partial<JwtPayload>): Promise<string> {
    const jwtService = new JwtService({
      secret: process.env.JWT_SECRET ?? JWT_CONSTANTS.DEFAULT_SECRET,
      signOptions: { expiresIn: JWT_CONSTANTS.EXPIRED_TOKEN_EXPIRY },
    });
    return jwtService.signAsync({
      sub: DEFAULT_TEST_USER.ID,
      email: DEFAULT_TEST_USER.EMAIL,
      role: Role.USER,
      ...payload,
    });
  }

  /**
   * Creates multiple test users with different roles
   */
  async createTestUsers(count = 3): Promise<Account[]> {
    const users: Account[] = [];
    for (let i = 0; i < count; i++) {
      users.push(
        await this.createTestUser({
          email: generateUniqueEmail(`test-user-${i}`),
        })
      );
    }
    return users;
  }

  /**
   * Creates multiple test coaches
   */
  async createTestCoaches(count = 3): Promise<Account[]> {
    const coaches: Account[] = [];
    for (let i = 0; i < count; i++) {
      coaches.push(
        await this.createTestCoach({
          email: generateUniqueEmail(`test-coach-${i}`),
        })
      );
    }
    return coaches;
  }

  /**
   * Waits for a condition to become true
   */
  protected async waitForCondition(
    condition: () => boolean | Promise<boolean>,
    timeout: number = TEST_ENV_CONSTANTS.CONDITION_TIMEOUT_MS,
    interval: number = TEST_ENV_CONSTANTS.CONDITION_INTERVAL_MS
  ): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error(ERROR_MESSAGES.CONDITION_NOT_MET_TIMEOUT);
  }

  /**
   * Waits for a database record to exist
   */
  protected async waitForRecord(
    model: string,
    where: any,
    timeout: number = TEST_ENV_CONSTANTS.CONDITION_TIMEOUT_MS
  ): Promise<any> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const record = await this.findRecord(model, where);
      if (record) {
        return record;
      }
      await new Promise(resolve => setTimeout(resolve, TEST_ENV_CONSTANTS.CONDITION_INTERVAL_MS));
    }
    throw new Error(`Record not found in ${model} within timeout`);
  }
}
