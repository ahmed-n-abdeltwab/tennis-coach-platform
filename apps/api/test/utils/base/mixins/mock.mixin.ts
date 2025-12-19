/**
 * Mock Mixin
 * Provides reusable mock creation and manipulation helpers
 * Eliminates duplication of mock setup logic
 */

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
      account: this.createMockRepository(),
      session: this.createMockRepository(),
      bookingType: this.createMockRepository(),
      timeSlot: this.createMockRepository(),
      discount: this.createMockRepository(),
      message: this.createMockRepository(),
      notification: this.createMockRepository(),
      payment: this.createMockRepository(),
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
}
