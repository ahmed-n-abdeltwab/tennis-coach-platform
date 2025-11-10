/**
 * Integration tests for Notifications module
 * Tests notification delivery workflows and email service integration
 */

import { todo } from 'node:test';

import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import notificationsConfig from '../../src/app/notifications/config/notifications.config';
import { NotificationsModule } from '../../src/app/notifications/notifications.module';
import { BaseIntegrationTest } from '../utils/base/base-integration.test';
import { NotificationMockFactory } from '../utils/factories/notification.factory';

// Mock nodemailer
const mockSendMail = jest.fn();
jest.mock('nodemailer', () => ({
  createTransporter: jest.fn(() => ({
    sendMail: mockSendMail,
  })),
}));

// Mock MailtrapTransport
jest.mock('mailtrap', () => ({
  MailtrapTransport: jest.fn(() => ({})),
}));

describe('Notifications Integration', () => {
  let app: INestApplication;
  let notificationFactory: NotificationMockFactory;

  class NotificationsIntegrationTest extends BaseIntegrationTest {
    override getTestModules(): any[] {
      return [NotificationsModule];
    }
    async setupTestApp(): Promise<void> {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            load: [notificationsConfig],
            isGlobal: true,
          }),
          NotificationsModule,
        ],
      }).compile();

      this.app = moduleFixture.createNestApplication();
      this.app.setGlobalPrefix('api');
      await this.app.init();
    }
  }

  let testHelper: NotificationsIntegrationTest;

  beforeAll(async () => {
    testHelper = new NotificationsIntegrationTest();
    await testHelper.setupTestApp();

    // app = testHelper.app;
    notificationFactory = new NotificationMockFactory();
  });

  afterAll(async () => {
    await testHelper.cleanup();
  });

  beforeEach(() => {
    // Reset mocks before each test
    mockSendMail.mockClear();
  });

  describe('POST /api/notifications/email', () => {
    todo('should send email successfully');

    todo('should handle email sending failure');

    todo('should send email with only text content');

    todo('should send email with only HTML content');

    todo('should handle coach sending email');

    todo('should return 401 when not authenticated');

    todo('should validate email DTO');

    todo('should require subject field');

    todo('should handle different user types');

    todo('should handle network timeout errors');
  });
});
