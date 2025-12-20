/**
 * Service Test Implementation
 * Clean composition of mixins for service testing
 * Follows the pattern from tasks.md for consistent, simple testing
 *
 * @example
 * ```typescript
 * describe('SessionsService', () => {
 *   let service: SessionsService;
 *   let prisma: jest.Mocked<PrismaService>;
 *
 *   beforeEach(async () => {
 *     const { service: svc, prisma: p } = await createServiceTest({
 *       serviceClass: SessionsService,
 *       mockPrisma: {
 *         session: { create: jest.fn(), findMany: jest.fn() },
 *       },
 *     });
 *     service = svc;
 *     prisma = p;
 *   });
 *
 *   afterEach(() => {
 *     jest.clearAllMocks();
 *   });
 * });
 * ```
 */

import { Provider, Type } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

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
 * Configuration for the simplified createServiceTest function
 */
export interface CreateServiceTestConfig<TService> {
  /** The service class to test */
  serviceClass: Type<TService>;
  /** Custom mock for PrismaService - only include the models/methods you need */
  mockPrisma?: Partial<Record<string, Record<string, jest.Mock>>>;
  /** Additional mock providers for other dependencies */
  mocks?: Provider[];
  /** Additional providers */
  providers?: Provider[];
}

/**
 * Result from createServiceTest function
 */
export interface ServiceTestResult<TService> {
  /** The service instance being tested */
  service: TService;
  /** The mocked PrismaService */
  prisma: jest.Mocked<PrismaService>;
  /** The testing module (for advanced use cases) */
  module: TestingModule;
}

/**
 * Creates a service test setup following the tasks.md pattern.
 * This is the recommended approach for new tests.
 *
 * @example
 * ```typescript
 * describe('SessionsService', () => {
 *   let service: SessionsService;
 *   let prisma: jest.Mocked<PrismaService>;
 *
 *   beforeEach(async () => {
 *     const result = await createServiceTest({
 *       serviceClass: SessionsService,
 *       mockPrisma: {
 *         session: {
 *           create: jest.fn(),
 *           findMany: jest.fn(),
 *           findUnique: jest.fn(),
 *           update: jest.fn(),
 *           delete: jest.fn(),
 *         },
 *         bookingType: {
 *           findUnique: jest.fn(),
 *         },
 *       },
 *     });
 *     service = result.service;
 *     prisma = result.prisma;
 *   });
 *
 *   afterEach(() => {
 *     jest.clearAllMocks();
 *   });
 *
 *   it('should create a session', async () => {
 *     prisma.session.create.mockResolvedValue(mockSession);
 *     const result = await service.create(createDto);
 *     expect(result).toEqual(mockSession);
 *     expect(prisma.session.create).toHaveBeenCalledWith({ data: expect.any(Object) });
 *   });
 * });
 * ```
 */
export async function createServiceTest<TService>(
  config: CreateServiceTestConfig<TService>
): Promise<ServiceTestResult<TService>> {
  const mockPrisma = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn(),
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
    ...config.mockPrisma,
  };

  const module = await Test.createTestingModule({
    providers: [
      config.serviceClass,
      {
        provide: PrismaService,
        useValue: mockPrisma,
      },
      ...(config.mocks ?? []),
      ...(config.providers ?? []),
    ],
  }).compile();

  const service = module.get<TService>(config.serviceClass);
  const prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;

  return { service, prisma, module };
}

/**
 * Service Test Class (Legacy)
 * Provides service testing capabilities through composition.
 * For new tests, consider using createServiceTest() function instead.
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
    this._module = await Test.createTestingModule({
      providers: [
        this.config.serviceClass,
        ...(this.config.providers ?? []),
        ...(this.config.mocks ?? []),
      ],
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
   * Cleanup method - closes module and clears all mocks
   */
  async cleanup(): Promise<void> {
    jest.clearAllMocks();
    if (this._module) {
      await this._module.close();
    }
  }
}
