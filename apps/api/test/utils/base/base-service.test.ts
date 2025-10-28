/**
 * Abstract base class for service testing
 * Provides common patterns and utilities for testing NestJS services
 */

import { PrismaService } from '@app/prisma/prisma.service';
import { Test, TestingModule } from '@nestjs/testing';

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
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      $transaction: jest.fn(),
      $executeRaw: jest.fn(),
      $queryRaw: jest.fn(),
      user: this.createMockRepository(),
      coach: this.createMockRepository(),
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
  protected createTestDataArray(count: number = 3): any[] {
    return Array.from({ length: count }, (_, index) => ({
      ...this.createTestData(),
      id: `test-id-${index + 1}`,
    }));
  }

  /**
   * Asserts that a service method was called with expected arguments
   */
  protected assertMethodCalledWith(mockMethod: jest.Mock, expectedArgs: any[]): void {
    expect(mockMethod).toHaveBeenCalledWith(...expectedArgs);
  }

  /**
   * Asserts that a service method was called a specific number of times
   */
  protected assertMethodCalledTimes(mockMethod: jest.Mock, expectedTimes: number): void {
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
  protected mockMethodToReturn(mockMethod: jest.Mock, returnValue: any): void {
    mockMethod.mockResolvedValue(returnValue);
  }

  /**
   * Sets up a mock method to throw an error
   */
  protected mockMethodToThrow(mockMethod: jest.Mock, error: Error | string): void {
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
  protected createPaginationParams(page: number = 1, limit: number = 10): any {
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
}
