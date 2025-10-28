/**
 * Abstract base class for in testing
 * Provides database setup, cleanup, and common integration testing patterns
 */

import { PrismaService } from '@app/prisma/prisma.service';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import request from 'supertest';
import { cleanDatabase, seedTestDatabase } from '../database-helpers';

export abstract class BaseIntegrationTest {
  protected app: INestApplication;
  protected prisma: PrismaService;
  protected module: TestingModule;
  protected testData: any;

  /**
   * Abstract method to setup the test application
   * Must be implemented by concrete test classes
   */
  abstract setupTestApp(): Promise<void>;

  /**
   * Abstract method to get the modules to import
   * Must be implemented by concrete test classes
   */
  abstract getTestModules(): any[];

  /**
   * Setup method called before each test
   * Creates the test application and sets up the database
   */
  async setup(): Promise<void> {
    this.module = await Test.createTestingModule({
      imports: this.getTestModules(),
      providers: this.getAdditionalProviders(),
    }).compile();

    await this.setupTestApp();

    this.app = this.module.createNestApplication();
    this.app.setGlobalPrefix('api');
    await this.app.init();

    this.prisma = this.module.get<PrismaService>(PrismaService);
    await this.setupDatabase();
  }

  /**
   * Cleanup method called after each test
   */
  async cleanup(): Promise<void> {
    await this.cleanupDatabase();

    if (this.app) {
      await this.app.close();
    }
    if (this.module) {
      await this.module.close();
    }
  }

  /**
   * Gets additional providers for the test module
   * Can be overridden by concrete test classes
   */
  getAdditionalProviders(): any[] {
    return [];
  }

  /**
   * Sets up the test database with clean state
   */
  async setupDatabase(): Promise<void> {
    await this.cleanupDatabase();
    await this.seedTestData();
  }

  /**
   * Cleans up the test database
   */
  async cleanupDatabase(): Promise<void> {
    if (this.prisma) {
      await cleanDatabase(this.prisma);
    }
  }

  /**
   * Seeds the database with test data
   * Can be overridden by concrete test classes for custom seeding
   */
  async seedTestData(): Promise<void> {
    this.testData = await seedTestDatabase(this.prisma);
  }

  /**
   * Creates a test JWT token for authentication
   */
  protected createTestJwtToken(
    payload: any = { sub: 'test-user-id', email: 'test@example.com' }
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
   * Executes a database transaction for testing
   */
  protected async withTransaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    return this.prisma.$transaction(callback);
  }

  /**
   * Creates test data in the database
   */
  protected async createTestUser(overrides: any = {}): Promise<any> {
    return this.prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        name: 'Test User',
        phone: '+1234567890',
        ...overrides,
      },
    });
  }

  /**
   * Creates test coach data in the database
   */
  protected async createTestCoach(userId?: string, overrides: any = {}): Promise<any> {
    const user = userId ? { id: userId } : await this.createTestUser();

    return this.prisma.coach.create({
      data: {
        userId: user.id,
        bio: 'Test coach bio',
        experience: 5,
        hourlyRate: 75.0,
        specialties: ['Singles'],
        availability: {},
        ...overrides,
      },
    });
  }

  /**
   * Creates test booking type data in the database
   */
  protected async createTestBookingType(overrides: any = {}): Promise<any> {
    return this.prisma.bookingType.create({
      data: {
        name: 'Test Booking Type',
        description: 'Test booking type description',
        duration: 60,
        price: 75.0,
        isActive: true,
        ...overrides,
      },
    });
  }

  /**
   * Creates test session data in the database
   */
  protected async createTestSession(
    coachId?: string,
    userId?: string,
    overrides: any = {}
  ): Promise<any> {
    const coach = coachId ? { id: coachId } : await this.createTestCoach();
    const user = userId ? { id: userId } : await this.createTestUser();

    return this.prisma.session.create({
      data: {
        coachId: coach.id,
        userId: user.id,
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000), // Tomorrow + 1 hour
        status: 'SCHEDULED',
        price: 75.0,
        ...overrides,
      },
    });
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
  protected assertSuccessResponse(response: any, expectedStatus: number = 200): void {
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
    if (expectedMessage) {
      expect(response.body.message).toContain(expectedMessage);
    }
  }

  /**
   * Asserts that data exists in the database
   */
  protected async assertDataExists(model: string, where: any): Promise<void> {
    const data = await (this.prisma as any)[model].findFirst({ where });
    expect(data).toBeDefined();
  }

  /**
   * Asserts that data does not exist in the database
   */
  protected async assertDataNotExists(model: string, where: any): Promise<void> {
    const data = await (this.prisma as any)[model].findFirst({ where });
    expect(data).toBeNull();
  }

  /**
   * Counts records in a database table
   */
  protected async countRecords(model: string, where: any = {}): Promise<number> {
    return (this.prisma as any)[model].count({ where });
  }
}
