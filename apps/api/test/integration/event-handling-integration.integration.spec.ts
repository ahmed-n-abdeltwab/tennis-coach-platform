/**
 * Event Handling Integration Tests
 * Tests event handling, message passing, and real-time communication across modules
 */

import { MessagesModule } from '@app/messages/messages.module';
import { NotificationsModule } from '@app/notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { SessionsModule } from '@app/sessions/sessions.module';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { BaseIntegrationTest } from '@test-utils/base/base-integration.test';
import * as request from 'supertest';

describe('Event Handling Integration Tests', () => {
  let createNestApplication;
  let prisma: PrismaService;
  let module: TestingModule;

  class EventHandlingIntegrationTest extends BaseIntegrationTest {
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
        SessionsModule,
        MessagesModule,
        NotificationsModule,
      ];
    }
  }

  let testHelper: EventHandlingIntegrationTest;

  beforeAll(async () => {
    testHelper = new EventHandlingIntegrationTest();
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

  describe('Message Event Handling', () => {
    it('should handle message creation events across sessions', async () => {
      // Arrange
      const user = await testHelper.createTestUser();
      const coach = await testHelper.createTestCoach();
      const session = await testHelper.createTestSession({
        userId: user.id,
        coachId: coach.id,
      });

      const userToken = testHelper.createTestJwtToken({ sub: user.id, role: 'user' });
      const coachToken = testHelper.createTestJwtToken({ sub: coach.id, role: 'coach' });

      // Act - Create message chain
      const message1Response = await request(app.getHttpServer())
        .post('/api/messages')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'Hello coach, when is our next session?',
          sessionId: session.id,
          receiverType: 'coach',
        })
        .expect(201);

      const message2Response = await request(app.getHttpServer())
        .post('/api/messages')
        .set('Authorization', `Bearer ${coachToken}`)
        .send({
          content: 'Hi! Our next session is tomorrow at 3 PM.',
          sessionId: session.id,
          receiverType: 'user',
        })
        .expect(201);

      const message3Response = await request(app.getHttpServer())
        .post('/api/messages')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'Perfect, see you then!',
          sessionId: session.id,
          receiverType: 'coach',
        })
        .expect(201);

      // Assert - Verify message chain
      expect(message1Response.body.senderUserId).toBe(user.id);
      expect(message1Response.body.receiverCoachId).toBe(coach.id);

      expect(message2Response.body.senderCoachId).toBe(coach.id);
      expect(message2Response.body.receiverUserId).toBe(user.id);

      expect(message3Response.body.senderUserId).toBe(user.id);
      expect(message3Response.body.receiverCoachId).toBe(coach.id);

      // Verify all messages are linked to the same session
      const messages = await request(app.getHttpServer())
        .get(`/api/messages/session/${session.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(messages.body).toHaveLength(3);
      messages.body.forEach(message => {
        expect(message.sessionId).toBe(session.id);
      });
    });

    it('should handle concurrent message creation events', async () => {
      // Arrange
      const user = await testHelper.createTestUser();
      const coach = await testHelper.createTestCoach();
      const session = await testHelper.createTestSession({
        userId: user.id,
        coachId: coach.id,
      });

      const userToken = testHelper.createTestJwtToken({ sub: user.id, role: 'user' });
      const coachToken = testHelper.createTestJwtToken({ sub: coach.id, role: 'coach' });

      // Act - Send concurrent messages
      const messagePromises = [
        request(app.getHttpServer())
          .post('/api/messages')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            content: 'Message 1 from user',
            sessionId: session.id,
            receiverType: 'coach',
          }),
        request(app.getHttpServer())
          .post('/api/messages')
          .set('Authorization', `Bearer ${coachToken}`)
          .send({
            content: 'Message 1 from coach',
            sessionId: session.id,
            receiverType: 'user',
          }),
        request(app.getHttpServer())
          .post('/api/messages')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            content: 'Message 2 from user',
            sessionId: session.id,
            receiverType: 'coach',
          }),
      ];

      const responses = await Promise.all(messagePromises);

      // Assert - All messages should be created successfully
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.sessionId).toBe(session.id);
      });

      // Verify all messages are stored
      const messages = await request(app.getHttpServer())
        .get(`/api/messages/session/${session.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(messages.body).toHaveLength(3);
    });
  });

  describe('Session State Change Events', () => {
    it('should handle session status change events', async () => {
      // Arrange
      const user = await testHelper.createTestUser();
      const coach = await testHelper.createTestCoach();
      const session = await testHelper.createTestSession({
        userId: user.id,
        coachId: coach.id,
        status: 'scheduled',
      });

      const coachToken = testHelper.createTestJwtToken({ sub: coach.id, role: 'coach' });

      // Act - Change session status multiple times
      const statusUpdates = [
        { status: 'in_progress', notes: 'Session started' },
        { status: 'completed', notes: 'Session completed successfully' },
      ];

      for (const update of statusUpdates) {
        const response = await request(app.getHttpServer())
          .put(`/api/sessions/${session.id}`)
          .set('Authorization', `Bearer ${coachToken}`)
          .send(update)
          .expect(200);

        expect(response.body.status).toBe(update.status);
        expect(response.body.notes).toBe(update.notes);
      }

      // Assert - Verify final state
      const finalSession = await prisma.session.findUnique({
        where: { id: session.id },
      });
      expect(finalSession?.status).toBe('completed');
      expect(finalSession?.notes).toBe('Session completed successfully');
    });

    it('should handle session cancellation events', async () => {
      // Arrange
      const user = await testHelper.createTestUser();
      const coach = await testHelper.createTestCoach();
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow

      const session = await testHelper.createTestSession({
        userId: user.id,
        coachId: coach.id,
        status: 'scheduled',
        dateTime: futureDate,
      });

      const userToken = testHelper.createTestJwtToken({ sub: user.id, role: 'user' });

      // Act - Cancel session
      const response = await request(app.getHttpServer())
        .put(`/api/sessions/${session.id}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Assert - Verify cancellation
      expect(response.body.status).toBe('cancelled');

      // Verify database state
      const cancelledSession = await prisma.session.findUnique({
        where: { id: session.id },
      });
      expect(cancelledSession?.status).toBe('cancelled');
    });
  });

  describe('Cross-Module Event Propagation', () => {
    it('should propagate events between messages and sessions modules', async () => {
      // Arrange
      const user = await testHelper.createTestUser();
      const coach = await testHelper.createTestCoach();
      const session = await testHelper.createTestSession({
        userId: user.id,
        coachId: coach.id,
      });

      const userToken = testHelper.createTestJwtToken({ sub: user.id, role: 'user' });
      const coachToken = testHelper.createTestJwtToken({ sub: coach.id, role: 'coach' });

      // Act - Create messages and update session
      await request(app.getHttpServer())
        .post('/api/messages')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'Ready for the session!',
          sessionId: session.id,
          receiverType: 'coach',
        })
        .expect(201);

      await request(app.getHttpServer())
        .put(`/api/sessions/${session.id}`)
        .set('Authorization', `Bearer ${coachToken}`)
        .send({
          status: 'in_progress',
          notes: 'Session started',
        })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/messages')
        .set('Authorization', `Bearer ${coachToken}`)
        .send({
          content: 'Great session today!',
          sessionId: session.id,
          receiverType: 'user',
        })
        .expect(201);

      await request(app.getHttpServer())
        .put(`/api/sessions/${session.id}`)
        .set('Authorization', `Bearer ${coachToken}`)
        .send({
          status: 'completed',
          notes: 'Excellent progress made',
        })
        .expect(200);

      // Assert - Verify final state across modules
      const finalSession = await prisma.session.findUnique({
        where: { id: session.id },
        include: { messages: true },
      });

      expect(finalSession?.status).toBe('completed');
      expect(finalSession?.notes).toBe('Excellent progress made');
      expect(finalSession?.messages).toHaveLength(2);
    });

    it('should handle event ordering and consistency', async () => {
      // Arrange
      const user = await testHelper.createTestUser();
      const coach = await testHelper.createTestCoach();
      const session = await testHelper.createTestSession({
        userId: user.id,
        coachId: coach.id,
        status: 'scheduled',
      });

      const userToken = testHelper.createTestJwtToken({ sub: user.id, role: 'user' });
      const coachToken = testHelper.createTestJwtToken({ sub: coach.id, role: 'coach' });

      // Act - Execute rapid sequence of events
      const eventSequence = [
        () =>
          request(app.getHttpServer())
            .post('/api/messages')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
              content: 'Event 1: User message',
              sessionId: session.id,
              receiverType: 'coach',
            }),
        () =>
          request(app.getHttpServer())
            .put(`/api/sessions/${session.id}`)
            .set('Authorization', `Bearer ${coachToken}`)
            .send({
              status: 'in_progress',
              notes: 'Event 2: Session started',
            }),
        () =>
          request(app.getHttpServer())
            .post('/api/messages')
            .set('Authorization', `Bearer ${coachToken}`)
            .send({
              content: 'Event 3: Coach response',
              sessionId: session.id,
              receiverType: 'user',
            }),
        () =>
          request(app.getHttpServer())
            .put(`/api/sessions/${session.id}`)
            .set('Authorization', `Bearer ${coachToken}`)
            .send({
              status: 'completed',
              notes: 'Event 4: Session completed',
            }),
      ];

      // Execute events in sequence
      for (const event of eventSequence) {
        const response = await event();
        expect(response.status).toBeGreaterThanOrEqual(200);
        expect(response.status).toBeLessThan(300);
      }

      // Assert - Verify final consistent state
      const finalSession = await prisma.session.findUnique({
        where: { id: session.id },
        include: { messages: true },
      });

      expect(finalSession?.status).toBe('completed');
      expect(finalSession?.notes).toBe('Event 4: Session completed');
      expect(finalSession?.messages).toHaveLength(2);

      // Verify message order and content
      const messages = finalSession?.messages.sort(
        (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
      );
      expect(messages?.[0].content).toBe('Event 1: User message');
      expect(messages?.[1].content).toBe('Event 3: Coach response');
    });
  });

  describe('Error Event Handling', () => {
    it('should handle and recover from event processing errors', async () => {
      // Arrange
      const user = await testHelper.createTestUser();
      const coach = await testHelper.createTestCoach();
      const session = await testHelper.createTestSession({
        userId: user.id,
        coachId: coach.id,
      });

      const userToken = testHelper.createTestJwtToken({ sub: user.id, role: 'user' });

      // Act - Try to send message to non-existent session
      await request(app.getHttpServer())
        .post('/api/messages')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'This should fail',
          sessionId: 'non-existent-session',
          receiverType: 'coach',
        })
        .expect(404);

      // Verify system can still handle valid requests
      const validResponse = await request(app.getHttpServer())
        .post('/api/messages')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'This should work',
          sessionId: session.id,
          receiverType: 'coach',
        })
        .expect(201);

      // Assert - Valid request succeeded after error
      expect(validResponse.body.content).toBe('This should work');
      expect(validResponse.body.sessionId).toBe(session.id);
    });

    it('should handle authorization errors in event processing', async () => {
      // Arrange
      const user1 = await testHelper.createTestUser();
      const user2 = await testHelper.createTestUser();
      const coach = await testHelper.createTestCoach();
      const session = await testHelper.createTestSession({
        userId: user1.id,
        coachId: coach.id,
      });

      const user1Token = testHelper.createTestJwtToken({ sub: user1.id, role: 'user' });
      const user2Token = testHelper.createTestJwtToken({ sub: user2.id, role: 'user' });

      // Act - User2 tries to send message to User1's session
      await request(app.getHttpServer())
        .post('/api/messages')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          content: 'Unauthorized message',
          sessionId: session.id,
          receiverType: 'coach',
        })
        .expect(403);

      // Verify authorized user can still send messages
      const authorizedResponse = await request(app.getHttpServer())
        .post('/api/messages')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          content: 'Authorized message',
          sessionId: session.id,
          receiverType: 'coach',
        })
        .expect(201);

      // Assert - Authorized request succeeded
      expect(authorizedResponse.body.content).toBe('Authorized message');
      expect(authorizedResponse.body.senderUserId).toBe(user1.id);
    });
  });
});
