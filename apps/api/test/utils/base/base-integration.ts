/**
 * Configuration-based integration test class
 * Provides database setup, cleanup, and type-safe HTTP methods
 *
 * Usage:
 * ```typescript
 * const test = new BaseIntegrationTest({
 *   modules: [SessionsModule, BookingTypesModule],
 *   controllers: [], // optional
 *   providers: [],   // optional
 * });
 *
 * await test.setup();
 *
 * // Type-safe HTTP methods avai
 await test.authenticatedPost('/api/sessions', token, { body: data });
 * ```
 */

import { JwtPayload } from '@common';
import { DynamicModule, INestApplication, Provider, Type } from '@nestjs/common';
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
  HTTP_CONSTANTS,
  JWT_CONSTANTS,
} from '../constants/test-constants';
import { batchCleanupManager } from '../database/batch-cleanup-manager';
import { seedTestDatabase } from '../database/database-helpers';
import { generateUniqueEmail, getFutureDate, getFutureDateByDays } from '../helpers/common-helpers';
import type { RequestOptions, RequestType } from '../http/type-safe-http-client';
import { performanceMonitor } from '../performance/test-performance-monitor';
import type {
  Endpoints,
  ExtractMethods,
  ExtractPaths,
  PathsForRoute,
  PathsWithMethod,
} from '../types/type-utils';
import { buildPath } from '../types/type-utils';

export interface IntegrationTestConfig<TModuleName extends string = string> {
  /** Modules to import for testing - can include async DynamicModules */
  modules: Array<Type<any> | DynamicModule | Promise<DynamicModule>>;
  /** Controllers to include (optional) */
  controllers?: Type<any>[];
  /** Additional providers (optional) */
  providers?: Provider[];
  /** Module name for type-safe routing (e.g., 'booking-types', 'accounts') - optional */
  moduleName?: TModuleName;
}

export class BaseIntegrationTest<
  TModuleName extends string = string,
  E extends Record<string, any> = Endpoints,
> {
  protected app!: INestApplication;
  protected prisma!: PrismaService;
  protected module!: TestingModule;
  protected testData: any;
  private cachedCoach?: Account;
  private cachedUser?: Account;
  private config: IntegrationTestConfig<TModuleName>;

  constructor(config: IntegrationTestConfig<TModuleName>) {
    this.config = config;
  }

  /**
   * Public accessor for the NestJS application
   */
  get application(): INestApplication {
    return this.app;
  }

  /**
   * Public accessor for PrismaService
   */
  get database(): PrismaService {
    return this.prisma;
  }

  /**
   * Public accessor for the testing module
   */
  get testModule(): TestingModule {
    return this.module;
  }

  async getCachedCoach(): Promise<Account> {
    if (this.cachedCoach) {
      return this.cachedCoach;
    }

    const cachedCoach = testDataCache.getCoachByEmail(DEFAULT_TEST_COACH.NAME);
    if (cachedCoach) {
      this.cachedCoach = cachedCoach;
      return cachedCoach;
    }

    this.cachedCoach = await this.createTestCoach();
    testDataCache.cacheCoach(this.cachedCoach);
    return this.cachedCoach;
  }

  async getCachedUser(): Promise<Account> {
    if (this.cachedUser) {
      return this.cachedUser;
    }

    const cachedUser = testDataCache.getUserByEmail(DEFAULT_TEST_USER.EMAIL);
    if (cachedUser) {
      this.cachedUser = cachedUser;
      return cachedUser;
    }

    this.cachedUser = await this.createTestUser();
    testDataCache.cacheUser(this.cachedUser);
    return this.cachedUser;
  }

  /**
   * Setup method called before each test
   */
  async setup(): Promise<void> {
    await performanceMonitor.trackSetup(async () => {
      // Resolve any Promise<DynamicModule> in the modules array
      const resolvedModules = await Promise.all(
        this.config.modules.map(async module => {
          // If it's a Promise, await it; otherwise return as-is
          return module instanceof Promise ? await module : module;
        })
      );

      this.module = await Test.createTestingModule({
        imports: resolvedModules,
        controllers: this.config.controllers ?? [],
        providers: this.config.providers ?? [],
      }).compile();

      this.app = this.module.createNestApplication();
      this.app.setGlobalPrefix('api');
      await this.app.init();

      try {
        this.prisma = this.module.get<PrismaService>(PrismaService, { strict: false });
      } catch {
        // PrismaService not available
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

      this.cachedCoach = undefined;
      this.cachedUser = undefined;
    });
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
      try {
        await batchCleanupManager.cleanDatabase(this.prisma, { parallel: false });
      } catch (error) {
        if (error instanceof Error && !error.message.includes('pool after calling end')) {
          throw error;
        }
      }

      this.cachedCoach = undefined;
      this.cachedUser = undefined;
      testDataCache.clear();
    }
  }

  /**
   * Seeds the database with test data
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
   * Makes a generic HTTP request
   */
  async request<P extends ExtractPaths<E>, M extends ExtractMethods<E, P>>(
    endpoint: P,
    method: M,
    payload?: RequestType<P, M, E>,
    options?: RequestOptions
  ): Promise<request.Test> {
    const { body, params } = payload ?? {};
    const builtPath = this.buildPathWithParams(endpoint, params as any);

    const normalizedMethod = method.toLowerCase() as Lowercase<M>;
    let req = request(this.app.getHttpServer())[normalizedMethod](builtPath);

    if (options?.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        req = req.set(key, value);
      });
    }

    if (params) req = req.query(params);
    if (body) req = req.send(body);
    if (options?.timeout) req = req.timeout(options.timeout);
    if (options?.expectedStatus) req = req.expect(options.expectedStatus);

    return req;
  }

  /**
   * Makes an unauthenticated GET request
   */
  async get<P extends PathsWithMethod<E, 'GET'>>(
    endpoint: P,
    payload?: RequestType<P, 'GET', E>,
    options?: RequestOptions
  ): Promise<request.Test> {
    return this.request(endpoint, 'GET', payload, options);
  }

  /**
   * Makes an unauthenticated POST request
   */
  async post<P extends PathsWithMethod<E, 'POST'>>(
    endpoint: P,
    payload?: RequestType<P, 'POST', E>,
    options?: RequestOptions
  ): Promise<request.Test> {
    return this.request(endpoint, 'POST', payload, options);
  }

  /**
   * Makes an unauthenticated PUT request
   */
  async put<P extends PathsWithMethod<E, 'PUT'>>(
    endpoint: P,
    payload?: RequestType<P, 'PUT', E>,
    options?: RequestOptions
  ): Promise<request.Test> {
    return this.request(endpoint, 'PUT', payload, options);
  }

  /**
   * Makes an unauthenticated DELETE request
   */
  async delete<P extends PathsWithMethod<E, 'DELETE'>>(
    endpoint: P,
    payload?: RequestType<P, 'DELETE', E>,
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
    payload?: RequestType<P, M, E>,
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
    payload?: RequestType<P, 'GET', E>,
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
    payload?: RequestType<P, 'POST', E>,
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
    payload?: RequestType<P, 'PUT', E>,
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
    payload?: RequestType<P, 'DELETE', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<request.Test> {
    return this.authenticatedRequest(endpoint, 'DELETE', token, payload, options);
  }

  // ============================================================================
  // Module-Scoped HTTP Methods (when moduleName is provided in config)
  // ============================================================================

  /**
   * Makes a module-scoped GET request (paths limited to the configured module)
   * Only available when moduleName is set in config
   */
  async moduleGet<P extends PathsForRoute<TModuleName, 'GET', E>>(
    endpoint: P,
    payload?: RequestType<P, 'GET', E>,
    options?: RequestOptions
  ): Promise<request.Test> {
    return this.request(endpoint, 'GET', payload, options);
  }

  /**
   * Makes a module-scoped POST request
   */
  async modulePost<P extends PathsForRoute<TModuleName, 'POST', E>>(
    endpoint: P,
    payload?: RequestType<P, 'POST', E>,
    options?: RequestOptions
  ): Promise<request.Test> {
    return this.request(endpoint, 'POST', payload, options);
  }

  /**
   * Makes a module-scoped PUT request
   */
  async modulePut<P extends PathsForRoute<TModuleName, 'PUT', E>>(
    endpoint: P,
    payload?: RequestType<P, 'PUT', E>,
    options?: RequestOptions
  ): Promise<request.Test> {
    return this.request(endpoint, 'PUT', payload, options);
  }

  /**
   * Makes a module-scoped PATCH request
   */
  async modulePatch<P extends PathsForRoute<TModuleName, 'PATCH', E>>(
    endpoint: P,
    payload?: RequestType<P, 'PATCH', E>,
    options?: RequestOptions
  ): Promise<request.Test> {
    return this.request(endpoint, 'PATCH', payload, options);
  }

  /**
   * Makes a module-scoped DELETE request
   */
  async moduleDelete<P extends PathsForRoute<TModuleName, 'DELETE', E>>(
    endpoint: P,
    payload?: RequestType<P, 'DELETE', E>,
    options?: RequestOptions
  ): Promise<request.Test> {
    return this.request(endpoint, 'DELETE', payload, options);
  }

  /**
   * Makes an authenticated module-scoped GET request
   */
  async moduleAuthenticatedGet<P extends PathsForRoute<TModuleName, 'GET', E>>(
    endpoint: P,
    token: string,
    payload?: RequestType<P, 'GET', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<request.Test> {
    return this.authenticatedRequest(endpoint, 'GET', token, payload, options);
  }

  /**
   * Makes an authenticated module-scoped POST request
   */
  async moduleAuthenticatedPost<P extends PathsForRoute<TModuleName, 'POST', E>>(
    endpoint: P,
    token: string,
    payload?: RequestType<P, 'POST', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<request.Test> {
    return this.authenticatedRequest(endpoint, 'POST', token, payload, options);
  }

  /**
   * Makes an authenticated module-scoped PUT request
   */
  async moduleAuthenticatedPut<P extends PathsForRoute<TModuleName, 'PUT', E>>(
    endpoint: P,
    token: string,
    payload?: RequestType<P, 'PUT', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<request.Test> {
    return this.authenticatedRequest(endpoint, 'PUT', token, payload, options);
  }

  /**
   * Makes an authenticated module-scoped PATCH request
   */
  async moduleAuthenticatedPatch<P extends PathsForRoute<TModuleName, 'PATCH', E>>(
    endpoint: P,
    token: string,
    payload?: RequestType<P, 'PATCH', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<request.Test> {
    return this.authenticatedRequest(endpoint, 'PATCH', token, payload, options);
  }

  /**
   * Makes an authenticated module-scoped DELETE request
   */
  async moduleAuthenticatedDelete<P extends PathsForRoute<TModuleName, 'DELETE', E>>(
    endpoint: P,
    token: string,
    payload?: RequestType<P, 'DELETE', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<request.Test> {
    return this.authenticatedRequest(endpoint, 'DELETE', token, payload, options);
  }

  /**
   * Build path with parameters
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
   * Creates test user data in the database
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

    return this.prisma.account.create({ data: userData });
  }

  /**
   * Creates test coach data in the database
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

    return this.prisma.account.create({ data: coachData });
  }

  /**
   * Creates test booking type data
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

    return this.prisma.bookingType.create({ data: bookingTypeData });
  }

  /**
   * Creates test session data
   */
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

    return this.prisma.session.create({ data: sessionData });
  }

  /**
   * Creates test time slot data
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

    return this.prisma.timeSlot.create({ data: timeSlotData });
  }

  /**
   * Creates test discount data
   */
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

    return this.prisma.discount.create({ data: discountData });
  }

  /**
   * Creates test message data
   */
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

    return this.prisma.message.create({ data: messageData });
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
   * Creates an expired JWT token
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
   * Creates multiple test users
   */
  async createTestUsers(count = 3): Promise<Account[]> {
    const users: Account[] = [];
    for (let i = 0; i < count; i++) {
      users.push(await this.createTestUser({ email: generateUniqueEmail(`test-user-${i}`) }));
    }
    return users;
  }

  /**
   * Creates multiple test coaches
   */
  async createTestCoaches(count = 3): Promise<Account[]> {
    const coaches: Account[] = [];
    for (let i = 0; i < count; i++) {
      coaches.push(await this.createTestCoach({ email: generateUniqueEmail(`test-coach-${i}`) }));
    }
    return coaches;
  }

  // Assertion helpers
  assertResponseStructure(response: any, expectedKeys: string[]): void {
    expect(response.body).toBeDefined();
    expectedKeys.forEach(key => expect(response.body).toHaveProperty(key));
  }

  assertSuccessResponse(response: any, expectedStatus = 200): void {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toBeDefined();
  }

  assertErrorResponse(response: any, expectedStatus: number, expectedMessage?: string): void {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toBeDefined();
    if (expectedMessage && !response.ok) {
      expect(response.body.message).toContain(expectedMessage);
    }
  }

  assertNotFound(response: any): void {
    expect(response.status).toBe(404);
    expect(response.body).toBeDefined();
  }

  assertUnauthorized(response: any): void {
    expect(response.status).toBe(401);
    expect(response.body).toBeDefined();
  }

  assertForbidden(response: any): void {
    expect(response.status).toBe(403);
    expect(response.body).toBeDefined();
  }

  async countRecords(model: string, where: any = {}): Promise<number> {
    return this.prisma[model].count({ where });
  }

  async findRecord(model: string, where: any): Promise<any> {
    return this.prisma[model].findFirst({ where });
  }

  async findRecords(model: string, where: any = {}): Promise<any[]> {
    return this.prisma[model].findMany({ where });
  }

  async updateRecord(model: string, where: any, data: any): Promise<any> {
    return this.prisma[model].update({ where, data });
  }

  async deleteRecord(model: string, where: any): Promise<any> {
    return this.prisma[model].delete({ where });
  }

  /**
   * Executes a database transaction for testing (public accessor)
   */
  async executeTransaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.withTransaction(callback);
  }

  /**
   * Assert that data exists in the database
   */
  async assertDataExists(model: string, where: any): Promise<void> {
    const record = await this.findRecord(model, where);
    expect(record).toBeDefined();
    expect(record).not.toBeNull();
  }

  /**
   * Assert that data does not exist in the database
   */
  async assertDataNotExists(model: string, where: any): Promise<void> {
    const record = await this.findRecord(model, where);
    expect(record).toBeNull();
  }

  /**
   * Wait for a condition to become true
   */
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

  /**
   * Wait for a database record to exist
   */
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
