/**
 * Improved base class for service testing
 * Automatically provides type-safe accessors and helper methods
 *
 * Usage:
 * ```typescript
 * const test = new BaseServiceTest({
 *   serviceClass: BookingTypesService,
 *   mocks: [
 *     { provide: PrismaService, useValue: mockPrismaService },
 *   ],
 * });
 *
 * await test.setup();
 * const result = await test.service.findAll();
 * test.prisma.bookingType.findMany.mockResolvedValue([...]);
 * ```
 */

import { Provider } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../src/app/prisma/prisma.service';

export interface ServiceTestConfig<TService> {
  /** The service class to test */
  serviceClass: new (...args: any[]) => TService;
  /** Mock providers for dependencies */
  mocks?: Provider[];
  /** Additional providers */
  providers?: Provider[];
}

export class BaseServiceTest<TService, TRepository = PrismaService> {
  private _service!: TService;
  private _repository!: TRepository;
  private _prisma!: PrismaService;
  private _module!: TestingModule;
  private config: ServiceTestConfig<TService>;

  constructor(config: ServiceTestConfig<TService>) {
    this.config = config;
  }

  /**
   * Public accessor for the service being tested
   */
  get service(): TService {
    return this._service;
  }

  /**
   * Public accessor for the repository (usually PrismaService, returns mocked version)
   */
  get repository(): any {
    return this._repository;
  }

  /**
   * Public accessor for PrismaService (returns the mocked version)
   */
  get prisma(): any {
    return this._prisma;
  }

  /**
   * Public accessor for the testing module
   */
  get module(): TestingModule {
    return this._module;
  }

  /**
   * Setup method called before each test
   * Creates the testing module and initializes the service
   */
  async setup(): Promise<void> {
    const providers = [
      this.config.serviceClass,
      ...(this.config.providers ?? []),
      ...(this.config.mocks ?? []),
    ];

    this._module = await Test.createTestingModule({
      providers,
    }).compile();

    this._service = this._module.get<TService>(this.config.serviceClass);

    // Try to get PrismaService if it exists in the module
    try {
      this._prisma = this._module.get<PrismaService>(PrismaService);
      this._repository = this._prisma as unknown as TRepository;
    } catch {
      // PrismaService not provided, that's okay
    }
  }

  /**
   * Cleanup method called after each test
   */
  async cleanup(): Promise<void> {
    if (this._module) {
      await this._module.close();
    }
  }

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
   * Creates test data for the service
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

  /**
   * Asserts that a mock was not called
   */
  assertNotCalled(mockMethod: jest.Mock | jest.MockInstance<any, any[]>): void {
    expect(mockMethod).not.toHaveBeenCalled();
  }

  /**
   * Asserts that a service method returns an array
   */
  assertReturnsArray<T>(result: T[], minLength = 0): void {
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(minLength);
  }
}
