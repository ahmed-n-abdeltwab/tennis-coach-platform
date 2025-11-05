/**
 * Integration tests for Messages module
 * Tests message sending workflows and database interactions
 */

import { MessagesModule } from '@app/messages/messages.modu';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { BaseIntegrationTest } from '../utils/base/base-integration.test';
import { CoachMockFactory } from '../utils/factories/coach.factory';
import { MessageMockFactory } from '../utils/factories/message.factory';
import { SessionMockFactory } from '../utils/factories/session.factory';
import { UserMockFactory } from '../utils/factories/user.factory';

describe('Messages Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let messageFactory: MessageMockFactory;
  let sessionFactory: SessionMockFactory;
  let userFactory: UserMockFactory;
  let coachFactory: CoachMockFactory;

  class MessagesIntegrationTest extends BaseIntegrationTest {
    async setupTestApp(): Promise<void> {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [MessagesModule, PrismaModule],
      }).compile();

      this.app = moduleFixture.createNestApplication();
      this.app.setGlobalPrefix('api');
      await this.app.init();

      this.prisma = moduleFixture.get<PrismaService>(PrismaService);
    }
  }

  let testHelper: MessagesIntegrationTest;

  beforeAll(async () => {
    testHelper = new MessagesIntegrationTest();
    await testHelper.setupTestApp();

    app = testHelper.app;
    prisma = testHelper.prisma;
    messageFactory = new MessageMockFactory();
    sessionFactory = new SessionMockFactory();
    userFactory = new UserMockFactory();
    coachFactory = new CoachMockFactory();
  });

  afterAll(async () => {
    await testHelper.cleanup();
  });

  beforeEach(async () => {
    await testHelper.cleanupDatabase();
  });

  describe('POST /api/messages', () => {
    it('should create a message from user to coach', async () => {
      // Arrange
      const user = await testHelper.createTestUser();
      const coach = await testHelper.createTestCoach();
      const session = await testHelper.createTestSession({ userId: user.id, coachId: coach.id });

      const messageData = {
        content: 'Hello coach, I have a question about my technique.',
        sessionId: session.id,
        receiverType: 'coach',
      };

      const token = testHelper.createTestJwtToken({ sub: user.id, type: 'user' });

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/messages')
        .set('Authorization', `Bearer ${token}`)
        .send(messageData)
        .expect(201);

      // Assert
      expect(response.body).toMatchObject({
        content: messageData.content,
        sessionId: session.id,
        senderType: 'user',
        senderUserId: user.id,
        receiverType: 'coach',
        receiverCoachId: coach.id,
      });

      // Verify in database
      const savedMessage = await prisma.message.findUnique({
        where: { id: response.body.id },
      });
      expect(savedMessage).toBeTruthy();
      expect(savedMessage.content).toBe(messageData.content);
    });

    it('should create a message from coach to user', async () => {
      // Arrange
      const user = await testHelper.createTestUser();
      const coach = await testHelper.createTestCoach();
      const session = await testHelper.createTestSession({ userId: user.id, coachId: coach.id });

      const messageData = {
        content: "Great progress in today's session!",
        sessionId: session.id,
        receiverType: 'user',
      };

      const token = testHelper.createTestJwtToken({ sub: coach.id, type: 'coach' });

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/messages')
        .set('Authorization', `Bearer ${token}`)
        .send(messageData)
        .expect(201);

      // Assert
      expect(response.body).toMatchObject({
        content: messageData.content,
        sessionId: session.id,
        senderType: 'coach',
        senderCoachId: coach.id,
        receiverType: 'user',
        receiverUserId: user.id,
      });
    });

    it('should return 404 when session does not exist', async () => {
      // Arrange
      const user = await testHelper.createTestUser();
      const messageData = {
        content: 'Hello!',
        sessionId: 'non-existent-session',
        receiverType: 'coach',
      };

      const token = testHelper.createTestJwtToken({ sub: user.id, type: 'user' });

      // Act & Assert
      await request(app.getHttpServer())
        .post('/api/messages')
        .set('Authorization', `Bearer ${token}`)
        .send(messageData)
        .expect(404);
    });

    it('should return 403 when user has no access to session', async () => {
      // Arrange
      const user1 = await testHelper.createTestUser();
      const user2 = await testHelper.createTestUser();
      const coach = await testHelper.createTestCoach();
      const session = await testHelper.createTestSession({ userId: user1.id, coachId: coach.id });

      const messageData = {
        content: 'Hello!',
        sessionId: session.id,
        receiverType: 'coach',
      };

      const token = testHelper.createTestJwtToken({ sub: user2.id, type: 'user' });

      // Act & Assert
      await request(app.getHttpServer())
        .post('/api/messages')
        .set('Authorization', `Bearer ${token}`)
        .send(messageData)
        .expect(403);
    });

    it('should return 401 when not authenticated', async () => {
      // Arrange
      const messageData = {
        content: 'Hello!',
        sessionId: 'session-123',
        receiverType: 'coach',
      };

      // Act & Assert
      await request(app.getHttpServer()).post('/api/messages').send(messageData).expect(401);
    });
  });

  describe('GET /api/messages/session/:sessionId', () => {
    it('should return messages for a session with user access', async () => {
      // Arrange
      const user = await testHelper.createTestUser();
      const coach = await testHelper.createTestCoach();
      const session = await testHelper.createTestSession({ userId: user.id, coachId: coach.id });

      // Create test messages
      await testHelper.createTestMessage({
        sessionId: session.id,
        senderType: 'user',
        senderUserId: user.id,
        receiverType: 'coach',
        receiverCoachId: coach.id,
        content: 'First message',
      });

      await testHelper.createTestMessage({
        sessionId: session.id,
        senderType: 'coach',
        senderCoachId: coach.id,
        receiverType: 'user',
        receiverUserId: user.id,
        content: 'Second message',
      });

      const token = testHelper.createTestJwtToken({ sub: user.id, type: 'user' });

      // Act
      const response = await request(app.getHttpServer())
        .get(`/api/messages/session/${session.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('content');
      expect(response.body[0]).toHaveProperty('sessionId', session.id);
      expect(response.body[0]).toHaveProperty('sentAt');
    });

    it('should return messages for a session with coach access', async () => {
      // Arrange
      const user = await testHelper.createTestUser();
      const coach = await testHelper.createTestCoach();
      const session = await testHelper.createTestSession({ userId: user.id, coachId: coach.id });

      await testHelper.createTestMessage({
        sessionId: session.id,
        senderType: 'user',
        senderUserId: user.id,
        receiverType: 'coach',
        receiverCoachId: coach.id,
        content: 'Message from user',
      });

      const token = testHelper.createTestJwtToken({ sub: coach.id, type: 'coach' });

      // Act
      const response = await request(app.getHttpServer())
        .get(`/api/messages/session/${session.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(response.body).toHaveLength(1);
      expect(response.body[0].content).toBe('Message from user');
    });

    it('should handle pagination correctly', async () => {
      // Arrange
      const user = await testHelper.createTestUser();
      const coach = await testHelper.createTestCoach();
      const session = await testHelper.createTestSession({ userId: user.id, coachId: coach.id });

      // Create multiple messages
      for (let i = 0; i < 5; i++) {
        await testHelper.createTestMessage({
          sessionId: session.id,
          senderType: 'user',
          senderUserId: user.id,
          receiverType: 'coach',
          receiverCoachId: coach.id,
          content: `Message ${i + 1}`,
        });
      }

      const token = testHelper.createTestJwtToken({ sub: user.id, type: 'user' });

      // Act
      const response = await request(app.getHttpServer())
        .get(`/api/messages/session/${session.id}`)
        .query({ page: 1, limit: 3 })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(response.body).toHaveLength(3);
    });

    it('should return 404 when session does not exist', async () => {
      // Arrange
      const user = await testHelper.createTestUser();
      const token = testHelper.createTestJwtToken({ sub: user.id, type: 'user' });

      // Act & Assert
      await request(app.getHttpServer())
        .get('/api/messages/session/non-existent-session')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('should return 403 when user has no access to session', async () => {
      // Arrange
      const user1 = await testHelper.createTestUser();
      const user2 = await testHelper.createTestUser();
      const coach = await testHelper.createTestCoach();
      const session = await testHelper.createTestSession({ userId: user1.id, coachId: coach.id });

      const token = testHelper.createTestJwtToken({ sub: user2.id, type: 'user' });

      // Act & Assert
      await request(app.getHttpServer())
        .get(`/api/messages/session/${session.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('should return 401 when not authenticated', async () => {
      // Act & Assert
      await request(app.getHttpServer()).get('/api/messages/session/session-123').expect(401);
    });
  });
});

