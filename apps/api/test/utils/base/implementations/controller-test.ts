/**
 * Controller Test Implementation
 * Clean composition of mixins for controller testing
 * Replaces the monolithic BaseControllerTest
 */

import { Provider, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import type { Endpoints } from '../../types/type-utils';
import { BaseTest } from '../core/base-test';
import { AssertionsMixin } from '../mixins/assertions.mixin';
import { AuthMixin } from '../mixins/auth.mixin';
import { HttpCapable, HttpMethodsMixin } from '../mixins/http-methods.mixin';
import { MockMixin } from '../mixins/mock.mixin';

export interface ControllerTestConfigBase<TController, TModuleName extends string> {
  /** The controller class to test */
  controllerClass: Type<TController>;
  /** The module name for type-safe routing (e.g., 'booking-types', 'accounts') */
  moduleName: TModuleName;
  /** Mock service and other providers */
  providers: Provider[];
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
  TService = any,
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

  constructor(config: ControllerTestConfig<TController, TService, TModuleName>) {
    super();
    this.config = config;

    // Initialize mixins
    this.http = new HttpMethodsMixin<TModuleName, E>(this);
    this.auth = new AuthMixin();
    this.assert = new AssertionsMixin();
    this.mock = new MockMixin();
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
   * Implement HttpCapable interface
   */
  async createAuthHeaders(token?: string) {
    return this.auth.createAuthHeaders(token);
  }

  /**
   * Setup method - builds module and initializes app
   */
  async setup(): Promise<void> {
    this._module = await Test.createTestingModule({
      controllers: [this.config.controllerClass],
      providers: this.config.providers,
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
   * Cleanup method - closes app and module
   */
  async cleanup(): Promise<void> {
    if (this._app) {
      await this._app.close();
    }
    if (this._module) {
      await this._module.close();
    }
  }
}
