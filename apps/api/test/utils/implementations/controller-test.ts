/**
 * Controller Test Implementation
 *
 * Providers are auto deep-mocked unless a custom useValue is provided.
 * Define a TMocks interface for full IntelliSense on `test.mocks.ClassName`.
 *
 * @module test-utils/implementations/controller-test
 *
 * @example
 * ```typescript
 * interface Mocks {
 *   SessionsService: DeepMocked<SessionsService>;
 * }
 *
 * describe('SessionsController', () => {
 *   let test: ControllerTest<SessionsController, Mocks, 'sessions'>;
 *
 *   beforeEach(async () => {
 *     test = new ControllerTest({
 *       controller: SessionsController,
 *       moduleName: 'sessions',
 *       providers: [SessionsService],
 *     });
 *     await test.setup();
 *   });
 *
 *   afterEach(async () => {
 *     await test.cleanup();
 *   });
 *
 *   it('should work', async () => {
 *     test.mocks.SessionsService.create.mockResolvedValue(mockSession);
 *     const token = await test.auth.createRoleToken(Role.USER);
 *     await test.http.authenticatedPost('/api/sessions', token, { body: dto });
 *   });
 * });
 * ```
 */

import { Provider, Type } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

import { RolesGuard } from '../../../src/app/iam/authorization/guards/roles.guard';
import { BaseTest } from '../core/base-test';
import { AssertionsMixin } from '../mixins/assertions.mixin';
import { AuthMixin } from '../mixins/auth.mixin';
import { FactoryMixin } from '../mixins/factory.mixin';
import { HttpCapable, HttpMethodsMixin } from '../mixins/http-methods.mixin';
import { buildProviders, MockProvider } from '../mixins/mock.mixin';

export interface ControllerTestConfig<TController, TModuleName extends string = string> {
  /** The controller class to test. */
  controller: Type<TController>;

  /**
   * Module name for HTTP route filtering (e.g., 'accounts', 'sessions').
   * Used by module* HTTP methods for type-safe route filtering.
   */
  moduleName?: TModuleName;

  /**
   * Providers for the controller dependencies.
   * - Class types are automatically deep-mocked
   * - Objects with { provide, useValue } use the custom mock
   */
  providers?: readonly MockProvider[];

  /** Whether to enable role-based authorization guards (default: true) */
  enableRolesGuard?: boolean;
}

/**
 * Controller Test Class
 *
 * @template TController The controller class being tested
 * @template TMocks Interface defining the mocks shape for IntelliSense
 * @template TModuleName Module name for HTTP route filtering
 */
export class ControllerTest<
  TController,
  TMocks = Record<string, unknown>,
  TModuleName extends string = string,
>
  extends BaseTest
  implements HttpCapable
{
  private config: ControllerTestConfig<TController, TModuleName>;
  private _controller!: TController;
  private _mocks!: TMocks;
  private _globalMocks: jest.Mock[] = [];

  /** HTTP methods for making requests. */
  readonly http: HttpMethodsMixin<TModuleName>;

  /** Auth helpers for creating tokens and headers. */
  readonly auth: AuthMixin;

  /** Assertion helpers for validating test results. */
  readonly assert: AssertionsMixin;

  /** Factory for creating in-memory mock data objects. */
  readonly factory: FactoryMixin;

  constructor(config: ControllerTestConfig<TController, TModuleName>) {
    super();
    this.config = config;
    this.http = new HttpMethodsMixin<TModuleName>(this);
    this.auth = new AuthMixin();
    this.assert = new AssertionsMixin();
    this.factory = new FactoryMixin();
  }

  /**
   * Register a global mock (e.g., global.fetch) to be reset during cleanup.
   * @param mock The jest.Mock to register for automatic reset
   */
  registerGlobalMock(mock: jest.Mock): void {
    this._globalMocks.push(mock);
  }

  /** The controller instance being tested. */
  get controller(): TController {
    if (!this._controller) {
      throw new Error('Controller not initialized. Call setup() first.');
    }
    return this._controller;
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

  /** Implement HttpCapable interface */
  async createAuthHeaders(token?: string) {
    return this.auth.createAuthHeaders(token);
  }

  /** Setup - creates testing module and initializes controller. */
  async setup(): Promise<void> {
    const moduleProviders: Provider[] = [];

    // Add role guard if enabled
    if (this.config.enableRolesGuard !== false) {
      moduleProviders.push({ provide: APP_GUARD, useClass: RolesGuard });
    }

    // Build providers from config
    if (this.config.providers && this.config.providers.length > 0) {
      const { providers, mocks } = buildProviders(this.config.providers);
      moduleProviders.push(...providers);
      this._mocks = mocks as TMocks;
    } else {
      this._mocks = {} as TMocks;
    }

    this._module = await Test.createTestingModule({
      controllers: [this.config.controller],
      providers: moduleProviders,
    }).compile();

    this._controller = this._module.get<TController>(this.config.controller);

    this._app = this._module.createNestApplication();
    this._app.setGlobalPrefix('api');
    this.auth.addAuthMiddleware(this._app);
    await this._app.init();
  }

  /** Cleanup - closes app, module, and resets all mocks. */
  async cleanup(): Promise<void> {
    // Reset all mocks (clears call history AND implementations)
    jest.resetAllMocks();

    // Reset any registered global mocks
    for (const mock of this._globalMocks) {
      mock.mockReset();
    }

    if (this._app) {
      await this._app.close();
    }
    if (this._module) {
      await this._module.close();
    }
  }

  /** Reset mocks without closing the module - useful for mid-test resets. */
  resetMocks(): void {
    jest.resetAllMocks();
    for (const mock of this._globalMocks) {
      mock.mockReset();
    }
  }
}
