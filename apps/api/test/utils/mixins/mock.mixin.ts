/**
 * Mock Mixin
 * Provides reusable mock creation and manipulation helpers
 * Eliminates duplication of mock setup logic
 */

/**
 * Bcrypt mock state for tracking hash operations
 */
export interface BcryptMockState {
  hashCounter: number;
  genSalt: jest.Mock;
  hash: jest.Mock;
  compare: jest.Mock;
}

/**
 * Redis mock service interface for MockMixin
 * NOTE: This is a jest.Mock-based interface for unit tests that need to verify mock calls.
 * For integration tests or when you don't need call verification, use MockRedisService
 * from @test-infrastructure which provides a simpler class-based implementation.
 */
export interface IMockRedisService {
  get: jest.Mock;
  set: jest.Mock;
  validate: jest.Mock;
  invalidate: jest.Mock;
  del: jest.Mock;
  ping: jest.Mock;
  quit: jest.Mock;
  getClient: jest.Mock;
  /** Internal store for testing - access via _store */
  _store: Map<string, { value: string; expiry?: number }>;
}

/**
 * Nodemailer mock transporter interface
 */
export interface MockNodemailerTransport {
  sendMail: jest.Mock;
  verify: jest.Mock;
}

/**
 * Nodemailer mock module interface
 */
export interface MockNodemailer {
  createTransport: jest.Mock;
  transport: MockNodemailerTransport;
}

/**
 * Mock Mixin
 * Handles creation and manipulation of Jest mocks
 * Provides utilities for creating and configuring mocks in tests
 */
export class MockMixin {
  /**
   * Creates a mock repository with common CRUD operations
   * @returns Mock repository object with Jest mock functions for all CRUD operations
   * @example
   * const mockRepo = test.mock.createMockRepository();
   * mockRepo.findMany.mockResolvedValue([{ id: '1', name: 'Test' }]);
   */
  createMockRepository(): Record<string, jest.Mock> {
    return {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    };
  }

  /**
   * Creates a mock PrismaService with all models
   * @returns Mock PrismaService with all database models and operations
   * @example
   * const mockPrisma = test.mock.createMockPrismaService();
   * test = new ServiceTest({
   *   serviceClass: MyService,
   *   mocks: [{ provide: PrismaService, useValue: mockPrisma }],
   * });
   */
  createMockPrismaService() {
    return {
      $connect: jest.fn() as jest.Mock,
      $disconnect: jest.fn() as jest.Mock,
      $transaction: jest.fn() as jest.Mock,
      $executeRaw: jest.fn() as jest.Mock,
      $queryRaw: jest.fn() as jest.Mock,
      $on: jest.fn() as jest.Mock,
      account: this.createMockRepository(),
      session: this.createMockRepository(),
      bookingType: this.createMockRepository(),
      timeSlot: this.createMockRepository(),
      discount: this.createMockRepository(),
      message: this.createMockRepository(),
      notification: this.createMockRepository(),
      payment: this.createMockRepository(),
      refreshToken: this.createMockRepository(),
    };
  }

  /**
   * Creates a generic mock service with specified methods
   * @param methods Array of method names to mock
   * @returns Mock service object with Jest mock functions for specified methods
   * @example
   * const mockService = test.mock.createMockService(['findAll', 'findOne', 'create']);
   * mockService.findAll.mockResolvedValue([]);
   */
  createMockService<T = any>(methods: string[]): Record<string, jest.Mock> & Partial<T> {
    const mockService: Record<string, jest.Mock> = {};
    for (const method of methods) {
      mockService[method] = jest.fn();
    }
    return mockService as Record<string, jest.Mock> & Partial<T>;
  }

  /**
   * Creates a mock configuration object
   * @param defaults Default configuration values
   * @param overrides Optional overrides for specific values
   * @returns Mock configuration object
   * @example
   * const mockConfig = test.mock.createMockConfig(
   *   { nodeEnv: 'test', port: 3000 },
   *   { port: 4000 }
   * );
   */
  createMockConfig<T extends Record<string, any>>(defaults: T, overrides: Partial<T> = {}): T {
    return {
      ...defaults,
      ...overrides,
    };
  }

  /**
   * Sets up a mock method to return specific data
   * Alias for mockResolvedValue for consistency with async operations
   * @param mockMethod The Jest mock to configure
   * @param returnValue The value to return
   * @example
   * test.mock.mockReturn(test.prisma.account.findMany, [{ id: '1' }]);
   */
  mockReturn<T>(mockMethod: jest.Mock | jest.MockInstance<any, any[]>, returnValue: T): void {
    mockMethod.mockResolvedValue(returnValue);
  }

  /**
   * Sets up a mock method to throw an error
   * Alias for mockRejectedValue for consistency with async operations
   * @param mockMethod The Jest mock to configure
   * @param error The error to throw (string or Error object)
   * @example
   * test.mock.mockThrow(test.prisma.account.findUnique, 'Not found');
   */
  mockThrow(mockMethod: jest.Mock | jest.MockInstance<any, any[]>, error: Error | string): void {
    const errorToThrow = typeof error === 'string' ? new Error(error) : error;
    mockMethod.mockRejectedValue(errorToThrow);
  }

  /**
   * Sets up a mock method to return different values on successive calls
   * @param mockMethod The Jest mock to configure
   * @param values Array of values to return in sequence
   * @example
   * test.mock.mockReturnSequence(mockMethod, [1, 2, 3]);
   * // First call returns 1, second returns 2, third returns 3
   */
  mockReturnSequence<T>(mockMethod: jest.Mock | jest.MockInstance<any, any[]>, values: T[]): void {
    for (const value of values) {
      mockMethod.mockResolvedValueOnce(value);
    }
  }

  /**
   * Sets up a mock method to fail on first call, then succeed on subsequent calls
   * Useful for testing retry logic
   * @param mockMethod The Jest mock to configure
   * @param error The error to throw on first call
   * @param successValue The value to return on subsequent calls
   * @example
   * test.mock.mockFailThenSucceed(mockMethod, new Error('Timeout'), { id: '1' });
   * // First call throws error, subsequent calls return success value
   */
  mockFailThenSucceed<T>(
    mockMethod: jest.Mock | jest.MockInstance<any, any[]>,
    error: Error | string,
    successValue: T
  ): void {
    const errorToThrow = typeof error === 'string' ? new Error(error) : error;
    mockMethod.mockRejectedValueOnce(errorToThrow).mockResolvedValue(successValue);
  }

  /**
   * Creates a type-safe spy on an object method
   * Wrapper around jest.spyOn with better typing
   * @param object The object to spy on
   * @param method The method name to spy on
   * @returns Jest spy instance
   * @example
   * const spy = test.mock.spyOn(myService, 'findAll');
   * spy.mockResolvedValue([]);
   */
  spyOn<T extends object, M extends keyof T>(object: T, method: M): jest.SpyInstance<any, any> {
    return jest.spyOn(object, method as any);
  }

  /**
   * Resets all mocks
   * Clears mock call history and implementations
   * @example
   * test.mock.resetMocks();
   */
  resetMocks(): void {
    jest.clearAllMocks();
  }

  /**
   * Restores all mocks to their original implementations
   * @example
   * test.mock.restoreMocks();
   */
  restoreMocks(): void {
    jest.restoreAllMocks();
  }

  /**
   * Creates test data for services
   * @param overrides Optional property overrides
   * @returns Basic test data object with id and timestamps
   * @example
   * const data = test.mock.createTestData({ name: 'Test User' });
   */
  createTestData(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      id: 'test-id',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Creates multiple test data items
   * @param count Number of items to create
   * @param overrides Optional property overrides for all items
   * @returns Array of test data objects
   * @example
   * const items = test.mock.createTestDataArray(5, { status: 'active' });
   */
  createTestDataArray(
    count = 3,
    overrides: Record<string, unknown> = {}
  ): Record<string, unknown>[] {
    return Array.from({ length: count }, (_, index) => ({
      ...this.createTestData(overrides),
      id: `test-id-${index + 1}`,
    }));
  }

  /**
   * Creates a partial object for testing updates
   * @param overrides Property overrides
   * @returns Partial data object with updatedAt timestamp
   * @example
   * const updateData = test.mock.createPartialData({ name: 'Updated Name' });
   */
  createPartialData(overrides: Record<string, any> = {}): Record<string, any> {
    return {
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Creates pagination parameters for testing
   * @param page Page number (1-indexed)
   * @param limit Items per page
   * @returns Pagination object with skip and take properties
   * @example
   * const pagination = test.mock.createPaginationParams(2, 20);
   * // Returns { skip: 20, take: 20 }
   */
  createPaginationParams(page = 1, limit = 10): { skip: number; take: number } {
    return {
      skip: (page - 1) * limit,
      take: limit,
    };
  }

  /**
   * Creates mock implementations for bcryptjs module
   * Use with jest.mock('bcryptjs') at the top of your test file
   *
   * @returns BcryptMockState with genSalt, hash, compare mocks and hashCounter
   * @example
   * ```typescript
   * import * as bcryptjs from 'bcryptjs';
   * jest.mock('bcryptjs');
   *
   * describe('BcryptService', () => {
   *   const mock = new MockMixin();
   *   let bcryptMocks: ReturnType<typeof mock.createMockBcrypt>;
   *
   *   beforeEach(() => {
   *     bcryptMocks = mock.createMockBcrypt();
   *     mock.setupBcryptMocks(bcryptjs, bcryptMocks);
   *   });
   * });
   * ```
   */
  createMockBcrypt(): BcryptMockState {
    const state: BcryptMockState = {
      hashCounter: 0,
      genSalt: jest.fn(),
      hash: jest.fn(),
      compare: jest.fn(),
    };

    state.genSalt.mockResolvedValue('$2a$10$mockedsalt');

    state.hash.mockImplementation((data: string) => {
      state.hashCounter++;
      return Promise.resolve(
        `$2a$10$hashed_${state.hashCounter}_${Buffer.from(data).toString('base64')}`
      );
    });

    state.compare.mockImplementation((data: string, encrypted: string) => {
      const parts = encrypted.split('_');
      if (parts.length >= 3) {
        const encodedData = parts.slice(2).join('_');
        const originalData = Buffer.from(encodedData, 'base64').toString();
        return Promise.resolve(data === originalData);
      }
      return Promise.resolve(false);
    });

    return state;
  }

  /**
   * Sets up bcryptjs module mocks with the provided mock state
   * Call this in beforeEach after creating mocks with createMockBcrypt()
   *
   * @param bcryptModule The imported bcryptjs module (import * as bcryptjs from 'bcryptjs')
   * @param mocks The mock state from createMockBcrypt()
   * @example
   * ```typescript
   * beforeEach(() => {
   *   bcryptMocks = mock.createMockBcrypt();
   *   mock.setupBcryptMocks(bcryptjs, bcryptMocks);
   * });
   * ```
   */
  setupBcryptMocks(
    bcryptModule: { genSalt: unknown; hash: unknown; compare: unknown },
    mocks: BcryptMockState
  ): void {
    (bcryptModule.genSalt as jest.Mock).mockImplementation(mocks.genSalt);
    (bcryptModule.hash as jest.Mock).mockImplementation(mocks.hash);
    (bcryptModule.compare as jest.Mock).mockImplementation(mocks.compare);
  }

  /**
   * Resets bcrypt mock state (counter and mock calls)
   * Call this in beforeEach to ensure clean state between tests
   *
   * @param mocks The mock state from createMockBcrypt()
   */
  resetBcryptMocks(mocks: BcryptMockState): void {
    mocks.hashCounter = 0;
    mocks.genSalt.mockClear();
    mocks.hash.mockClear();
    mocks.compare.mockClear();
  }

  /**
   * Creates a mock RedisService with in-memory store and jest.Mock methods
   * Simulates Redis behavior for unit tests without actual Redis connection
   *
   * NOTE: This creates a jest.Mock-based mock for verifying calls in unit tests.
   * For integration tests or simpler mocking, use MockRedisService from @test-infrastructure:
   * ```typescript
   * import { MockRedisService, createMockRedisProvider } from '@test-infrastructure';
   * ```
   *
   * @returns IMockRedisService with all methods and internal store
   * @example
   * ```typescript
   * const mockRedis = mock.createMockRedisServiceInterface();
   * // Use in test module
   * providers: [{ provide: RedisService, useValue: mockRedis }]
   *
   * // Test set/get
   * await mockRedis.set('key', 'value');
   * const result = await mockRedis.get('key');
   * expect(result).toBe('value');
   * expect(mockRedis.set).toHaveBeenCalledWith('key', 'value');
   * ```
   */
  createMockRedisService(): IMockRedisService {
    const store = new Map<string, { value: string; expiry?: number }>();

    const mockService: IMockRedisService = {
      _store: store,

      get: jest.fn().mockImplementation(async (key: string): Promise<string | null> => {
        const item = store.get(key);
        if (!item) return null;
        if (item.expiry && Date.now() > item.expiry) {
          store.delete(key);
          return null;
        }
        return item.value;
      }),

      set: jest
        .fn()
        .mockImplementation(
          async (key: string, value: string, ...args: unknown[]): Promise<'OK'> => {
            let expiry: number | undefined;
            if (args[0] === 'EX' && typeof args[1] === 'number') {
              expiry = Date.now() + (args[1] as number) * 1000;
            }
            store.set(key, { value, expiry });
            return 'OK';
          }
        ),

      validate: jest
        .fn()
        .mockImplementation(async (key: string, value: string): Promise<boolean> => {
          const item = store.get(key);
          if (!item) return false;
          if (item.expiry && Date.now() > item.expiry) {
            store.delete(key);
            return false;
          }
          return value === item.value;
        }),

      invalidate: jest.fn().mockImplementation(async (key: string): Promise<void> => {
        store.delete(key);
      }),

      del: jest.fn().mockImplementation(async (key: string): Promise<number> => {
        const existed = store.has(key);
        store.delete(key);
        return existed ? 1 : 0;
      }),

      ping: jest.fn().mockResolvedValue('PONG'),

      quit: jest.fn().mockImplementation(async (): Promise<'OK'> => {
        store.clear();
        return 'OK';
      }),

      getClient: jest.fn().mockReturnThis(),
    };

    return mockService;
  }

  /**
   * Resets the mock Redis service store
   * Call this in beforeEach to ensure clean state between tests
   *
   * @param mockRedis The mock Redis service from createMockRedisService()
   */
  resetMockRedisService(mockRedis: IMockRedisService): void {
    mockRedis._store.clear();
    mockRedis.get.mockClear();
    mockRedis.set.mockClear();
    mockRedis.validate.mockClear();
    mockRedis.invalidate.mockClear();
    mockRedis.del.mockClear();
    mockRedis.ping.mockClear();
    mockRedis.quit.mockClear();
    mockRedis.getClient.mockClear();
  }

  /**
   * Creates a mock nodemailer module
   * Use with jest.mock('nodemailer') at the top of your test file
   *
   * @returns MockNodemailer with createTransport and transport mocks
   * @example
   * ```typescript
   * jest.mock('nodemailer');
   *
   * describe('EmailService', () => {
   *   const mock = new MockMixin();
   *   let nodemailerMock: MockNodemailer;
   *
   *   beforeEach(() => {
   *     nodemailerMock = mock.createMockNodemailer();
   *     mock.setupNodemailerMocks(nodemailer, nodemailerMock);
   *   });
   *
   *   it('should send email', async () => {
   *     await service.sendEmail({ to: 'test@example.com', subject: 'Test' });
   *     expect(nodemailerMock.transport.sendMail).toHaveBeenCalled();
   *   });
   * });
   * ```
   */
  createMockNodemailer(): MockNodemailer {
    const transport: MockNodemailerTransport = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
      verify: jest.fn().mockResolvedValue(true),
    };

    return {
      createTransport: jest.fn().mockReturnValue(transport),
      transport,
    };
  }

  /**
   * Sets up nodemailer module mocks with the provided mock state
   * Call this in beforeEach after creating mocks with createMockNodemailer()
   *
   * @param nodemailerModule The imported nodemailer module
   * @param mocks The mock state from createMockNodemailer()
   */
  setupNodemailerMocks(
    nodemailerModule: { createTransport: unknown },
    mocks: MockNodemailer
  ): void {
    (nodemailerModule.createTransport as jest.Mock).mockImplementation(mocks.createTransport);
  }

  /**
   * Resets nodemailer mock state
   * Call this in beforeEach to ensure clean state between tests
   *
   * @param mocks The mock state from createMockNodemailer()
   */
  resetNodemailerMocks(mocks: MockNodemailer): void {
    mocks.createTransport.mockClear();
    mocks.transport.sendMail.mockClear();
    mocks.transport.verify.mockClear();
  }
}

// ============================================================================
// Test Data Creation (merged from MockDataMixin)
// ============================================================================

import { SessionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';

import {
  AccountMockFactory,
  BookingTypeMockFactory,
  DiscountMockFactory,
  MessageMockFactory,
  SessionMockFactory,
  TimeSlotMockFactory,
  type MockAccount,
  type MockBookingType,
  type MockDiscount,
  type MockMessage,
  type MockSession,
  type MockTimeSlot,
} from '../factories';

/**
 * Test scenario with related entities
 */
export interface TestScenario {
  user: MockAccount;
  coach: MockAccount;
  bookingType: MockBookingType;
  timeSlot: MockTimeSlot;
  session: MockSession;
}

/**
 * Booking scenario with optional discount
 */
export interface BookingScenario extends TestScenario {
  discount: MockDiscount | null;
}

/**
 * Conversation scenario with messages
 */
export interface ConversationScenario {
  user: MockAccount;
  coach: MockAccount;
  messages: MockMessage[];
}

/**
 * Test Data Factory
 *
 * Creates in-memory mock data objects for unit tests using the factory system.
 * Provides direct access to factory instances for clean API usage.
 *
 * Use this when you don't need real database records.
 * For real database records, use DatabaseMixin instead.
 *
 * @example
 * ```typescript
 * const factory = new TestDataFactory();
 *
 * // Direct access to factory methods
 * const user = factory.account.createUser({ bio: undefined });
 * const coach = factory.account.createCoach();
 * const session = factory.session.create();
 *
 * // Create related scenarios
 * const scenario = factory.createTestScenario();
 * ```
 */
export class TestDataFactory {
  // Compose factories for clean separation of concerns
  readonly account: AccountMockFactory;
  readonly bookingType: BookingTypeMockFactory;
  readonly timeSlot: TimeSlotMockFactory;
  readonly session: SessionMockFactory;
  readonly discount: DiscountMockFactory;
  readonly message: MessageMockFactory;

  constructor() {
    // Initialize mixins
    this.account = new AccountMockFactory();
    this.bookingType = new BookingTypeMockFactory();
    this.timeSlot = new TimeSlotMockFactory();
    this.session = new SessionMockFactory();
    this.discount = new DiscountMockFactory();
    this.message = new MessageMockFactory();
  }

  /**
   * Creates a complete test scenario with related entities
   * @param overrides Optional overrides for individual entities
   * @returns TestScenario with user, coach, bookingType, timeSlot, and session
   */
  createTestScenario(overrides?: {
    user?: MockAccount;
    coach?: MockAccount;
    bookingType?: MockBookingType;
    timeSlot?: MockTimeSlot;
    session?: MockSession;
  }): TestScenario {
    // Create coach first (needed for booking type and time slot)
    const coach = overrides?.coach ?? this.account.createCoach({ ...overrides?.coach });

    const user = overrides?.user ?? this.account.createUser({ ...overrides?.user });

    // Create booking type for this coach
    const bookingType =
      overrides?.bookingType ?? this.bookingType.createWithCoach(coach?.id, overrides?.bookingType);

    // Create time slot for this coach
    const timeSlot =
      overrides?.timeSlot ?? this.timeSlot.createWithCoach(coach?.id, overrides?.timeSlot);

    // Create session that connects everything together
    const sessionOverrides = {
      userId: user.id,
      coachId: coach.id,
      bookingTypeId: bookingType.id,
      timeSlotId: timeSlot.id,
      // Ensure session dateTime matches time slot
      dateTime: timeSlot.dateTime,
      // Set appropriate price based on booking type
      price: bookingType.basePrice,
      ...overrides?.session,
    };

    const session = overrides?.session ?? this.session.create(sessionOverrides);

    return { user, coach, bookingType, timeSlot, session };
  }

  /**
   * Creates a booking scenario with optional discount and payment state
   * @param options Configuration options for the scenario
   * @returns BookingScenario with all entities and optional discount
   */
  createBookingScenario(options?: {
    withDiscount?: boolean;
    discountAmount?: Decimal;
    sessionStatus?: SessionStatus;
    isPaid?: boolean;
    user?: MockAccount;
    coach?: MockAccount;
    bookingType?: MockBookingType;
    timeSlot?: MockTimeSlot;
    session?: MockSession;
  }): BookingScenario {
    // Create base scenario
    const scenario = this.createTestScenario({
      user: options?.user,
      coach: options?.coach,
      bookingType: options?.bookingType,
      timeSlot: options?.timeSlot,
      session: options?.session,
    });

    let discount: MockDiscount | null = null;

    // Create discount if requested
    if (options?.withDiscount) {
      // Use provided amount or default to 10% of session price (but not more than $50)
      const discountAmount =
        options.discountAmount ?? Decimal.min(scenario.session.price.mul(0.1), new Decimal(50));

      discount = this.discount.createWithCoach(scenario.coach.id, {
        amount: discountAmount,
        maxUsage: 10, // Allow multiple uses for testing
        useCount: 0,
      });

      // Apply discount to session
      scenario.session.discountId = discount.id;
      scenario.session.discountCode = discount.code;

      // Calculate discounted price (ensure it doesn't go below 0)
      scenario.session.price = Decimal.max(
        new Decimal(0),
        scenario.session.price.sub(discount.amount)
      );

      // Update discount usage
      discount.useCount += 1;
    }

    // Set session status
    if (options?.sessionStatus) {
      scenario.session.status = options.sessionStatus;

      // If completed, set appropriate timestamps
      if (options.sessionStatus === SessionStatus.COMPLETED) {
        scenario.session.updatedAt = new Date();
      }
    }

    // Handle payment state
    if (options?.isPaid !== undefined) {
      scenario.session.isPaid = options.isPaid;

      if (options.isPaid) {
        scenario.session.paymentId = `pay_${scenario.session.id}`;
        // If paid, status should be at least confirmed
        if (scenario.session.status === SessionStatus.SCHEDULED) {
          scenario.session.status = SessionStatus.CONFIRMED;
        }
      } else {
        scenario.session.paymentId = undefined;
      }
    }

    return { ...scenario, discount };
  }

  /**
   * Creates a conversation scenario with realistic message flow
   * @param options Configuration options for the conversation
   * @returns ConversationScenario with user, coach, and message array
   */
  createConversationScenario(options?: {
    messageCount?: number;
    conversationType?: 'support' | 'booking' | 'feedback' | 'general';
    user?: MockAccount;
    coach?: MockAccount;
    startTime?: Date;
  }): ConversationScenario {
    const messageCount = options?.messageCount ?? 5;
    // Create coach first (needed for booking type and time slot)
    const coach = options?.coach ?? this.account.createCoach({ ...options?.coach });

    const user = options?.user ?? this.account.createUser({ ...options?.user });

    // Create conversation with specific type
    const messages = this.message.createConversation(
      user.id,
      coach.id,
      messageCount,
      options?.conversationType,
      options?.startTime
    );

    return { user, coach, messages };
  }
}
