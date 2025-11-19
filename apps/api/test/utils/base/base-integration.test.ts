/**
 * Abstract base class for integration testing
 * Provides database setup, cleanup, and common integration testing patterns
 * Enhanced with type-safe HTTP methods using routes-helpers type utilities
 */

import { INestApplication, Provider } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import {
  Account,
  BookingType,
  Discount,
  Message,
  Prisma,
  RefreshToken,
  Role,
  Session,
  TimeSlot,
} from '@prisma/client';
import type {
  DeepPartial,
  Endpoints,
  ExtractMethods,
  ExtractPaths,
  ExtractRequestType,
  ExtractResponseType,
  PathsWithMethod,
} from '@test-utils';
import { buildPath } from '@test-utils';
import request from 'supertest';

import { PrismaService } from '../../../src/app/prisma/prisma.service';
import { JwtPayload } from '../auth/auth-test-helper';
import { cleanDatabase, seedTestDatabase } from '../database/database-helpers';
import type { RequestOptions, SuccessResponse, TypedResponse } from '../http/type-safe-http-client';

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

    // Only get PrismaService if it's available in the module
    try {
      this.prisma = this.module.get<PrismaService>(PrismaService, { strict: false });
    } catch {
      // PrismaService not available, skip database setup
    }

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
  createTestJwtToken(
    payload: Partial<JwtPayload> = {
      sub: 'test-user-id',
      email: 'test@example.com',
      role: Role.USER,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    }
  ): string {
    const jwtService = new JwtService({
      secret: process.env.JWT_SECRET ?? 'test-secret',
      signOptions: { expiresIn: '1h' },
    });
    return jwtService.sign(payload);
  }

  /**
   * Creates Authorization headers for HTTP requests
   */
  protected createAuthHeaders(token?: string): { Authorization: string } {
    const authToken = token ?? this.createTestJwtToken();
    return {
      Authorization: `Bearer ${authToken}`,
    };
  }

  /**
   * Makes an authenticated GET request
   */
  authenticatedGet(endpoint: string, token?: string): request.Test {
    return request(this.app.getHttpServer())
      .get(`/api${endpoint}`)
      .set(this.createAuthHeaders(token));
  }

  /**
   * Makes an authenticated POST request
   */
  authenticatedPost(endpoint: string, data?: any, token?: string): request.Test {
    return request(this.app.getHttpServer())
      .post(`/api${endpoint}`)
      .set(this.createAuthHeaders(token))
      .send(data ?? {});
  }

  /**
   * Makes an authenticated PUT request
   */
  authenticatedPut(endpoint: string, data?: any, token?: string): request.Test {
    return request(this.app.getHttpServer())
      .put(`/api${endpoint}`)
      .set(this.createAuthHeaders(token))
      .send(data ?? {});
  }

  /**
   * Makes an authenticated DELETE request
   */
  authenticatedDelete(endpoint: string, token?: string): request.Test {
    return request(this.app.getHttpServer())
      .delete(`/api${endpoint}`)
      .set(this.createAuthHeaders(token));
  }

  /**
   * Makes an unauthenticated GET request
   */
  get(endpoint: string): request.Test {
    return request(this.app.getHttpServer()).get(`/api${endpoint}`);
  }

  /**
   * Makes an unauthenticated POST request
   */
  post(endpoint: string, data?: any): request.Test {
    return request(this.app.getHttpServer())
      .post(`/api${endpoint}`)
      .send(data ?? {});
  }

  // ============================================================================
  // Type-Safe HTTP Methods (Enhanced with routes-helpers type utilities)
  // ============================================================================

  /**
   * Build path with parameters (replace {id} with actual values)
   * @private
   */
  private buildPathWithParams(path: string, data?: Record<string, any>): string {
    if (!data || typeof data !== 'object') return path;
    return buildPath(path, data);
  }

  /**
   * Make a type-safe request to any endpoint
   *
   * This is the core method that provides full type safety for path, method, request data, and response.
   *
   * @template P - The API path (must exist in Endpoints)
   * @template M - The HTTP method (must be supported by the path)
   * @param path - The API endpoint path
   * @param method - The HTTP method
   * @param data - Request data (body for POST/PUT/PATCH, params for GET/DELETE)
   * @param options - Additional request options
   * @returns Typed response with proper response body type
   *
   * @example
   * ```typescript
   * const response = await this.typeSafeRequest('/api/sessions', 'GET');
   * if (response.ok) {
   *   console.log(response.body); // Typed as Session[]
   * }
   * ```
   */
  protected async typeSafeRequest<
    E extends Record<string, any> = Endpoints,
    P extends ExtractPaths<E> = ExtractPaths<E>,
    M extends ExtractMethods<E, P> = ExtractMethods<E, P>,
  >(
    path: P,
    method: M,
    data?: DeepPartial<ExtractRequestType<E, P, M>>,
    options: RequestOptions = {}
  ): Promise<TypedResponse<ExtractResponseType<E, P, M>>> {
    // Build path with parameters if needed
    const builtPath = this.buildPathWithParams(path, data);

    // Create supertest request
    const normalizedMethod = method.toLowerCase() as Lowercase<M>;
    let req = request(this.app.getHttpServer())[normalizedMethod](builtPath);

    // Add headers
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        req = req.set(key, value);
      });
    }

    // Add data for requests
    if (data != null) {
      if (method === 'GET') req = req.query(data);
      else req = req.send(data);
    }

    // Set timeout
    if (options.timeout) {
      req = req.timeout(options.timeout);
    }

    // Set expected status
    if (options.expectedStatus) {
      req = req.expect(options.expectedStatus);
    }

    const response = await req;

    // Determine if response is success (2xx) or error (4xx/5xx)
    const isSuccess = response.status >= 200 && response.status < 300;

    if (isSuccess) {
      return {
        status: response.status as SuccessResponse<any>['status'],
        body: response.body as ExtractResponseType<E, P, M>,
        headers: response.headers as Record<string, string>,
        ok: true,
      } as TypedResponse<ExtractResponseType<E, P, M>>;
    } else {
      return {
        status: response.status,
        body: response.body,
        headers: response.headers as Record<string, string>,
        ok: false,
      } as TypedResponse<ExtractResponseType<E, P, M>>;
    }
  }

  /**
   * Type-safe GET request
   *
   * @template P - The API path (must support GET method)
   * @param path - The API endpoint path
   * @param params - Query parameters or path parameters
   * @param options - Additional request options
   * @returns Typed response with discriminated union
   *
   * @example
   * ```typescript
   * const response = await this.typeSafeGet('/api/accounts/me');
   * if (response.ok) {
   *   console.log(response.body.id); // Fully typed
   * } else {
   *   console.error(response.body.message); // Error response
   * }
   * ```
   */
  async typeSafeGet<
    E extends Record<string, any> = Endpoints,
    P extends PathsWithMethod<E, 'GET'> = PathsWithMethod<E, 'GET'>,
  >(
    path: P,
    params?: DeepPartial<ExtractRequestType<E, P, 'GET'>>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'GET'>>> {
    return this.typeSafeRequest(path, 'GET' as ExtractMethods<E, P>, params, options);
  }

  /**
   * Type-safe POST request
   *
   * @template P - The API path (must support POST method)
   * @param path - The API endpoint path
   * @param body - Request body
   * @param options - Additional request options
   * @returns Typed response with discriminated union
   *
   * @example
   * ```typescript
   * const response = await this.typeSafePost('/api/authentication/user/login', {
   *   email: 'user@example.com',
   *   password: 'password123'
   * });
   * if (response.ok) {
   *   console.log(response.body.accessToken);
   * }
   * ```
   */
  async typeSafePost<
    E extends Record<string, any> = Endpoints,
    P extends PathsWithMethod<E, 'POST'> = PathsWithMethod<E, 'POST'>,
  >(
    path: P,
    body?: DeepPartial<ExtractRequestType<E, P, 'POST'>>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'POST'>>> {
    return this.typeSafeRequest(path, 'POST' as ExtractMethods<E, P>, body, options);
  }

  /**
   * Type-safe PUT request
   */
  async typeSafePut<
    E extends Record<string, any> = Endpoints,
    P extends PathsWithMethod<E, 'PUT'> = PathsWithMethod<E, 'PUT'>,
  >(
    path: P,
    body?: DeepPartial<ExtractRequestType<E, P, 'PUT'>>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'PUT'>>> {
    return this.typeSafeRequest(path, 'PUT' as ExtractMethods<E, P>, body, options);
  }

  /**
   * Type-safe PATCH request
   */
  async typeSafePatch<
    E extends Record<string, any> = Endpoints,
    P extends PathsWithMethod<E, 'PATCH'> = PathsWithMethod<E, 'PATCH'>,
  >(
    path: P,
    body?: DeepPartial<ExtractRequestType<E, P, 'PATCH'>>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'PATCH'>>> {
    return this.typeSafeRequest(path, 'PATCH' as ExtractMethods<E, P>, body, options);
  }

  /**
   * Type-safe DELETE request
   */
  async typeSafeDelete<
    E extends Record<string, any> = Endpoints,
    P extends PathsWithMethod<E, 'DELETE'> = PathsWithMethod<E, 'DELETE'>,
  >(
    path: P,
    params?: DeepPartial<ExtractRequestType<E, P, 'DELETE'>>,
    options?: RequestOptions
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'DELETE'>>> {
    return this.typeSafeRequest(path, 'DELETE' as ExtractMethods<E, P>, params, options);
  }

  /**
   * Type-safe authenticated GET request
   *
   * @template P - The API path (must support GET method)
   * @param path - The API endpoint path
   * @param token - JWT authentication token
   * @param params - Query parameters or path parameters
   * @param options - Additional request options (headers will be merged with auth header)
   * @returns Typed response with discriminated union
   *
   * @example
   * ```typescript
   * const token = this.createTestJwtToken();
   * const response = await this.typeSafeAuthenticatedGet('/api/sessions', token);
   * if (response.ok) {
   *   console.log(response.body); // Typed as Session[]
   * }
   * ```
   */
  async typeSafeAuthenticatedGet<
    E extends Record<string, any> = Endpoints,
    P extends PathsWithMethod<E, 'GET'> = PathsWithMethod<E, 'GET'>,
  >(
    path: P,
    token: string,
    params?: DeepPartial<ExtractRequestType<E, P, 'GET'>>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'GET'>>> {
    return this.typeSafeGet(path, params, {
      ...options,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Type-safe authenticated POST request
   */
  async typeSafeAuthenticatedPost<
    E extends Record<string, any> = Endpoints,
    P extends PathsWithMethod<E, 'POST'> = PathsWithMethod<E, 'POST'>,
  >(
    path: P,
    token: string,
    body?: DeepPartial<ExtractRequestType<E, P, 'POST'>>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'POST'>>> {
    return this.typeSafePost(path, body, {
      ...options,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Type-safe authenticated PUT request
   */
  async typeSafeAuthenticatedPut<
    E extends Record<string, any> = Endpoints,
    P extends PathsWithMethod<E, 'PUT'> = PathsWithMethod<E, 'PUT'>,
  >(
    path: P,
    token: string,
    body?: DeepPartial<ExtractRequestType<E, P, 'PUT'>>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'PUT'>>> {
    return this.typeSafePut(path, body, {
      ...options,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Type-safe authenticated PATCH request
   */
  async typeSafeAuthenticatedPatch<
    E extends Record<string, any> = Endpoints,
    P extends PathsWithMethod<E, 'PATCH'> = PathsWithMethod<E, 'PATCH'>,
  >(
    path: P,
    token: string,
    body?: DeepPartial<ExtractRequestType<E, P, 'PATCH'>>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'PATCH'>>> {
    return this.typeSafePatch(path, body, {
      ...options,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Type-safe authenticated DELETE request
   */
  async typeSafeAuthenticatedDelete<
    E extends Record<string, any> = Endpoints,
    P extends PathsWithMethod<E, 'DELETE'> = PathsWithMethod<E, 'DELETE'>,
  >(
    path: P,
    token: string,
    params?: DeepPartial<ExtractRequestType<E, P, 'DELETE'>>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<TypedResponse<ExtractResponseType<E, P, 'DELETE'>>> {
    return this.typeSafeDelete(path, params, {
      ...options,
      headers: { Authorization: `Bearer ${token}` },
    });
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
  async createTestCoach(overrides: Partial<Account> = {}): Promise<Account> {
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
  async createTestBookingType(overrides: Partial<BookingType> = {}): Promise<BookingType> {
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
  async createTestSession(overrides: Partial<Session> = {}): Promise<Session> {
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
  async createTestTimeSlot(overrides: Partial<TimeSlot> = {}): Promise<TimeSlot> {
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
      this.createTestJwtToken({
        sub: overrides.accountId ?? account.id,
        email: account.email,
      });
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

  /**
   * Finds a single record in the database
   */
  async findRecord(model: string, where: any): Promise<any> {
    return this.prisma[model].findFirst({ where });
  }

  /**
   * Finds multiple records in the database
   */
  protected async findRecords(model: string, where: any = {}): Promise<any[]> {
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
  protected async deleteRecord(model: string, where: any): Promise<any> {
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
  assertArrayLength(response: any, expectedLength: number): void {
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
  protected extractField<T = any>(response: any, fieldPath: string): T {
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
  protected createRoleToken(role: Role, overrides?: Partial<JwtPayload>): string {
    return this.createTestJwtToken({
      sub: `test-${role.toLowerCase()}-id`,
      email: `test-${role.toLowerCase()}@example.com`,
      role,
      ...overrides,
    });
  }

  /**
   * Creates an expired JWT token for testing authentication failures
   */
  protected createExpiredToken(payload?: Partial<JwtPayload>): string {
    const jwtService = new JwtService({
      secret: process.env.JWT_SECRET ?? 'test-secret',
      signOptions: { expiresIn: '-1h' }, // Expired 1 hour ago
    });
    return jwtService.sign({
      sub: 'test-user-id',
      email: 'test@example.com',
      role: Role.USER,
      ...payload,
    });
  }

  /**
   * Creates multiple test users with different roles
   */
  protected async createTestUsers(count = 3): Promise<Account[]> {
    const users: Account[] = [];
    for (let i = 0; i < count; i++) {
      users.push(
        await this.createTestUser({
          email: `test-user-${Date.now()}-${i}@example.com`,
        })
      );
    }
    return users;
  }

  /**
   * Creates multiple test coaches
   */
  protected async createTestCoaches(count = 3): Promise<Account[]> {
    const coaches: Account[] = [];
    for (let i = 0; i < count; i++) {
      coaches.push(
        await this.createTestCoach({
          email: `test-coach-${Date.now()}-${i}@example.com`,
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
    timeout = 5000,
    interval = 100
  ): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error('Condition not met within timeout');
  }

  /**
   * Waits for a database record to exist
   */
  protected async waitForRecord(model: string, where: any, timeout = 5000): Promise<any> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const record = await this.findRecord(model, where);
      if (record) {
        return record;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Record not found in ${model} within timeout`);
  }
}
