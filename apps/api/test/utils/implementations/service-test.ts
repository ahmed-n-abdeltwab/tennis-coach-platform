/**
 * Service Test Implementation
 *
 * Providers are auto deep-mocked unless a custom useValue is provided.
 * Define a TMocks interface for full IntelliSense on `test.mocks.ClassName`.
 *
 * @module test-utils/implementations/service-test
 *
 * @example
 * ```typescript
 * interface Mocks {
 *   SessionsService: DeepMocked<SessionsService>;
 *   PrismaService: { session: { update: jest.Mock } };
 * }
 *
 * describe('CalendarService', () => {
 *   let test = new ServiceTest<CalendarService, Mocks>({
 *     service: CalendarService,
 *     providers: [
 *       SessionsService,
 *       { provide: PrismaService, useValue: { session: { update: jest.fn() } } },
 *     ],
 *   });
 *
 *   beforeEach(async () => {
 *     await test.setup();
 *   });
 *
 *   afterEach(async () => {
 *     await test.cleanup();
 *   });
 *
 *   it('should work', async () => {
 *     test.mocks.SessionsService.findOne.mockResolvedValue(mockSession);
 *     test.mocks.PrismaService.session.update.mockResolvedValue(updated);
 *   });
 * });
 * ```
 */

import { Provider, Type } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { BaseTest } from '../core/base-test';
import { AssertionsMixin } from '../mixins/assertions.mixin';
import { FactoryMixin } from '../mixins/factory.mixin';
import { buildProviders, MockProvider } from '../mixins/mock.mixin';

// ============================================================================
// Types
// ============================================================================

export interface ServiceTestConfig<TService> {
  /** The service class to test. */
  service: Type<TService>;

  /**
   * Providers for the service dependencies.
   * - Class types are automatically deep-mocked
   * - Objects with { provide, useValue } use the custom mock
   */
  providers?: readonly MockProvider[];
}

// ============================================================================
// ServiceTest Class
// ============================================================================

/**
 * Service Test Class
 *
 * @template TService The service class being tested
 * @template TMocks Interface defining the mocks shape for IntelliSense
 */
export class ServiceTest<TService, TMocks = Record<string, unknown>> extends BaseTest {
  private config: ServiceTestConfig<TService>;
  private _service!: TService;
  private _mocks!: TMocks;

  /** Assertion helpers for validating test results. */
  readonly assert: AssertionsMixin;

  /** Factory for creating in-memory mock data objects. */
  readonly factory: FactoryMixin;

  constructor(config: ServiceTestConfig<TService>) {
    super();
    this.config = config;
    this.assert = new AssertionsMixin();
    this.factory = new FactoryMixin();
  }

  /** The service instance being tested. */
  get service(): TService {
    if (!this._service) {
      throw new Error('Service not initialized. Call setup() first.');
    }
    return this._service;
  }

  /** Type-safe mocks accessible by class name. Define TMocks interface for IntelliSense. */
  get mocks(): TMocks {
    if (!this._mocks) {
      throw new Error('Mocks not initialized. Call setup() first.');
    }
    return this._mocks;
  }

  /** The NestJS testing module. */
  get module(): TestingModule {
    if (!this._module) {
      throw new Error('Module not initialized. Call setup() first.');
    }
    return this._module;
  }

  /** Setup - creates testing module and initializes service. */
  async setup(): Promise<void> {
    const moduleProviders: Provider[] = [this.config.service];

    if (this.config.providers && this.config.providers.length > 0) {
      const { providers, mocks } = buildProviders(this.config.providers);
      moduleProviders.push(...providers);
      this._mocks = mocks as TMocks;
    } else {
      this._mocks = {} as TMocks;
    }

    this._module = await Test.createTestingModule({
      providers: moduleProviders,
    }).compile();

    this._service = this._module.get<TService>(this.config.service);
  }

  /** Cleanup - closes module and clears all mocks. */
  async cleanup(): Promise<void> {
    jest.clearAllMocks();
    if (this._module) {
      await this._module.close();
    }
  }
}
