/**
 * Abstract base class for controller testing
 * Provides common patterns and utilities for testing NestJS controllers
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
  PathsWithMethod,
  buildPath,
} from '@test-utils';
import request from 'supertest';

import { JwtPayload } from '../../../src/common';
import { RequestOptions, RequestType } from '../http';

export abstract class BaseControllerTest<
  TController,
  TService,
  E extends Record<string, any> = Endpoints,
> {
  protected controller: TController;
  protected service: TService;
  protected app: INestApplication;
  protected module: TestingModule;

  /**
   * Abstract method to setup the controller and its dependencies
   * Must be implemented by concrete test classes
   */
  abstract setupController(): Promise<void>;

  /**
   * Abstract method to setup mocks for the controller's dependencies
   * Must be implemented by concrete test classes
   */
  abstract setupMocks(): any;

  /**
   * Setup method called before each test
   * Creates the testing module and initializes the controller
   */
  async setup(): Promise<void> {
    const mocks = this.setupMocks();

    this.module = await Test.createTestingModule({
      controllers: [this.getControllerClass()],
      providers: [...this.getTestProviders(), ...mocks],
    }).compile();

    await this.setupController();

    this.app = this.module.createNestApplication();
    this.app.setGlobalPrefix('api');
    await this.app.init();
  }

  getApp() {
    return this.app;
  }

  /**
   * Cleanup method called after each test
   */
  async cleanup(): Promise<void> {
    if (this.app) {
      await this.app.close();
    }
    if (this.module) {
      await this.module.close();
    }
  }

  /**
   * Abstract method to get the controller class
   * Must be implemented by concrete test classes
   */
  abstract getControllerClass(): any;

  /**
   * Abstract method to get additional providers
   * Can be overridden by concrete test classes
   */
  getTestProviders(): Provider[] {
    return [];
  }

  /**
   * Creates a mock HTTP request object
   */
  protected createMockRequest(data?: any, user?: JwtPayload): MockRequest {
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
  protected createMockResponse(): any {
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
   * Creates a test JWT token for authentication
   */
  protected async createTestJwtToken(
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
   * Creates Authorization headers for HTTP requests
   */
  protected async createAuthHeaders(token?: string): Promise<AuthHeaders> {
    const authToken = token ?? (await this.createTestJwtToken());
    return {
      Authorization: `Bearer ${authToken}`,
    };
  }

  /**
   * Makes an request
   */
  protected async request<P extends ExtractPaths<E>, M extends ExtractMethods<E, P>>(
    endpoint: P,
    method: M,
    payload?: RequestType<E, P, M>,
    options?: RequestOptions
  ): Promise<request.Test> {
    const { body, params } = payload ?? {};
    const builtPath = this.buildPathWithParams(endpoint, params as Record<string, any>);

    const normalizedMethod = method.toLowerCase() as Lowercase<M>;
    let req = request(this.app.getHttpServer())[normalizedMethod](builtPath);

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
   */
  protected async get<P extends PathsWithMethod<E, 'GET'>>(
    endpoint: P,
    payload?: RequestType<E, P, 'GET'>,
    options?: RequestOptions
  ): Promise<request.Test> {
    return this.request(endpoint, 'GET', payload, options);
  }

  /**
   * Makes an unauthenticated POST request
   */
  protected async post<P extends PathsWithMethod<E, 'POST'>>(
    endpoint: P,
    payload?: RequestType<E, P, 'POST'>,
    options?: RequestOptions
  ): Promise<request.Test> {
    return this.request(endpoint, 'POST', payload, options);
  }

  /**
   * Makes an unauthenticated PUT request
   */
  protected async put<P extends PathsWithMethod<E, 'PUT'>>(
    endpoint: P,
    payload?: RequestType<E, P, 'PUT'>,
    options?: RequestOptions
  ): Promise<request.Test> {
    return this.request(endpoint, 'PUT', payload, options);
  }

  /**
   * Makes an unauthenticated DELETE request
   */
  protected async delete<P extends PathsWithMethod<E, 'DELETE'>>(
    endpoint: P,
    payload?: RequestType<E, P, 'DELETE'>,
    options?: RequestOptions
  ): Promise<request.Test> {
    return this.request(endpoint, 'DELETE', payload, options);
  }
  /**
   * Makes an authenticated request
   */
  protected async authenticatedRequest<P extends ExtractPaths<E>, M extends ExtractMethods<E, P>>(
    endpoint: P,
    method: M,
    token: string,
    payload?: RequestType<E, P, M>,
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
   */
  protected async authenticatedGet<P extends PathsWithMethod<E, 'GET'>>(
    endpoint: P,
    token: string,
    payload?: RequestType<E, P, 'GET'>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<request.Test> {
    return this.authenticatedRequest(endpoint, 'GET', token, payload, options);
  }

  /**
   * Makes an authenticated POST request
   */
  protected async authenticatedPost<P extends PathsWithMethod<E, 'POST'>>(
    endpoint: P,
    token: string,
    payload?: RequestType<E, P, 'POST'>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<request.Test> {
    return this.authenticatedRequest(endpoint, 'POST', token, payload, options);
  }

  /**
   * Makes an authenticated PUT request
   */
  protected async authenticatedPut<P extends PathsWithMethod<E, 'PUT'>>(
    endpoint: P,
    token: string,
    payload?: RequestType<E, P, 'PUT'>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<request.Test> {
    return this.authenticatedRequest(endpoint, 'PUT', token, payload, options);
  }

  /**
   * Makes an authenticated DELETE request
   */
  protected authenticatedDelete<P extends PathsWithMethod<E, 'DELETE'>>(
    endpoint: P,
    token: string,
    payload?: RequestType<E, P, 'DELETE'>,
    options?: Omit<RequestOptions, 'headers'>
  ): Promise<request.Test> {
    return this.authenticatedRequest(endpoint, 'DELETE', token, payload, options);
  }

  /**
   * Asserts that a response has the expected structure
   */
  protected assertResponseStructure(response: any, expectedKeys: string[]): void {
    expect(response.body).toBeDefined();
    expectedKeys.forEach(key => {
      expect(response.body).toHaveProperty(key);
    });
  }

  /**
   * Asserts that a response is a successful API response
   */
  protected assertSuccessResponse(response: any, expectedStatus = 200): void {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toBeDefined();
  }

  /**
   * Asserts that a response is an error response
   */
  protected assertErrorResponse(
    response: any,
    expectedStatus: number,
    expectedMessage?: string
  ): void {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toBeDefined();

    // For error responses, check the message
    if (expectedMessage && !response.ok) {
      expect(response.body.message).toContain(expectedMessage);
    }
  }

  /**
   * Asserts that a response that has a certain set of keys
   */
  protected assertResponseHasKeys(response: any, expectedKeys: string[]): void {
    expect(response.body).toBeDefined();
    expectedKeys.forEach(key => {
      expect(response.body).toHaveProperty(key);
    });
  }

  /**
   * Asserts that a response body matches expected data
   */
  protected assertResponseBody(response: any, expectedData: any): void {
    expect(response.body).toBeDefined();
    expect(response.body).toMatchObject(expectedData);
  }

  /**
   * Asserts that a response is a validation error
   */
  protected assertValidationError(response: any, expectedFields?: string[]): void {
    expect(response.status).toBe(400);
    expect(response.body).toBeDefined();
    expect(response.body.message).toBeDefined();

    if (expectedFields) {
      const messages = Array.isArray(response.body.message)
        ? response.body.message
        : [response.body.message];
      expectedFields.forEach(field => {
        expect(messages.some((msg: string) => msg.includes(field))).toBe(true);
      });
    }
  }

  /**
   * Asserts that a response is unauthorized (401)
   */
  protected assertUnauthorized(response: any): void {
    expect(response.status).toBe(401);
    expect(response.body).toBeDefined();
  }

  /**
   * Asserts that a response is forbidden (403)
   */
  protected assertForbidden(response: any): void {
    expect(response.status).toBe(403);
    expect(response.body).toBeDefined();
  }

  /**
   * Asserts that a response is not found (404)
   */
  protected assertNotFound(response: any): void {
    expect(response.status).toBe(404);
    expect(response.body).toBeDefined();
  }

  /**
   * Asserts that a response array has expected length
   */
  protected assertArrayLength(response: any, expectedLength: number): void {
    expect(response.body).toBeDefined();
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(expectedLength);
  }

  /**
   * Asserts that a response array contains an item matching criteria
   */
  protected assertArrayContains(response: any, matcher: any): void {
    expect(response.body).toBeDefined();
    expect(Array.isArray(response.body)).toBe(true);
    expect(
      response.body.some((item: any) =>
        Object.keys(matcher).every(key => item[key] === matcher[key])
      )
    ).toBe(true);
  }

  /**
   * Extracts a specific field from response body
   */
  protected extractField<T = any>(response: any, fieldPath: string): T {
    const fields = fieldPath.split('.');
    let value = response.body;
    for (const field of fields) {
      value = value?.[field];
    }
    return value as T;
  }

  /**
   * Creates a token for a specific role
   */
  protected async createRoleToken(role: Role, overrides?: Partial<JwtPayload>): Promise<string> {
    return this.createTestJwtToken({
      sub: `test-${role.toLowerCase()}-id`,
      email: `test-${role.toLowerCase()}@example.com`,
      role,
      ...overrides,
    });
  }

  /**
   * Creates an expired JWT token for testing authentication failures
   */
  protected async createExpiredToken(payload?: Partial<JwtPayload>): Promise<string> {
    const jwtService = new JwtService({
      secret: process.env.JWT_SECRET ?? 'test-secret',
      signOptions: { expiresIn: '-1h' }, // Expired 1 hour ago
    });
    return jwtService.signAsync({
      sub: 'test-user-id',
      email: 'test@example.com',
      role: Role.USER,
      ...payload,
    });
  }

  /**
   * Build path with parameters (replace {id} with actual values)
   * @private
   */
  private buildPathWithParams(path: string, data?: Record<string, any>): string {
    if (!data || typeof data !== 'object') return path;

    return buildPath(path, data);
  }
}
