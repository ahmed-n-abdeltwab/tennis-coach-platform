/**
 * Controller Test Implementation
 * Clean composition of mixins for controller testing
 * Follows the pattern from tasks.md for consistent, simple testing
 *
 * @example Simple approach (recommended for new tests):
 * ```typescript
 * describe('SessionsController', () => {
 *   let controller: SessionsController;
 *   let service: jest.Mocked<SessionsService>;
 *
 *   beforeEach(async () => {
 *     const mockService = {
 *       create: jest.fn(),
 *       findByUser: jest.fn(),
 *       findOne: jest.fn(),
 *       update: jest.fn(),
 *       cancel: jest.fn(),
 *     };
 *
 *     const result = await createControllerTest({
 *       controllerClass: SessionsController,
 *       serviceClass: SessionsService,
 *       mockService,
 *     });
 *     controller = result.controller;
 *     service = result.service;
 *   });
 *
 *   afterEach(() => {
 *     jest.clearAllMocks();
 *   });
 * });
 * ```
 */

import { Provider, Type } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import type { Endpoints } from '@routes-helpers';

import { RolesGuard } from '../../../src/app/iam/authorization/guards/roles.guard';
import { BaseTest } from '../core/base-test';
import { AssertionsMixin } from '../mixins/assertions.mixin';
import { AuthMixin } from '../mixins/auth.mixin';
import { HttpCapable, HttpMethodsMixin } from '../mixins/http-methods.mixin';
import { MockMixin, TestDataFactory } from '../mixins/mock.mixin';

/**
 * Configuration for the simplified createControllerTest function
 */
export interface CreateControllerTestConfig<TController, TService> {
  /** The controller class to test */
  controllerClass: Type<TController>;
  /** The service class */
  serviceClass: Type<TService>;
  /** Mock service object with jest.fn() methods */
  mockService: Partial<Record<keyof TService, jest.Mock>>;
  /** Additional providers */
  providers?: Provider[];
}

/**
 * Result from createControllerTest function
 */
export interface ControllerTestResult<TController, TService> {
  /** The controller instance being tested */
  controller: TController;
  /** The mocked service */
  service: jest.Mocked<TService>;
  /** The testing module (for advanced use cases) */
  module: TestingModule;
  /** The ControllerTest instance (for access to mixins) */
  test: ControllerTest<TController, TService>;
}

export interface ControllerTestConfigBase<TController, TModuleName extends string> {
  /** The controller class to test */
  controllerClass: Type<TController>;
  /** The module name for type-safe routing (e.g., 'booking-types', 'accounts') */
  moduleName?: TModuleName;
  /** Mock service and other providers */
  providers: Provider[];
  /**
   * Whether to enable role-based authorization guards (default: true)
   * Set to false for pure unit tests that don't need authorization checks
   */
  enableRolesGuard?: boolean;
}

export interface ControllerTestConfigWithService<
  TController,
  TService,
  TModuleName extends string,
> extends ControllerTestConfigBase<TController, TModuleName> {
  /** The service class for accessing mocked service */
  serviceClass: Type<TService>;
}

export type ControllerTestConfig<TController, TService, TModuleName extends string> =
  | ControllerTestConfigBase<TController, TModuleName>
  | ControllerTestConfigWithService<TController, TService, TModuleName>;

/**
 * Controller Test Class
 * Provides controller testing capabilities through composition
 */
export class ControllerTest<
  TController,
  TService = unknown,
  TModuleName extends string = string,
  E extends Record<string, any> = Endpoints,
>
  extends BaseTest
  implements HttpCapable
{
  private config: ControllerTestConfig<TController, TService, TModuleName>;
  private _controller!: TController;
  private _service?: TService;

  // Compose mixins for clean separation of concerns
  readonly http: HttpMethodsMixin<TModuleName, E>;
  readonly auth: AuthMixin;
  readonly assert: AssertionsMixin;
  readonly mock: MockMixin;
  readonly factory: TestDataFactory;

  constructor(config: ControllerTestConfig<TController, TService, TModuleName>) {
    super();
    this.config = config;

    // Initialize mixins
    this.http = new HttpMethodsMixin<TModuleName, E>(this);
    this.auth = new AuthMixin();
    this.assert = new AssertionsMixin();
    this.mock = new MockMixin();
    this.factory = new TestDataFactory();
  }

  /**
   * Public accessor for the controller being tested
   */
  get controller(): TController {
    if (!this._controller) {
      throw new Error('Controller not initialized. Call setup() first.');
    }
    return this._controller;
  }

  /**
   * Public accessor for the service (if serviceClass was provided)
   * @throws Error if serviceClass was not provided in config
   */
  get service(): TService {
    if (!this._service) {
      const configWithService = this.config as ControllerTestConfigWithService<
        TController,
        TService,
        TModuleName
      >;
      if (!configWithService.serviceClass) {
        throw new Error(
          'Service not available. To access the service, provide serviceClass in the config.'
        );
      }
      throw new Error('Service not initialized. Call setup() first.');
    }
    return this._service;
  }

  /**
   * Public accessor for the testing module
   */
  get module(): TestingModule {
    if (!this._module) {
      throw new Error('Module not initialized. Call setup() first.');
    }
    return this._module;
  }

  /**
   * Implement HttpCapable interface
   */
  async createAuthHeaders(token?: string) {
    return this.auth.createAuthHeaders(token);
  }

  /**
   * Setup method - builds module and initializes app
   */
  async setup(): Promise<void> {
    const enableRolesGuard =
      (this.config as ControllerTestConfigBase<TController, TModuleName>).enableRolesGuard ?? true;

    const guardProviders: Provider[] = enableRolesGuard
      ? [{ provide: APP_GUARD, useClass: RolesGuard }]
      : [];

    this._module = await Test.createTestingModule({
      controllers: [this.config.controllerClass],
      providers: [...this.config.providers, ...guardProviders],
    }).compile();

    this._controller = this._module.get<TController>(this.config.controllerClass);

    // Get service if serviceClass was provided
    const configWithService = this.config as ControllerTestConfigWithService<
      TController,
      TService,
      TModuleName
    >;
    if (configWithService.serviceClass) {
      try {
        this._service = this._module.get<TService>(configWithService.serviceClass, {
          strict: false,
        });
      } catch {
        // Service not available, that's okay
      }
    }

    this._app = this._module.createNestApplication();
    this._app.setGlobalPrefix('api');

    // Add authentication middleware to extract user from JWT
    this.auth.addAuthMiddleware(this._app);

    await this._app.init();
  }

  /**
   * Cleanup method - closes app, module, and clears all mocks
   */
  async cleanup(): Promise<void> {
    jest.clearAllMocks();
    if (this._app) {
      await this._app.close();
    }
    if (this._module) {
      await this._module.close();
    }
  }
}

/**
 * Creates a controller test setup using ControllerTest internally.
 * This is the recommended approach for new tests.
 *
 * @example
 * ```typescript
 * describe('SessionsController', () => {
 *   let controller: SessionsController;
 *   let service: jest.Mocked<SessionsService>;
 *
 *   beforeEach(async () => {
 *     const mockService = {
 *       create: jest.fn(),
 *       findByUser: jest.fn(),
 *       findOne: jest.fn(),
 *       update: jest.fn(),
 *       cancel: jest.fn(),
 *     };
 *
 *     const result = await createControllerTest({
 *       controllerClass: SessionsController,
 *       serviceClass: SessionsService,
 *       mockService,
 *     });
 *     controller = result.controller;
 *     service = result.service;
 *   });
 *
 *   afterEach(() => {
 *     jest.clearAllMocks();
 *   });
 *
 *   it('should create a session', async () => {
 *     service.create.mockResolvedValue(expectedSession);
 *     const result = await controller.create(createDto);
 *     expect(result).toEqual(expectedSession);
 *     expect(service.create).toHaveBeenCalledWith(createDto);
 *   });
 * });
 * ```
 */
export async function createControllerTest<TController, TService>(
  config: CreateControllerTestConfig<TController, TService>
): Promise<ControllerTestResult<TController, TService>> {
  // Build the service provider
  const serviceProvider: Provider = {
    provide: config.serviceClass,
    useValue: config.mockService,
  };

  // Create ControllerTest instance with the configuration
  const controllerTest = new ControllerTest<TController, TService>({
    controllerClass: config.controllerClass,
    serviceClass: config.serviceClass,
    providers: [serviceProvider, ...(config.providers ?? [])],
  });

  // Setup the test
  await controllerTest.setup();

  return {
    controller: controllerTest.controller,
    service: controllerTest.service as jest.Mocked<TService>,
    module: controllerTest.module,
    test: controllerTest,
  };
}
