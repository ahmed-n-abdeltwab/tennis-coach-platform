/**
 * Service Test Implementation
 * Clean composition of mixins for service testing
 * Replaces the monolithic BaseServiceTest
 */

import { Provider, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { PrismaService } from '../../../../src/app/prisma/prisma.service';
import { BaseTest } from '../core/base-test';
import { MockMixin } from '../mixins/mock.mixin';

/**
 * Type helper to convert all methods of a type to Jest mocks
 */
type DeepMocked<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? jest.MockedFunction<T[K]>
    : T[K] extends object
      ? DeepMocked<T[K]>
      : T[K];
} & T;

export interface ServiceTestConfig<TService> {
  /** The service class to test */
  serviceClass: Type<TService>;
  /** Mock providers for dependencies */
  mocks?: Provider[];
  /** Additional providers */
  providers?: Provider[];
}

/**
 * Service Test Class
 * Provides service testing capabilities through composition
 */
export class ServiceTest<TService, TRepository = PrismaService> extends BaseTest {
  private config: ServiceTestConfig<TService>;
  private _service!: TService;
  private _repository!: TRepository;
  private _prisma!: PrismaService;

  // Compose mixins for clean separation of concerns
  readonly mock: MockMixin;

  constructor(config: ServiceTestConfig<TService>) {
    super();
    this.config = config;

    // Initialize mixins
    this.mock = new MockMixin();
  }

  /**
   * Public accessor for the service being tested
   */
  get service(): TService {
    if (!this._service) {
      throw new Error('Service not initialized. Call setup() first.');
    }
    return this._service;
  }

  /**
   * Public accessor for the repository (usually PrismaService, returns mocked version)
   */
  get repository(): DeepMocked<TRepository> {
    return this._repository as DeepMocked<TRepository>;
  }

  /**
   * Public accessor for PrismaService (returns the mocked version with Jest mocks)
   * Use this to access mocked Prisma methods like: test.prisma.session.findMany.mockResolvedValue(...)
   *
   * Note: When mocking Prisma return values, you may need to cast complex objects as `as any`
   * to avoid TypeScript errors with Prisma's generated types.
   */
  get prisma(): DeepMocked<PrismaService> {
    return this._prisma as DeepMocked<PrismaService>;
  }

  /**
   * Setup method - creates testing module and initializes service
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
      this._prisma = this._module.get<PrismaService>(PrismaService, { strict: false });
      this._repository = this._prisma as unknown as TRepository;
    } catch {
      // PrismaService not provided, that's okay
    }
  }

  /**
   * Cleanup method - closes module
   */
  async cleanup(): Promise<void> {
    if (this._module) {
      await this._module.close();
    }
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
