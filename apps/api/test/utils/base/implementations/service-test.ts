/**
 * Service Test Implementation
 * Clean composition of mixins for service testing
 * Replaces the monolithic BaseServiceTest
 */

import { Provider, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { PrismaService } from '../../../../src/app/prisma/prisma.service';
import { BaseTest } from '../core/base-test';
import { AssertionsMixin } from '../mixins/assertions.mixin';
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
  readonly assert: AssertionsMixin;

  constructor(config: ServiceTestConfig<TService>) {
    super();
    this.config = config;

    // Initialize mixins
    this.mock = new MockMixin();
    this.assert = new AssertionsMixin();
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
}
