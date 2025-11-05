/**
 * Cross-Module Integration Tests
 * Tests service-to-service interactions, module communication, and dependency injection
 */

import { AuthModule } from '@app/auth/auth.module';
import { BookingTypesModule } from '@app/booking-types/booking-types.module';
import { CalendarModule } from '@app/calendar/calendar.module';
import { CoachesModule } from '@app/coaches/coaches.module';
import { DiscountsModule } from '@app/discounts/discounts.module';
import { MessagesModule } from '@app/messages/messages.module';
import { NotificationsModule } from '@app/notifications/notifications.module';
import { PaymentsModule } from '@app/payments/payments.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { SessionsModule } from '@app/sessions/sessions.module';
import { TimeSlotsModule } from '@app/time-slots/time-slots.module';
import { UsersModule } from '@app/users/users.module';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { BaseIntegrationTest } from '@test-utils/base/base-integration.test';
import request from 'supertest';

describe('Cross-Module Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let module: TestingModule;

  class CrossModuleIntegrationTest extends BaseIntegrationTest {
    async setupTestApp(): Promise<void> {
      this.module = await Test.createTestingModule({
        imports: this.getTestModules(),
      }).compile();

      this.app = this.module.createNestApplication();
      this.app.setGlobalPrefix('api');
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
        TimeSlotsModule,
        DiscountsModule,
        MessagesModule,
        PaymentsModule,
        CalendarModule,
        NotificationsModule,
      ];
    }
  }

  let testHelper: CrossModuleIntegrationTest;

  beforeAll(async () => {
    testHelper = new CrossModuleIntegrationTest();
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

  describe('Service-to-Service Interactions', () => {
    it('should handle session creation with discount service interaction', async () => {
      // Arrange - Create test data
      const user = await testHelper.createTestUser();
      const coach = await testHelper.createTestCoach();

      const bookingType = await prisma.bookingType.create({
        data: {
          name: 'Premium Lesson',
          description: 'High-quality coaching',
          basePrice: 100,
          coachId: coach.id,
          isActive: true,
        },
      });

      const timeSlot = await prisma.timeSlot.create({
        data: {
          coachId: coach.id,
          dateTime: new Date('2024-12-25T10:00:00Z'),
          durationMin: 60,
          isAvailable: true,
        },
      });

      const discount = await prisma.discount.create({
        data: {
          code: 'SAVE20',
          amount: 20,
          isActive: true,
          expiry: new Date('2025-12-31'),
          useCount: 0,
        },
      });

      const token = testHelper.createTestJwtToken({ sub: user.id, type: 'user' });

      // Act - Create session with discount
      const sessionData = {
        bookingTypeId: bookingType.id,
        timeSlotId: timeSlot.id,
        discountCode: 'SAVE20',
        notes: 'Using discount code',
      };

      const response = await request(app.getHttpServer())
        .post('/api/sessions')
        .set('Authorization', `Bearer ${token}`)
        .send(sessionData)
        .expect(201);

      // Assert - Verify cross-service interaction
      expect(response.body.price).toBe(80); // 100 - 20 discount
      expect(response.body.discountCode).toBe('SAVE20');

      // Verify discount service updated usage count
      const updatedDiscount = await prisma.discount.findUnique({
        where: { code: 'SAVE20' },
      });
      expect(updatedDiscount?.useCount).toBe(1);

      // Verify time slot service marked slot as unavailable
      const updatedTimeSlot = await prisma.timeSlot.findUnique({
        where: { id: timeSlot.id },
      });
      expect(updatedTimeSlot?.isAvailable).toBe(false);
    });

    it('should handle message creation with session service validation', async () => {
      // Arrange
      const user = await testHelper.createTestUser();
      const coach = await testHelper.createTestCoach();
      const session = await testHelper.createTestSession({
        userId: user.id,
        coachId: coach.id,
      });

      const token = testHelper.createTestJwtToken({ sub: user.id, type: 'user' });

      // Act - Create message (requires session service validation)
      const messageData = {
        content: 'Hello coach!',
        sessionId: session.id,
        receiverType: 'coach',
      };

      const response = await request(app.getHttpServer())
        .post('/api/messages')
        .set('Authorization', `Bearer ${token}`)
        .send(messageData)
        .expect(201);

      // Assert - Verify cross-service validation worked
      expect(response.body.content).toBe('Hello coach!');
      expect(response.body.sessionId).toBe(session.id);
      expect(response.body.senderUserId).toBe(user.id);
      expect(response.body.receiverCoachId).toBe(coach.id);
    });

    it('should handle payment processing with session and discount services', async () => {
      // Arrange
      const user = await testHelper.createTestUser();
      const coach = await testHelper.createTestCoach();

      const bookingType = await prisma.bookingType.create({
        data: {
          name: 'Standard Lesson',
          basePrice: 75,
          coachId: coach.id,
          isActive: true,
        },
      });

      const session = await prisma.session.create({
        data: {
          userId: user.id,
          coachId: coach.id,
          bookingTypeId: bookingType.id,
          dateTime: new Date('2024-12-25T10:00:00Z'),
          durationMin: 60,
          price: 75,
          status: 'scheduled',
        },
      });

      const token = testHelper.createTestJwtToken({ sub: user.id, type: 'user' });

      // Act - Process payment
      const paymentData = {
        sessionId: session.id,
        amount: 75,
        paymentMethod: 'card',
        cardToken: 'test_card_token',
      };

      const response = await request(app.getHttpServer())
        .post('/api/payments')
        .set('Authorization', `Bearer ${token}`)
        .send(paymentData)
        .expect(201);

      // Assert - Verify cross-service interaction
      expect(response.body.amount).toBe(75);
      expect(response.body.sessionId).toBe(session.id);
      expect(response.body.status).toBe('completed');

      // Verify session status was updated
      const updatedSession = await prisma.session.findUnique({
        where: { id: session.id },
      });
      expect(updatedSession?.status).toBe('paid');
    });
  });

  describe('Module Communication and Dependency Injection', () => {
    it('should properly inject dependencies across modules', async () => {
      // Test that services can access other module services through DI
      const sessionsService = module.get('SessionsService');
      const messagesService = module.get('MessagesService');
      const paymentsService = module.get('PaymentsService');
      const discountsService = module.get('DiscountsService');

      // Verify all services are properly injected
      expect(sessionsService).toBeDefined();
      expect(messagesService).toBeDefined();
      expect(paymentsService).toBeDefined();
      expect(discountsService).toBeDefined();

      // Verify they all have access to PrismaService
      expect(sessionsService.prisma).toBeDefined();
      expect(messagesService.prisma).toBeDefined();
      expect(paymentsService.prisma).toBeDefined();
      expect(discountsService.prisma).toBeDefined();
    });

    it('should handle complex workflow with multiple module interactions', async () => {
      // Arrange - Create complete booking workflow data
      const user = await testHelper.createTestUser();
      const coach = await testHelper.createTestCoach();

      const bookingType = await prisma.bookingType.create({
        data: {
          name: 'Group Session',
          basePrice: 50,
          coachId: coach.id,
          isActive: true,
        },
      });

      const timeSlot = await prisma.timeSlot.create({
        data: {
          coachId: coach.id,
          dateTime: new Date('2024-12-26T14:00:00Z'),
          durationMin: 90,
          isAvailable: true,
        },
      });

      const userToken = testHelper.createTestJwtToken({ sub: user.id, type: 'user' });
      const coachToken = testHelper.createTestJwtToken({ sub: coach.id, type: 'coach' });

      // Act & Assert - Execute multi-step workflow

      // Step 1: User creates session
      const sessionResponse = await request(app.getHttpServer())
        .post('/api/sessions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          bookingTypeId: bookingType.id,
          timeSlotId: timeSlot.id,
          notes: 'Looking forward to group session',
        })
        .expect(201);

      const sessionId = sessionResponse.body.id;

      // Step 2: User sends message to coach
      const messageResponse = await request(app.getHttpServer())
        .post('/api/messages')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'What should I bring to the session?',
          sessionId,
          receiverType: 'coach',
        })
        .expect(201);

      expect(messageResponse.body.sessionId).toBe(sessionId);

      // Step 3: Coach responds to message
      const coachMessageResponse = await request(app.getHttpServer())
        .post('/api/messages')
        .set('Authorization', `Bearer ${coachToken}`)
        .send({
          content: 'Just bring your racket and water!',
          sessionId,
          receiverType: 'user',
        })
        .expect(201);

      expect(coachMessageResponse.body.sessionId).toBe(sessionId);

      // Step 4: User processes payment
      const paymentResponse = await request(app.getHttpServer())
        .post('/api/payments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          sessionId,
          amount: 50,
          paymentMethod: 'card',
          cardToken: 'test_card_token',
        })
        .expect(201);

      expect(paymentResponse.body.sessionId).toBe(sessionId);

      // Step 5: Verify all modules updated correctly
      const finalSession = await prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          messages: true,
          payment: true,
        },
      });

      expect(finalSession?.status).toBe('paid');
      expect(finalSession?.messages).toHaveLength(2);
      expect(finalSession?.payment).toBeDefined();
    });
  });

  describe('Database Transaction Handling Across Modules', () => {
    it('should handle transaction rollback when cross-module operation fails', async () => {
      // Arrange
      const user = await testHelper.createTestUser();
      const coach = await testHelper.createTestCoach();

      const bookingType = await prisma.bookingType.create({
        data: {
          name: 'Test Lesson',
          basePrice: 100,
          coachId: coach.id,
          isActive: true,
        },
      });

      // Create an unavailable time slot
      const timeSlot = await prisma.timeSlot.create({
        data: {
          coachId: coach.id,
          dateTime: new Date('2024-12-25T10:00:00Z'),
          durationMin: 60,
          isAvailable: false, // Already booked
        },
      });

      const token = testHelper.createTestJwtToken({ sub: user.id, type: 'user' });

      // Act - Try to create session with unavailable slot
      await request(app.getHttpServer())
        .post('/api/sessions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          bookingTypeId: bookingType.id,
          timeSlotId: timeSlot.id,
          notes: 'This should fail',
        })
        .expect(400);

      // Assert - Verify no partial data was created
      const sessions = await prisma.session.findMany({
        where: { userId: user.id },
      });
      expect(sessions).toHaveLength(0);

      // Verify time slot status unchanged
      const unchangedTimeSlot = await prisma.timeSlot.findUnique({
        where: { id: timeSlot.id },
      });
      expect(unchangedTimeSlot?.isAvailable).toBe(false);
    });

    it('should handle concurrent session bookings with proper transaction isolation', async () => {
      // Arrange
      const user1 = await testHelper.createTestUser();
      const user2 = await testHelper.createTestUser();
      const coach = await testHelper.createTestCoach();

      const bookingType = await prisma.bookingType.create({
        data: {
          name: 'Popular Lesson',
          basePrice: 75,
          coachId: coach.id,
          isActive: true,
        },
      });

      const timeSlot = await prisma.timeSlot.create({
        data: {
          coachId: coach.id,
          dateTime: new Date('2024-12-25T15:00:00Z'),
          durationMin: 60,
          isAvailable: true,
        },
      });

      const token1 = testHelper.createTestJwtToken({ sub: user1.id, type: 'user' });
      const token2 = testHelper.createTestJwtToken({ sub: user2.id, type: 'user' });

      // Act - Simulate concurrent booking attempts
      const sessionData = {
        bookingTypeId: bookingType.id,
        timeSlotId: timeSlot.id,
        notes: 'Concurrent booking test',
      };

      const [response1, response2] = await Promise.allSettled([
        request(app.getHttpServer())
          .post('/api/sessions')
          .set('Authorization', `Bearer ${token1}`)
          .send(sessionData),
        request(app.getHttpServer())
          .post('/api/sessions')
          .set('Authorization', `Bearer ${token2}`)
          .send(sessionData),
      ]);

      // Assert - Only one booking should succeed
      const successfulResponses = [response1, response2].filter(
        result => result.status === 'fulfilled' && result.value.status === 201
      );
      const failedResponses = [response1, response2].filter(
        result => result.status === 'fulfilled' && result.value.status === 400
      );

      expect(successfulResponses).toHaveLength(1);
      expect(failedResponses).toHaveLength(1);

      // Verify only one session was created
      const sessions = await prisma.session.findMany({
        where: { timeSlotId: timeSlot.id },
      });
      expect(sessions).toHaveLength(1);

      // Verify time slot is now unavailable
      const updatedTimeSlot = await prisma.timeSlot.findUnique({
        where: { id: timeSlot.id },
      });
      expect(updatedTimeSlot?.isAvailable).toBe(false);
    });

    it('should handle complex transaction with multiple table updates', async () => {
      // Arrange
      const user = await testHelper.createTestUser();
      const coach = await testHelper.createTestCoach();

      const bookingType = await prisma.bookingType.create({
        data: {
          name: 'Premium Package',
          basePrice: 200,
          coachId: coach.id,
          isActive: true,
        },
      });

      const timeSlot = await prisma.timeSlot.create({
        data: {
          coachId: coach.id,
          dateTime: new Date('2024-12-27T11:00:00Z'),
          durationMin: 120,
          isAvailable: true,
        },
      });

      const discount = await prisma.discount.create({
        data: {
          code: 'PREMIUM50',
          amount: 50,
          isActive: true,
          expiry: new Date('2025-12-31'),
          useCount: 0,
        },
      });

      const token = testHelper.createTestJwtToken({ sub: user.id, type: 'user' });

      // Act - Create session with discount (involves multiple table updates)
      const response = await request(app.getHttpServer())
        .post('/api/sessions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          bookingTypeId: bookingType.id,
          timeSlotId: timeSlot.id,
          discountCode: 'PREMIUM50',
          notes: 'Premium session with discount',
        })
        .expect(201);

      // Assert - Verify all related data was updated atomically
      expect(response.body.price).toBe(150); // 200 - 50 discount

      // Verify session was created
      const session = await prisma.session.findUnique({
        where: { id: response.body.id },
      });
      expect(session).toBeDefined();
      expect(session?.discountCode).toBe('PREMIUM50');

      // Verify time slot was marked unavailable
      const updatedTimeSlot = await prisma.timeSlot.findUnique({
        where: { id: timeSlot.id },
      });
      expect(updatedTimeSlot?.isAvailable).toBe(false);

      // Verify discount usage was incremented
      const updatedDiscount = await prisma.discount.findUnique({
        where: { code: 'PREMIUM50' },
      });
      expect(updatedDiscount?.useCount).toBe(1);
    });
  });

  describe('Event Handling and Message Passing', () => {
    it('should handle session status changes triggering notifications', async () => {
      // Arrange
      const user = await testHelper.createTestUser();
      const coach = await testHelper.createTestCoach();
      const session = await testHelper.createTestSession({
        userId: user.id,
        coachId: coach.id,
        status: 'scheduled',
      });

      const token = testHelper.createTestJwtToken({ sub: coach.id, type: 'coach' });

      // Act - Update session status
      const response = await request(app.getHttpServer())
        .put(`/api/sessions/${session.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: 'completed',
          notes: 'Great session!',
        })
        .expect(200);

      // Assert - Verify status change
      expect(response.body.status).toBe('completed');
      expect(response.body.notes).toBe('Great session!');

      // Verify database was updated
      const updatedSession = await prisma.session.findUnique({
        where: { id: session.id },
      });
      expect(updatedSession?.status).toBe('completed');
    });

    it('should handle message creation triggering real-time updates', async () => {
      // Arrange
      const user = await testHelper.createTestUser();
      const coach = await testHelper.createTestCoach();
      const session = await testHelper.createTestSession({
        userId: user.id,
        coachId: coach.id,
      });

      const token = testHelper.createTestJwtToken({ sub: user.id, type: 'user' });

      // Act - Send message
      const messageResponse = await request(app.getHttpServer())
        .post('/api/messages')
        .set('Authorization', `Bearer ${token}`)
        .send({
          content: 'Quick question about technique',
          sessionId: session.id,
          receiverType: 'coach',
        })
        .expect(201);

      // Assert - Verify message was created
      expect(messageResponse.body.content).toBe('Quick question about technique');
      expect(messageResponse.body.sessionId).toBe(session.id);

      // Verify message can be retrieved
      const messagesResponse = await request(app.getHttpServer())
        .get(`/api/messages/session/${session.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(messagesResponse.body).toHaveLength(1);
      expect(messagesResponse.body[0].content).toBe('Quick question about technique');
    });
  });

  describe('Middleware Integration and Request/Response Pipeline', () => {
    it('should handle authentication middleware across all modules', async () => {
      // Test that authentication is properly enforced across all endpoints
      const endpoints = [
        { method: 'get', path: '/api/sessions' },
        { method: 'post', path: '/api/sessions' },
        { method: 'get', path: '/api/messages/session/test-id' },
        { method: 'post', path: '/api/messages' },
        { method: 'post', path: '/api/payments' },
        { method: 'get', path: '/api/booking-types' },
        { method: 'post', path: '/api/booking-types' },
      ];

      // Act & Assert - All endpoints should require authentication
      for (const endpoint of endpoints) {
        await request(app.getHttpServer())[endpoint.method](endpoint.path).expect(401);
      }
    });

    it('should handle authorization middleware for role-based access', async () => {
      // Arrange
      const user = await testHelper.createTestUser();
      const coach = await testHelper.createTestCoach();
      const otherUser = await testHelper.createTestUser();

      const session = await testHelper.createTestSession({
        userId: user.id,
        coachId: coach.id,
      });

      const userToken = testHelper.createTestJwtToken({ sub: user.id, type: 'user' });
      const coachToken = testHelper.createTestJwtToken({ sub: coach.id, type: 'coach' });
      const otherUserToken = testHelper.createTestJwtToken({ sub: otherUser.id, type: 'user' });

      // Act & Assert - Test role-based access

      // User can access their own session
      await request(app.getHttpServer())
        .get(`/api/sessions/${session.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Coach can access their session
      await request(app.getHttpServer())
        .get(`/api/sessions/${session.id}`)
        .set('Authorization', `Bearer ${coachToken}`)
        .expect(200);

      // Other user cannot access the session
      await request(app.getHttpServer())
        .get(`/api/sessions/${session.id}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);
    });

    it('should handle validation middleware across modules', async () => {
      // Arrange
      const user = await testHelper.createTestUser();
      const token = testHelper.createTestJwtToken({ sub: user.id, type: 'user' });

      // Act & Assert - Test validation middleware

      // Invalid session creation data
      await request(app.getHttpServer())
        .post('/api/sessions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          // Missing required fields
          notes: 'Invalid session data',
        })
        .expect(400);

      // Invalid message data
      await request(app.getHttpServer())
        .post('/api/messages')
        .set('Authorization', `Bearer ${token}`)
        .send({
          // Missing required fields
          content: '',
        })
        .expect(400);

      // Invalid payment data
      await request(app.getHttpServer())
        .post('/api/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          // Missing required fields
          amount: -10, // Invalid amount
        })
        .expect(400);
    });

    it('should handle error handling middleware consistently', async () => {
      // Arrange
      const user = await testHelper.createTestUser();
      const token = testHelper.createTestJwtToken({ sub: user.id, type: 'user' });

      // Act & Assert - Test consistent error handling

      // Non-existent resource
      await request(app.getHttpServer())
        .get('/api/sessions/non-existent-id')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      // Non-existent message session
      await request(app.getHttpServer())
        .get('/api/messages/session/non-existent-session')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      // Invalid payment session
      await request(app.getHttpServer())
        .post('/api/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sessionId: 'non-existent-session',
          amount: 100,
          paymentMethod: 'card',
          cardToken: 'test_token',
        })
        .expect(404);
    });
  });
});

