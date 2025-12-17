/**
 * Improved base class for controller testing
 * Automatically provides type-safe HTTP methods based on module name
 *
 * Usage:
 * ```typescript
 * const test = new BaseControllerTest({
 *   controllerClass: BookinsController,
 *   moduleName: 'booking-types',
 *   providers: [
 *     { provide: BookingTypesService, useValue: mockService },
 *   ],
 * });
 *
 * await test.setup();
 *
 * // Type-safe HTTP methods automatically available
 * await test.get('/api/booking-types');
 * await test.authenticatedPost('/api/booking-types', token, { body: data });
 * ```
 */

import { INestApplication, Provider } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import {
  AuthHeaders,
  Endpoints,
  ExtractMethods,
  ExtractPaths,
  MockRequest,
  PathsForRoute,
  buildPath,
} from '@test-utils';
import request from 'supertest';

import { JwtPayload } from '../../../src/common';
import { RequestOptions, RequestType } from '../http';

export interface ControllerTestConfig<TController, _TService, TModuleName extends string> {
  /** The controller class to test */
  controllerClass: new (...args: any[]) => TController;
  /** The module name for type-safe routing (e.g., 'booking-types', 'accounts') */
  moduleName: TModuleName;
  /** Mock service and other providers */
  providers: Provider[];
}

/**
 * Type helper to extract module-specific paths
 */
export type ModulePaths<TModuleName extends string> = Extract<
  keyof Endpoints,
  `/api/${TModuleName}${string}`
>;

/**
 * Improved BaseControllerTest with automatic type-safe methods
 */
export class BaseControllerTest<
  TController,
  TService,
  TModuleName extends string = string,
  E extends Record<string, any> = Endpoints,
> {
  private _controller!: TController;
  private _app!: INestApplication;
  private _module!: TestingModule;
  private config: ControllerTestConfig<TController, TService, TModuleName>;

  constructor(config: ControllerTestConfig<TController, TService, TModuleName>) {
    this.config = config;
  }

  /**
   * Public accessor for the controller being tested
   */
  get controller(): TController {
    return this._controller;
  }

  /**
   * Public accessor for the NestJS application
   */
  get app(): INestApplication {
    return this._app;
  }

  /**
   * Public accessor for the testing module
   */
  get module(): TestingModule {
    return this._module;
  }

  /**
   * Setup method called before each test
   */
  async setup(): Promise<void> {
    this._module = await Test.createTestingModule({
      controllers: [this.config.controllerClass],
      providers: this.config.providers,
    }).compile();

    this._controller = this._module.get<TController>(this.config.controllerClass);

    this._app = this._module.createNestApplication();
    this._app.setGlobalPrefix('api');

    // Add authentication middleware to extract user from JWT
    this._app.use((req: any, _res: any, next: any) => {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const jwtService = new JwtService({
            secret: process.env.JWT_SECRET ?? 'test-secret',
          });
          req.user = jwtService.verify(token);
        } catch {
          // Token invalid, leave user undefined
        }
      }
      next();
    });

    await this._app.init();
  }

  /**
   * Cleanup method called after each test
   */
  async cleanup(): Promise<void> {
    if (this._app) {
      await this._app.close();
    }
    if (this._module) {
      await this._module.close();
    }
  }

  /**
   * Makes a generic HTTP request
   */
  private async request<P extends ExtractPaths<E>, M extends ExtractMethods<E, P>>(
    endpoint: P,
    method: M,
    payload?: RequestType<P, M, E>,
    options?: RequestOptions
  ): Promise<request.Test> {
    const { body, params } = payload ?? {};
    const builtPath = this.buildPathWithParams(endpoint, params as Record<string, any>);

    const normalizedMethod = method.toLowerCase() as Lowercase<M>;
    let req = request(this._app.getHttpServer())[normalizedMethod](builtPath);

    // Add headers
    if (options?.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        req = req.set(key, value);
      });
    }

    // body/query
    if (params) req = req.query(params);
    if (body) req = req.send(body);

    // Set timeout
    if (options?.timeout) req = req.timeout(options.timeout);

    // Set expected status
    if (options?.expectedStatus) req = req.expect(options.expectedStatus);

    return req;
  }

  /**
   * Makes an unauthenticated GET request
   * Path is automatically constrained to routes for this module
   */
  async get<P extends PathsForRoute<TModuleName, 'GET', E>>(
    endpoint: P,
    payload?: RequestType<P, 'GET', E>,
    options?: RequestOptions
  ): Promise<request.Test> {
    return this.request(endpoint, 'GET', payload, options);
  }

  /**
   * Makes an unauthenticated POST request
   * Path is automatically constrained to routes for this module
   */
  async post<P extends PathsForRoute<TModuleName, 'POST', E>>(
    endpoint: P,
    payload?: RequestType<P, 'POST', E>,
    options?: RequestOptions
  ): Promise<request.Test> {
    return this.request(endpoint, 'POST', payload, options);
  }

  /**
   * Makes an unauthenticated PUT request
   * Path is automatically constrained to routes for this module
   */
  async put<P extends PathsForRoute<TModuleName, 'PUT', E>>(
    endpoint: P,
    payload?: RequestType<P, 'PUT', E>,
    options?: RequestOptions
  ): Promise<request.Test> {
    return this.request(endpoint, 'PUT', payload, options);
  }

  /**
   * Makes an unauthenticated PATCH request
   * Path is automatically constrained to routes for this module
   */
  async patch<P extends PathsForRoute<TModuleName, 'PATCH', E>>(
    endpoint: P,
    payload?: RequestType<P, 'PATCH', E>,
    options?: RequestOptions
  ): Promise<request.Test> {
    return this.request(endpoint, 'PATCH', payload, options);
  }

  /**
   * Makes an unauthenticated DELETE request
   * Path is automatically constrained to routes for this module
   */
  async delete<P extends PathsForRoute<TModuleName, 'DELETE', E>>(
    endpoint: P,
    payload?: RequestType<P, 'DELETE', E>,
    options?: RequestOptions
  ): Promise<request.Test> {
    return this.request(endpoint, 'DELETE', payload, options);
  }

  /**
   * Makes an authenticated request
   */
  private async authenticatedRequest<P extends ExtractPaths<E>, M extends ExtractMethods<E, P>>(
    endpoint: P,
    method: M,
    token: string,
    payload?: RequestType<P, M, E>,
    options?: RequestOptions
  ): Promise<request.Test> {
    const authHeaders = await this.createAuthHeaders(token);
    return this.request(endpoint, method, payload, {
      ...options,
      headers: { ...authHeaders, ...options?.headers },
    });
  }

  /**
   * Makes an authenticated GET request
   * Path is automatically constrained to routes for this module
   */
  async authenticatedGet<P extends PathsForRoute<TModuleName, 'GET', E>>(
    endpoint: P,
    token: string,
    payload?: RequestType<P, 'GET', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<request.Test> {
    return this.authenticatedRequest(endpoint, 'GET', token, payload, options);
  }

  /**
   * Makes an authenticated POST request
   * Path is automatically constrained to routes for this module
   */
  async authenticatedPost<P extends PathsForRoute<TModuleName, 'POST', E>>(
    endpoint: P,
    token: string,
    payload?: RequestType<P, 'POST', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<request.Test> {
    return this.authenticatedRequest(endpoint, 'POST', token, payload, options);
  }

  /**
   * Makes an authenticated PUT request
   * Path is automatically constrained to routes for this module
   */
  async authenticatedPut<P extends PathsForRoute<TModuleName, 'PUT', E>>(
    endpoint: P,
    token: string,
    payload?: RequestType<P, 'PUT', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<request.Test> {
    return this.authenticatedRequest(endpoint, 'PUT', token, payload, options);
  }

  /**
   * Makes an authenticated PATCH request
   * Path is automatically constrained to routes for this module
   */
  async authenticatedPatch<P extends PathsForRoute<TModuleName, 'PATCH', E>>(
    endpoint: P,
    token: string,
    payload?: RequestType<P, 'PATCH', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<request.Test> {
    return this.authenticatedRequest(endpoint, 'PATCH', token, payload, options);
  }

  /**
   * Makes an authenticated DELETE request
   * Path is automatically constrained to routes for this module
   */
  async authenticatedDelete<P extends PathsForRoute<TModuleName, 'DELETE', E>>(
    endpoint: P,
    token: string,
    payload?: RequestType<P, 'DELETE', E>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<request.Test> {
    return this.authenticatedRequest(endpoint, 'DELETE', token, payload, options);
  }

  /**
   * Creates a test JWT token for authentication
   */
  async createTestJwtToken(
    payload: Partial<JwtPayload> = {
      sub: 'test-user-id',
      email: 'test@example.com',
      role: Role.USER,
    }
  ): Promise<string> {
    const jwtService = new JwtService({
      secret: process.env.JWT_SECRET ?? 'test-secret',
      signOptions: { expiresIn: '1h' },
    });
    return jwtService.signAsync(payload);
  }

  /**
   * Creates a token for a specific role
   */
  async createRoleToken(role: Role, overrides?: Partial<JwtPayload>): Promise<string> {
    return this.createTestJwtToken({
      sub: `test-${role.toLowerCase()}-id`,
      email: `test-${role.toLowerCase()}@example.com`,
      role,
      ...overrides,
    });
  }

  /**
   * Creates Authorization headers for HTTP requests
   */
  private async createAuthHeaders(token?: string): Promise<AuthHeaders> {
    const authToken = token ?? (await this.createTestJwtToken());
    return {
      Authorization: `Bearer ${authToken}`,
    };
  }

  /**
   * Creates a mock HTTP request object
   */
  createMockRequest(data?: any, user?: JwtPayload): MockRequest {
    return {
      body: data ?? {},
      user: user ?? { sub: 'test-user-id', email: 'test@example.com', role: Role.USER },
      headers: {},
      query: {},
      params: {},
    };
  }

  /**
   * Creates a mock HTTP response object
   */
  createMockResponse(): any {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      header: jest.fn().mockReturnThis(),
    };
    return res;
  }

  /**
   * Build path with parameters (replace {id} with actual values)
   */
  private buildPathWithParams(path: string, data?: Record<string, any>): string {
    if (!data || typeof data !== 'object') return path;
    return buildPath(path, data);
  }

  /**
   * Asserts that a response has the expected structure
   */
  assertResponseStructure(response: any, expectedKeys: string[]): void {
    expect(response.body).toBeDefined();
    expectedKeys.forEach(key => {
      expect(response.body).toHaveProperty(key);
    });
  }

  /**
   * Asserts that a response is a successful API response
   */
  assertSuccessResponse(response: any, expectedStatus = 200): void {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toBeDefined();
  }

  /**
   * Asserts that a response is an error response
   */
  assertErrorResponse(response: any, expectedStatus: number, expectedMessage?: string): void {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toBeDefined();

    if (expectedMessage && !response.ok) {
      expect(response.body.message).toContain(expectedMessage);
    }
  }

  /**
   * Asserts that a response is not found (404)
   */
  assertNotFound(response: any): void {
    expect(response.status).toBe(404);
    expect(response.body).toBeDefined();
  }

  /**
   * Asserts that a response is unauthorized (401)
   */
  assertUnauthorized(response: any): void {
    expect(response.status).toBe(401);
    expect(response.body).toBeDefined();
  }

  /**
   * Asserts that a response is forbidden (403)
   */
  assertForbidden(response: any): void {
    expect(response.status).toBe(403);
    expect(response.body).toBeDefined();
  }
}
