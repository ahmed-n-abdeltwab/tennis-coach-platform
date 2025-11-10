/**
 * Integration tests for Messages module
 * Tests message sending workflows and database interactions
 */

import { todo } from 'node:test';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { MessagesModule } from '../../src/app/messages/messages.module';
import { PrismaModule } from '../../src/app/prisma/prisma.module';
import { PrismaService } from '../../src/app/prisma/prisma.service';
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
    override getTestModules(): any[] {
      return [MessagesModule, PrismaModule];
    }
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

    // app = testHelper.app;
    // prisma = testHelper.prisma;
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
    todo('should create a message from user to coach');

    todo('should create a message from coach to user');

    todo('should return 404 when session does not exist');

    todo('should return 403 when user has no access to session');

    todo('should return 401 when not authenticated');
  });

  describe('GET /api/messages/session/:sessionId', () => {
    todo('should return messages for a session with user access');

    todo('should return messages for a session with coach access');

    todo('should handle pagination correctly');

    todo('should return 404 when session does not exist');

    todo('should return 403 when user has no access to session');

    todo('should return 401 when not authenticated');
  });
});
