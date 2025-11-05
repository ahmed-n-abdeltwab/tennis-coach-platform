/**
 * Middleware Pipeline Integration Tests
 * Tests middleware integration and request/response pipeline across modules
 */

import { AuthModule } from '@app/auth/auth.module';
import { BookingTypesModule } from '@app/booking-types/booking-types.module';
import { MessagesModule } from '@app/messages/messages.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { SessionsModule } from '@app/sessions/sessions.module';
import { UsersModule } from '@app/users/users.module';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { BaseIntegrationTest } from '@test-utils/base/base-integration.test';
import * as request from 'supertest';
impohesModule } from '@app/coaches/coaches.module';

describe('Middleware Pipeline Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let module: TestingModule;

  class MiddlewarePipelineIntegrationTest extends BaseIntegrationTest {
    async setupTestApp(): Promise<void> {
      this.module = await Test.createTestingModule({
        imports: this.getTestModules(),
      }).compile();

      this.app = this.module.createNestApplication();

      // Setup global middleware and pipes
      this.app.setGlobalPrefix('api');
      this.app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }));

      await this.app.init();

      this.prisma = this.module.get<PrismaService>(PrismaService);
    }

    getTestModules(): any[] {
      return [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env.test', '.env'],
        }),
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
        PrismaModule,
        AuthModule,
        UsersModule,
        CoachesModule,
        BookingTypesModule,
        SessionsModule,
        MessagesModule,
      ];
    }
  }

  let testHelper: MiddlewarePipelineIntegrationTest;

  beforeAll(async () => {
    testHelper = new MiddlewarePipelineIntegrationTest();
    await testHelper.setupTestApp();

    app = testHelper.app;
    prisma = testHelper.prisma;
    module = testHelper.module;
  });

  afterAll(async () => {
    await testHelper.cleanup();
  });

  beforeEach(async () => {
    await testHelper.cleanupDatabase();
  });

  describe('Authentication Middleware Pipeline', () => {
    it('should enforce authentication across all protected endpoints', async () => {
      // Test endpoints that require authentication
      const protectedEndpoints = [
        { method: 'get', path: '/api/sessions' },
        { method: 'post', path: '/api/sessions' },
        { method: 'get', path: '/api/users/profile' },
        { method: 'put', path: '/api/users/profile' },
        { method: 'get', path: '/api/coaches/profile' },
        { method: 'post', path: '/api/booking-types' },
        { method: 'post', path: '/api/messages' },
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await request(app.getHttpServer())
          [endpoint.method](endpoint.path)
          .send({});

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message');
      }
    });

    it('should handle invalid JWT tokens consistently', async () => {
      const invalidTokens = [
        'Bearer invalid-token',
        'Bearer ',
        'invalid-format',
        'Bearer expired.jwt.token',
      ];

      const endpoint = '/api/sessions';

      for (const token of invalidTokens) {
        const response = await request(app.getHttpServer())
          .get(endpoint)
          .set('Authorization', token);

        expect(response.status).toBe(401);
      }
    });

    it('should handle valid JWT tokens across modules', async () => {
      // Arrange
      const user = await testHelper.createTestUser();
      const coach = await testHelper.createTestCoach();
      const token = testHelper.createTestJwtToken({ sub: user.id, type: 'user' });
      const coachToken = testHelper.createTestJwtToken({ sub: coach.id, type: 'coach' });

      // Act & Assert - Valid tokens should work across modules
      const endpoints = [
        { token, method: 'get', path: '/api/sessions' },
        { token, method: 'get', path: '/api/users/profile' },
        { coachToken, method: 'get', path: '/api/coaches/profile' },
        { coachToken, method: 'get', path: '/api/booking-types' },
      ];

      for (const endpoint of endpoints) {
        const response = await request(app.getHttpServer())
          [endpoint.method](endpoint.path)
          .set('Authorization', endpoint.token);

        expect(response.status).not.toBe(401);
        expect(response.status).not.toBe(403);
      }
    });
  });

  describe('Authorization Middleware Pipeline', () => {
    it('should enforce role-based access control', async () => {
      // Arrange
      const user = await testHelper.createTestUser();
      const coach = await testHelper.createTestCoach();
      const userToken = testHelper.createTestJwtToken({ sub: user.id, type: 'user' });
      const coachToken = testHelper.createTestJwtToken({ sub: coach.id, type: 'coach' });

      // Act & Assert - Test role-based restrictions

      // Users cannot create booking types (coach-only)
      await request(app.getHttpServer())
        .post('/api/booking-types')
        .set('Authorization', userToken)
        .send({
          name: 'Test Booking Type',
          basePrice: 100,
        })
        .expect(403);

      // Coaches can create booking types
      await request(app.getHttpServer())
        .post('/api/booking-types')
        .set('Authorization', coachToken)
        .send({
          name: 'Coach Booking Type',
          basePrice: 100,
        })
        .expect(201);
    });

    it('should enforce resource ownership authorization', async () => {
      // Arrange
      const user1 = await testHelper.createTestUser();
      const user2 = await testHelper.createTestUser();
      const coach = await testHelper.createTestCoach();

      const session = await testHelper.createTestSession({
        userId: user1.id,
        coachId: coach.id,
      });

      const user1Token = testHelper.createTestJwtToken({ sub: user1.id, type: 'user' });
      const user2Token = testHelper.createTestJwtToken({ sub: user2.id, type: 'user' });
      const coachToken = testHelper.createTestJwtToken({ sub: coach.id, type: 'coach' });

      // Act & Assert - Test resource ownership

      // User1 can access their session
      await request(app.getHttpServer())
        .get(`/api/sessions/${session.id}`)
        .set('Authorization', user1Token)
        .expect(200);

      // Coach can access their session
      await request(app.getHttpServer())
        .get(`/api/sessions/${session.id}`)
        .set('Authorization', coachToken)
        .expect(200);

      // User2 cannot access User1's session
      await request(app.getHttpServer())
        .get(`/api/sessions/${session.id}`)
        .set('Authorization', user2Token)
        .expect(403);
    });
  });

  describe('Validation Middleware Pipeline', () => {
    it('should validate request bodies across modules', async () => {
      // Arrange
      const user = await testHelper.createTestUser();
      const coach = await testHelper.createTestCoach();
      const userToken = testHelper.createTestJwtToken({ sub: user.id, type: 'user' });
      const coachToken = testHelper.createTestJwtToken({ sub: coach.id, type: 'coach' });

      // Act & Assert - Test validation across different modules

      // Invalid session creation
      await request(app.getHttpServer())
        .post('/api/sessions')
        .set('Authorization', userToken)
        .send({
          // Missing required fields
          notes: 'Invalid session',
        })
        .expect(400);

      // Invalid booking type creation
      await request(app.getHttpServer())
        .post('/api/booking-types')
        .set('Authorization', coachToken)
        .send({
          // Missing required fields
          description: 'Invalid booking type',
        })
        .expect(400);

      // Invalid message creation
      await request(app.getHttpServer())
        .post('/api/messages')
        .set('Authorization', userToken)
        .send({
          // Missing required fields
          content: '',
        })
        .expect(400);
    });

    it('should transform and sanitize request data', async () => {
      // Arrange
      const coach = await testHelper.createTestCoach();
      const coachToken = testHelper.createTestJwtToken({ sub: coach.id, type: 'coach' });

      // Act - Send request with extra fields and type coercion needed
      const response = await request(app.getHttpServer())
        .post('/api/booking-types')
        .set('Authorization', coachToken)
        .send({
          name: 'Test Booking Type',
          description: 'Test description',
          basePrice: '100', // String that should be converted to number
          extraField: 'should be removed', // Should be filtered out
        })
        .expect(201);

      // Assert - Verify transformation and sanitization
      expect(response.body.name).toBe('Test Booking Type');
      expect(response.body.basePrice).toBe(100); // Should be number
      expect(response.body).not.toHaveProperty('extraField'); // Should be removed
    });

    it('should handle validation errors consistently across modules', async () => {
      // Arrange
      const user = await testHelper.createTestUser();
      const coach = await testHelper.createTestCoach();
      const userToken = testHelper.createTestJwtToken({ sub: user.id, type: 'user' });
      const coachToken = testHelper.createTestJwtToken({ sub: coach.id, type: 'coach' });

      // Act & Assert - Test consistent validation error format
      const invalidRequests = [
        {
          endpoint: '/api/sessions',
          token: userToken,
          data: { invalidField: 'value' },
        },
        {
          endpoint: '/api/booking-types',
          token: coachToken,
          data: { basePrice: -10 }, // Invalid negative price
        },
        {
          endpoint: '/api/messages',
          token: userToken,
          data: { content: '' }, // Empty content
        },
      ];

      for (const req of invalidRequests) {
        const response = await request(app.getHttpServer())
          .post(req.endpoint)
          .set('Authorization', req.token)
          .send(req.data);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('statusCode', 400);
      }
    });
  });

  describe('Error Handling Middleware Pipeline', () => {
    it('should handle 404 errors consistently across modules', async () => {
      // Arrange
      const user = await testHelper.createTestUser();
      const token = testHelper.createTestJwtToken({ sub: user.id, type: 'user' });

      // Act & Assert - Test 404 handling across modules
      const notFoundEndpoints = [
        '/api/sessions/non-existent-id',
        '/api/users/non-existent-id',
        '/api/booking-types/non-existent-id',
        '/api/messages/session/non-existent-session',
      ];

      for (const endpoint of notFoundEndpoints) {
        const response = await request(app.getHttpServer())
          .get(endpoint)
          .set('Authorization', token);

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('statusCode', 404);
      }
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const user = await testHelper.createTestUser();
      const coach = await testHelper.createTestCoach();
      const token = testHelper.createTestJwtToken({ sub: user.id, type: 'user' });

      // Create a session with invalid foreign key reference
      const invalidSessionData = {
        bookingTypeId: 'non-existent-booking-type',
        timeSlotId: 'non-existent-time-slot',
        notes: 'This should fail gracefully',
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/sessions')
        .set('Authorization', token)
        .send(invalidSessionData);

      // Assert - Should handle database error gracefully
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
      expect(response.body).toHaveProperty('message');
    });

    it('should handle concurrent request errors', async () => {
      // Arrange
      const user = await testHelper.createTestUser();
      const coach = await testHelper.createTestCoach();
      const token = testHelper.createTestJwtToken({ sub: user.id, type: 'user' });

      // Act - Send multiple concurrent invalid requests
      const invalidRequests = Array.from({ length: 5 }, () =>
        request(app.getHttpServer())
          .get('/api/sessions/non-existent-id')
          .set('Authorization', token)
      );

      const responses = await Promise.all(invalidRequests);

      // Assert - All should handle errors consistently
      responses.forEach(response => {
        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('statusCode', 404);
      });
    });
  });

  describe('Request/Response Transformation Pipeline', () => {
    it('should handle request transformation across modules', async () => {
      // Arrange
      const coach = await testHelper.createTestCoach();
      const token = testHelper.createTestJwtToken({ sub: coach.id, type: 'coach' });

      // Act - Send request with various data types
      const response = await request(app.getHttpServer())
        .post('/api/booking-types')
        .set('Authorization', token)
        .send({
          name: '  Test Booking Type  ', // Should be trimmed
          description: 'Test description',
          basePrice: '75.50', // String to number conversion
          isActive: 'true', // String to boolean conversion
        })
        .expect(201);

      // Assert - Verify transformations
      expect(response.body.name).toBe('Test Booking Type'); // Trimmed
      expect(response.body.basePrice).toBe(75.5); // Converted to number
      expect(response.body.isActive).toBe(true); // Converted to boolean
    });

    it('should handle response serialization consistently', async () => {
      // Arrange
      const user = await testHelper.createTestUser();
      const coach = await testHelper.createTestCoach();
      const session = await testHelper.createTestSession({
        userId: user.id,
        coachId: coach.id,
      });

      const token = testHelper.createTestJwtToken({ sub: user.id, type: 'user' });

      // Act - Get session data
      const response = await request(app.getHttpServer())
        .get(`/api/sessions/${session.id}`)
        .set('Authorization', token)
        .expect(200);

      // Assert - Verify response structure and serialization
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('dateTime');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('coach');

      // Verify nested object serialization
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('name');
      expect(response.body.user).not.toHaveProperty('password'); // Should be excluded

      expect(response.body.coach).toHaveProperty('id');
      expect(response.body.coach).toHaveProperty('name');
      expect(response.body.coach).not.toHaveProperty('password'); // Should be excluded
    });

    it('should handle content-type headers correctly', async () => {
      // Arrange
      const user = await testHelper.createTestUser();
      const token = testHelper.createTestJwtToken({ sub: user.id, type: 'user' });

      // Act - Make various requests
      const jsonResponse = await request(app.getHttpServer())
        .get('/api/sessions')
        .set('Authorization', token)
        .expect(200);

      // Assert - Verify content-type headers
      expect(jsonResponse.headers['content-type']).toMatch(/application\/json/);
      expect(jsonResponse.body).toBeInstanceOf(Array);
    });
  });

  describe('Performance and Reliability Pipeline', () => {
    it('should handle high-frequency requests without degradation', async () => {
      // Arrange
      const user = await testHelper.createTestUser();
      const token = testHelper.createTestJwtToken({ sub: user.id, type: 'user' });

      // Act - Send multiple concurrent requests
      const requests = Array.from({ length: 20 }, () =>
        request(app.getHttpServer())
          .get('/api/sessions')
          .set('Authorization', token)
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      // Assert - All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toBeInstanceOf(Array);
      });

      // Performance should be reasonable
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should maintain middleware order under load', async () => {
      // Arrange
      const user = await testHelper.createTestUser();
      const validToken = testHelper.createTestJwtToken({ sub: user.id, type: 'user' });

      // Act - Mix valid and invalid requests
      const mixedRequests = [
        // Valid requests
        ...Array.from({ length: 5 }, () =>
          request(app.getHttpServer())
            .get('/api/sessions')
            .set('Authorization', validToken)
        ),
        // Invalid requests (no auth)
        ...Array.from({ length: 5 }, () =>
          request(app.getHttpServer())
            .get('/api/sessions')
        ),
        // Invalid requests (bad token)
        ...Array.from({ length: 5 }, () =>
          request(app.getHttpServer())
            .get('/api/sessions')
            .set('Authorization', 'Bearer invalid-token')
        ),
      ];

      const responses = await Promise.all(mixedRequests);

      // Assert - Middleware should handle all requests correctly
      const successfulResponses = responses.filter(r => r.status === 200);
      const unauthorizedResponses = responses.filter(r => r.status === 401);

      expect(successfulResponses).toHaveLength(5);
      expect(unauthorizedResponses).toHaveLength(10);
    });
  });
});

