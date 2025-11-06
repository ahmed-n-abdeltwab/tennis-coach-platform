/**
 * Abstract base class for controller testing
 * Provides common patterns and utilities for testing NestJS controllers
 */

import { INestApplication, Provider } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';

import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { JwtPayload } from '../auth/auth-test-helper';

export abstract class BaseControllerTest<TController, TService> {
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
  protected createMockRequest(data?: any, user?: any): any {
    return {
      body: data || {},
      user: user || { id: 'test-user-id', email: 'test@example.com' },
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
  protected createTestJwtToken(
    payload: Partial<JwtPayload> = {
      sub: 'test-user-id',
      email: 'test@example.com',
      role: Role.USER,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    }
  ): string {
    const jwtService = new JwtService({
      secret: process.env.JWT_SECRET || 'test-secret',
      signOptions: { expiresIn: '1h' },
    });
    return jwtService.sign(payload);
  }

  /**
   * Creates authorization headers for HTTP requests
   */
  protected createAuthHeaders(token?: string): { Authorization: string } {
    const authToken = token || this.createTestJwtToken();
    return {
      Authorization: `Bearer ${authToken}`,
    };
  }

  /**
   * Makes an authenticated GET request
   */
  protected authenticatedGet(endpoint: string, token?: string): request.Test {
    return request(this.app.getHttpServer())
      .get(`/api${endpoint}`)
      .set(this.createAuthHeaders(token));
  }

  /**
   * Makes an authenticated POST request
   */
  protected authenticatedPost(endpoint: string, data?: any, token?: string): request.Test {
    return request(this.app.getHttpServer())
      .post(`/api${endpoint}`)
      .set(this.createAuthHeaders(token))
      .send(data || {});
  }

  /**
   * Makes an authenticated PUT request
   */
  protected authenticatedPut(endpoint: string, data?: any, token?: string): request.Test {
    return request(this.app.getHttpServer())
      .put(`/api${endpoint}`)
      .set(this.createAuthHeaders(token))
      .send(data || {});
  }

  /**
   * Makes an authenticated DELETE request
   */
  protected authenticatedDelete(endpoint: string, token?: string): request.Test {
    return request(this.app.getHttpServer())
      .delete(`/api${endpoint}`)
      .set(this.createAuthHeaders(token));
  }

  /**
   * Makes an unauthenticated GET request
   */
  protected get(endpoint: string): request.Test {
    return request(this.app.getHttpServer()).get(`/api${endpoint}`);
  }

  /**
   * Makes an unauthenticated POST request
   */
  protected post(endpoint: string, data?: any): request.Test {
    return request(this.app.getHttpServer())
      .post(`/api${endpoint}`)
      .send(data || {});
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
}
