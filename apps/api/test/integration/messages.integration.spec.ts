/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Integration tests for Messages module
 * Tests message sending workflows and database interactions
 */

import { Test, TestingModule } from '@nestjs/testing';

import { MessagesModule } from '../../src/app/messages/messages.module';
import { PrismaModule } from '../../src/app/prisma/prisma.module';
import { PrismaService } from '../../src/app/prisma/prisma.service';
import { BaseIntegrationTest } from '../utils/base/base-integration';
import { CoachMockFactory } from '../utils/factories/coach.factory';
import { MessageMockFactory } from '../utils/factories/message.factory';
import { SessionMockFactory } from '../utils/factories/session.factory';
import { UserMockFactory } from '../utils/factories/user.factory';

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
    this.module = moduleFixture;
  }
}

describe('Messages Integration', () => {
  let messageFactory: MessageMockFactory;
  let sessionFactory: SessionMockFactory;
  let userFactory: UserMockFactory;
  let coachFactory: CoachMockFactory;

  let testHelper: MessagesIntegrationTest;

  beforeAll(async () => {
    testHelper = new MessagesIntegrationTest();
    await testHelper.setupTestApp();

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
    it.todo('should create a message from user to coach');

    it.todo('should create a message from coach to user');

    it.todo('should return 404 when session does not exist');

    it.todo('should return 403 when user has no access to session');

    it.todo('should return 401 when not authenticated');
  });

  describe('GET /api/messages/session/:sessionId', () => {
    it.todo('should return messages for a session with user access');

    it.todo('should return messages for a session with coach access');

    it.todo('should handle pagination correctly');

    it.todo('should return 404 when session does not exist');

    it.todo('should return 403 when user has no access to session');

    it.todo('should return 401 when not authenticated');
  });
});
