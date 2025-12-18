/**
 * Mock Mixin
 * Provides reusable mock creation and manipulation helpers
 * Eliminates duplication of mock setup logic
 */

/**
 * Mock Mixin
 * Handles creation and manipulation of Jest mocks
 */
export class MockMixin {
  /**
   * Creates a mock repository with common CRUD operations
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
   * Creates a mock PrismaService
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
   * Sets up a mock method to return specific data
   */
  mockReturn<T>(mockMethod: jest.Mock | jest.MockInstance<any, any[]>, returnValue: T): void {
    mockMethod.mockResolvedValue(returnValue);
  }

  /**
   * Sets up a mock method to throw an error
   */
  mockThrow(mockMethod: jest.Mock | jest.MockInstance<any, any[]>, error: Error | string): void {
    const errorToThrow = typeof error === 'string' ? new Error(error) : error;
    mockMethod.mockRejectedValue(errorToThrow);
  }

  /**
   * Resets all mocks
   */
  resetMocks(): void {
    jest.clearAllMocks();
  }

  /**
   * Creates test data for services
   */
  createTestData(): Record<string, unknown> {
    return {
      id: 'test-id',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Creates multiple test data items
   */
  createTestDataArray(count = 3): Record<string, unknown>[] {
    return Array.from({ length: count }, (_, index) => ({
      ...this.createTestData(),
      id: `test-id-${index + 1}`,
    }));
  }

  /**
   * Creates a partial object for testing updates
   */
  createPartialData(overrides: Record<string, any> = {}): Record<string, any> {
    return {
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Creates pagination parameters for testing
   */
  createPaginationParams(page = 1, limit = 10): { skip: number; take: number } {
    return {
      skip: (page - 1) * limit,
      take: limit,
    };
  }
}
