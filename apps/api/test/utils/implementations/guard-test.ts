/**
 * Guard Test Implementation
 *
 * Provides standardized testing for NestJS guards with mock ExecutionContext helpers.
 * Providers are auto deep-mocked unless a custom useValue is provided.
 * Define a TMocks interface for full IntelliSense on `test.mocks.ClassName`.
 *
 * @module test-utils/implementations/guard-test
 *
 * @example
 * ```typescript
 * interface Mocks {
 *   JwtService: DeepMocked<Jwt
 * }
 *
 * describe('AccessTokenGuard', () => {
 *   let test: GuardTest<AccessTokenGuard, Mocks>;
 *
 *   beforeEach(async () => {
 *     test = new GuardTest({
 *       guard: AccessTokenGuard,
 *       providers: [
 *         JwtService,
 *         { provide: jwtConfig.KEY, useValue: mockJwtConfig },
 *       ],
 *     });
 *     await test.setup();
 *   });
 *
 *   afterEach(async () => {
 *     await test.cleanup();
 *   });
 *
 *   it('should allow access with valid token', async () => {
 *     test.mocks.JwtService.verifyAsync.mockResolvedValue({ sub: 'user-id' });
 *     const context = test.createMockExecutionContext({
 *       headers: { authorization: 'Bearer valid-token' },
 *     });
 *
 *     const result = await test.guard.canActivate(context);
 *     expect(result).toBe(true);
 *   });
 * });
 * ```
 */

import { CanActivate, ExecutionContext, Provider, Type } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

import { BaseTest } from '../core/base-test';
import { AssertionsMixin } from '../mixins/assertions.mixin';
import { FactoryMixin } from '../mixins/factory.mixin';
import { buildProviders, MockProvider } from '../mixins/mock.mixin';

/**
 * Mock request options for creating test requests
 */
export interface MockRequestOptions {
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body */
  body?: Record<string, unknown>;
  /** Request query parameters */
  query?: Record<string, string>;
  /** Request route parameters */
  params?: Record<string, string>;
  /** User object (set by auth middleware/guards) */
  user?: Record<string, unknown>;
  /** HTTP method */
  method?: string;
  /** Request URL */
  url?: string;
}

/**
 * Handler metadata options for configuring Reflector responses
 * Keys are metadata keys (e.g., ROLES_KEY), values are what Reflector should return
 */
export type HandlerMetadata = Record<string | symbol, unknown>;

/**
 * Mock response object
 */
export interface MockResponse {
  status: jest.Mock;
  json: jest.Mock;
  send: jest.Mock;
}

export interface GuardTestConfig<TGuard extends CanActivate> {
  /** The guard class to test. */
  guard: Type<TGuard>;

  /**
   * Providers for the guard dependencies.
   * - Class types are automatically deep-mocked
   * - Objects with { provide, useValue } use the custom mock
   */
  providers?: readonly MockProvider[];
}

/**
 * Guard Test Class
 *
 * @template TGuard The guard class being tested (must implement CanActivate)
 * @template TMocks Interface defining the mocks shape for IntelliSense
 */
export class GuardTest<
  TGuard extends CanActivate,
  TMocks = Record<string, unknown>,
> extends BaseTest {
  private config: GuardTestConfig<TGuard>;
  private _guard!: TGuard;
  private _mocks!: TMocks;
  private _reflector!: Reflector;
  private _globalMocks: jest.Mock[] = [];

  /** Assertion helpers for validating test results. */
  readonly assert: AssertionsMixin;

  /** Factory for creating in-memory mock data objects. */
  readonly factory: FactoryMixin;

  constructor(config: GuardTestConfig<TGuard>) {
    super();
    this.config = config;
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

  /** The guard instance being tested. */
  get guard(): TGuard {
    if (!this._guard) {
      throw new Error('Guard not initialized. Call setup() first.');
    }
    return this._guard;
  }

  /** Type-safe mocks accessible by class name. Define TMocks interface for IntelliSense. */
  get mocks(): TMocks {
    if (!this._mocks) {
      throw new Error('Mocks not initialized. Call setup() first.');
    }
    return this._mocks;
  }

  /** The Reflector instance for metadata access. */
  get reflector(): Reflector {
    if (!this._reflector) {
      throw new Error('Reflector not initialized. Call setup() first.');
    }
    return this._reflector;
  }

  /** The NestJS testing module. */
  get module(): TestingModule {
    if (!this._module) {
      throw new Error('Module not initialized. Call setup() first.');
    }
    return this._module;
  }

  /** Setup - creates testing module and initializes guard. */
  async setup(): Promise<void> {
    const moduleProviders: Provider[] = [this.config.guard, Reflector];

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

    this._guard = this._module.get<TGuard>(this.config.guard);
    this._reflector = this._module.get<Reflector>(Reflector);
  }

  /** Cleanup - closes module and resets all mocks. */
  async cleanup(): Promise<void> {
    jest.resetAllMocks();

    for (const mock of this._globalMocks) {
      mock.mockReset();
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

  /**
   * Creates a mock HTTP request object
   * @param options Request options (headers, body, query, params, user)
   */
  createMockRequest(options: MockRequestOptions = {}): Record<string, unknown> {
    return {
      headers: options.headers ?? {},
      body: options.body ?? {},
      query: options.query ?? {},
      params: options.params ?? {},
      user: options.user,
      method: options.method ?? 'GET',
      url: options.url ?? '/test',
    };
  }

  /**
   * Creates a mock HTTP response object
   */
  createMockResponse(): MockResponse {
    return {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
  }

  /**
   * Creates a mock ExecutionContext for testing guards
   * @param requestOptions Options for the mock request
   * @param handlerMetadata Optional metadata to configure Reflector responses.
   *   Keys are metadata keys (e.g., ROLES_KEY), values are what getAllAndOverride should return.
   *
   * @example
   * ```typescript
   * // Without handlerMetadata (manual Reflector mock)
   * test.mocks.Reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
   * const context = test.createMockExecutionContext({ user: mockUser });
   *
   * // With handlerMetadata (automatic Reflector configuration)
   * const context = test.createMockExecutionContext(
   *   { user: mockUser },
   *   { [ROLES_KEY]: [Role.ADMIN] }
   * );
   * ```
   */
  createMockExecutionContext(
    requestOptions: MockRequestOptions = {},
    handlerMetadata?: HandlerMetadata
  ): ExecutionContext {
    const mockRequest = this.createMockRequest(requestOptions);
    const mockResponse = this.createMockResponse();

    const mockHandler = jest.fn();
    const mockClass = class TestController {};

    // Configure Reflector to return metadata for this context
    if (handlerMetadata && this._mocks) {
      const mocks = this._mocks as Record<string, unknown>;
      const reflectorMock = mocks['Reflector'] as
        | {
            getAllAndOverride?: jest.Mock;
            get?: jest.Mock;
          }
        | undefined;

      if (reflectorMock?.getAllAndOverride) {
        reflectorMock.getAllAndOverride.mockImplementation(
          (key: string | symbol, targets: unknown[]) => {
            // Return metadata if targets include our mockHandler or mockClass
            if (targets.includes(mockHandler) || targets.includes(mockClass)) {
              return handlerMetadata[key];
            }
            return undefined;
          }
        );
      }

      if (reflectorMock?.get) {
        reflectorMock.get.mockImplementation((key: string | symbol, target: unknown) => {
          if (target === mockHandler || target === mockClass) {
            return handlerMetadata[key];
          }
          return undefined;
        });
      }
    }

    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getNext: jest.fn(),
      }),
      switchToRpc: jest.fn().mockReturnValue({
        getData: jest.fn(),
        getContext: jest.fn(),
      }),
      switchToWs: jest.fn().mockReturnValue({
        getData: jest.fn(),
        getClient: jest.fn(),
      }),
      getHandler: jest.fn().mockReturnValue(mockHandler),
      getClass: jest.fn().mockReturnValue(mockClass),
      getArgs: jest.fn().mockReturnValue([mockRequest, mockResponse]),
      getArgByIndex: jest.fn().mockImplementation((index: number) => {
        const args = [mockRequest, mockResponse];
        return args[index];
      }),
      getType: jest.fn().mockReturnValue('http'),
    } as unknown as ExecutionContext;
  }

  /**
   * Creates a mock ExecutionContext with a Bearer token in the Authorization header
   * @param token The JWT token to include
   * @param additionalOptions Additional request options
   * @param handlerMetadata Optional metadata to configure Reflector responses
   */
  createMockContextWithToken(
    token: string,
    additionalOptions: Omit<MockRequestOptions, 'headers'> & {
      headers?: Record<string, string>;
    } = {},
    handlerMetadata?: HandlerMetadata
  ): ExecutionContext {
    const { headers = {}, ...rest } = additionalOptions;
    return this.createMockExecutionContext(
      {
        ...rest,
        headers: {
          ...headers,
          authorization: `Bearer ${token}`,
        },
      },
      handlerMetadata
    );
  }

  /**
   * Creates a mock ExecutionContext without any authorization header
   * @param options Additional request options
   * @param handlerMetadata Optional metadata to configure Reflector responses
   */
  createMockContextWithoutAuth(
    options: MockRequestOptions = {},
    handlerMetadata?: HandlerMetadata
  ): ExecutionContext {
    const { headers = {}, ...rest } = options;
    const headersWithoutAuth = { ...headers };
    delete headersWithoutAuth.authorization;

    return this.createMockExecutionContext(
      {
        ...rest,
        headers: headersWithoutAuth,
      },
      handlerMetadata
    );
  }

  /**
   * Gets the mock request from an ExecutionContext
   * Useful for asserting that the guard modified the request (e.g., added user)
   */
  getRequestFromContext(context: ExecutionContext): Record<string, unknown> {
    return context.switchToHttp().getRequest();
  }
}
