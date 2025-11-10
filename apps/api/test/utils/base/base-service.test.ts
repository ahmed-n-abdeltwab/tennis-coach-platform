/**
 * Abstract base class for service testing
 * Provides common patterns and utilities for testing NestJS services
 */

import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../src/app/prisma/prisma.service';

export abstract class BaseServiceTest<TService, TRepository = any> {
  protected service: TService;
  protected repository: TRepository;
  protected prisma: PrismaService;
  protected module: TestingModule;

  /**
   * Abstract method to setup the service and its dependencies
   * Must be implemented by concrete test classes
   */
  abstract setupService(): Promise<void>;

  /**
   * Abstract method to setup mocks for the service's dependencies
   * Must be implemented by concrete test classes
   */
  abstract setupMocks(): any;

  /**
   * Setup method called before each test
   * Creates the testing module and initializes the service
   */
  async setup(): Promise<void> {
    const mocks = this.setupMocks();

    this.module = await Test.createTestingModule({
      providers: [this.getServiceClass(), ...this.getProviders(), ...mocks],
    }).compile();

    await this.setupService();
  }

  /**
   * Cleanup method called after each test
   */
  async cleanup(): Promise<void> {
    if (this.module) {
      await this.module.close();
    }
  }

  /**
   * Abstract method to get the service class
   * Must be implemented by concrete test classes
   */
  abstract getServiceClass(): any;

  /**
   * Abstract method to get additional providers
   * Can be overridden by concrete test classes
   */
  getProviders(): any[] {
    return [];
  }

  /**
   * Creates a mock repository with common CRUD operations
   */
  protected createMockRepository(): any {
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
  protected createMockPrismaService(): Partial<PrismaService> {
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
      refreshToken: this.createMockRepository(),
      discount: this.createMockRepository(),
      message: this.createMockRepository(),
    };
  }

  /**
   * Creates test data for the service
   * Can be overridden by concrete test classes
   */
  protected createTestData(): any {
    return {
      id: 'test-id',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Creates multiple test data items
   */
  protected createTestDataArray(count = 3): any[] {
    return Array.from({ length: count }, (_, index) => ({
      ...this.createTestData(),
      id: `test-id-${index + 1}`,
    }));
  }

  /**
   * Asserts that a service method was called with expected arguments
   */
  protected assertMethodCalledWith(
    mockMethod: jest.Mock | jest.MockInstance<any, any>,
    expectedArgs: any[]
  ): void {
    expect(mockMethod).toHaveBeenCalledWith(...expectedArgs);
  }

  /**
   * Asserts that a service method was called a specific number of times
   */
  protected assertMethodCalledTimes(
    mockMethod: jest.Mock | jest.MockInstance<any, any>,
    expectedTimes: number
  ): void {
    expect(mockMethod).toHaveBeenCalledTimes(expectedTimes);
  }

  /**
   * Asserts that a service method returns expected data
   */
  protected assertMethodReturns(result: any, expectedData: any): void {
    expect(result).toEqual(expectedData);
  }

  /**
   * Asserts that a service method throws an expected error
   */
  protected async assertMethodThrows(
    methodCall: () => Promise<any>,
    expectedError: string | RegExp
  ): Promise<void> {
    await expect(methodCall()).rejects.toThrow(expectedError);
  }

  /**
   * Sets up a mock method to return specific data
   */
  protected mockMethodToReturn(
    mockMethod: jest.Mock | jest.MockInstance<any, any>,
    returnValue: any
  ): void {
    mockMethod.mockResolvedValue(returnValue);
  }

  /**
   * Sets up a mock method to throw an error
   */
  protected mockMethodToThrow(
    mockMethod: jest.Mock | jest.MockInstance<any, any>,
    error: Error | string
  ): void {
    const errorToThrow = typeof error === 'string' ? new Error(error) : error;
    mockMethod.mockRejectedValue(errorToThrow);
  }

  /**
   * Resets all mocks
   */
  protected resetMocks(): void {
    jest.clearAllMocks();
  }

  /**
   * Creates a partial object for testing updates
   */
  protected createPartialData(overrides: any = {}): any {
    return {
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Creates pagination parameters for testing
   */
  protected createPaginationParams(page = 1, limit = 10): any {
    return {
      skip: (page - 1) * limit,
      take: limit,
    };
  }

  /**
   * Creates filter parameters for testing
   */
  protected createFilterParams(filters: any = {}): any {
    return {
      where: filters,
    };
  }

  /**
   * Creates sorting parameters for testing
   */
  protected createSortParams(field: string, order: 'asc' | 'desc' = 'asc'): any {
    return {
      orderBy: {
        [field]: order,
      },
    };
  }

  /**
   * Creates include parameters for testing relations
   */
  protected createIncludeParams(relations: string[] | Record<string, any>): any {
    if (Array.isArray(relations)) {
      return {
        include: relations.reduce((acc, rel) => ({ ...acc, [rel]: true }), {}),
      };
    }
    return {
      include: relations,
    };
  }

  /**
   * Asserts that a mock was not called
   */
  protected assertMethodNotCalled(mockMethod: jest.Mock | jest.MockInstance<any, any>): void {
    expect(mockMethod).not.toHaveBeenCalled();
  }

  /**
   * Asserts that a service method returns an array
   */
  protected assertReturnsArray(result: any, minLength = 0): void {
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(minLength);
  }

  /**
   * Asserts that a service method returns null
   */
  protected assertReturnsNull(result: any): void {
    expect(result).toBeNull();
  }

  /**
   * Asserts that a service method returns undefined
   */
  protected assertReturnsUndefined(result: any): void {
    expect(result).toBeUndefined();
  }

  /**
   * Asserts that a result has specific properties
   */
  protected assertHasProperties(result: any, properties: string[]): void {
    expect(result).toBeDefined();
    properties.forEach(prop => {
      expect(result).toHaveProperty(prop);
    });
  }

  /**
   * Asserts that a result matches a partial object
   */
  protected assertMatchesPartial(result: any, partial: any): void {
    expect(result).toBeDefined();
    expect(result).toMatchObject(partial);
  }

  /**
   * Creates a mock that returns different values on successive calls
   */
  protected mockMethodToReturnSequence(
    mockMethod: jest.Mock | jest.MockInstance<any, any>,
    values: any[]
  ): void {
    values.forEach(value => {
      mockMethod.mockResolvedValueOnce(value);
    });
  }

  /**
   * Creates a mock that throws on first call then succeeds
   */
  protected mockMethodToFailThenSucceed(
    mockMethod: jest.Mock | jest.MockInstance<any, any>,
    error: Error | string,
    successValue: any
  ): void {
    const errorToThrow = typeof error === 'string' ? new Error(error) : error;
    mockMethod.mockRejectedValueOnce(errorToThrow);
    mockMethod.mockResolvedValueOnce(successValue);
  }

  /**
   * Verifies that a mock was called with partial arguments
   */
  protected assertMethodCalledWithPartial(
    mockMethod: jest.Mock | jest.MockInstance<any, any>,
    partialArgs: any
  ): void {
    expect(mockMethod).toHaveBeenCalled();
    const calls = mockMethod.mock.calls;
    const matchingCall = calls.find((call: any[]) =>
      call.some((arg: any) => {
        if (typeof arg === 'object' && arg !== null) {
          return Object.keys(partialArgs).every(key => arg[key] === partialArgs[key]);
        }
        return false;
      })
    );
    expect(matchingCall).toBeDefined();
  }

  /**
   * Gets the last call arguments of a mock
   */
  protected getLastCallArgs(mockMethod: jest.Mock | jest.MockInstance<any, any>): any[] {
    expect(mockMethod).toHaveBeenCalled();
    return mockMethod.mock.calls[mockMethod.mock.calls.length - 1];
  }

  /**
   * Gets the first call arguments of a mock
   */
  protected getFirstCallArgs(mockMethod: jest.Mock | jest.MockInstance<any, any>): any[] {
    expect(mockMethod).toHaveBeenCalled();
    return mockMethod.mock.calls[0];
  }
}
