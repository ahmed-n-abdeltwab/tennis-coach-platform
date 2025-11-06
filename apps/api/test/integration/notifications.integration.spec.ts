/**
 * Integration tests for Notifications module
 * Tests notification delivery workflows and email service integration
 */

import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { BaseIntegrationTest } from '../utils/base/base-integration.test';
import { NotificationMockFactory } from '../utils/factories/notification.factory';
import notificationsConfig from '../../src/app/notifications/config/notifications.config';
import { NotificationsModule } from '../../src/app/notifications/notifications.module';

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

    app = testHelper.app;
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
    it('should send email successfully', async () => {
      // Arrange
      const user = await testHelper.createTestUser();
      const emailData = {
        to: 'recipient@example.com',
        subject: 'Test Email',
        text: 'This is a test email',
        html: '<p>This is a test email</p>',
      };
      const mockMessageId = 'message-123';

      mockSendMail.mockResolvedValue({ messageId: mockMessageId });

      const token = testHelper.createTestJwtToken({ sub: user.id, type: 'user' });

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/notifications/email')
        .set('Authorization', `Bearer ${token}`)
        .send(emailData)
        .expect(201);

      // Assert
      expect(response.body).toEqual({
        success: true,
        messageId: mockMessageId,
      });

      expect(mockSendMail).toHaveBeenCalledWith({
        from: {
          address: process.env.SMTP_SENDER_EMAIL || 'test@example.com',
          name: 'Mailtrap Test',
        },
        to: emailData.to,
        subject: emailData.subject,
        text: emailData.text,
        html: emailData.html,
      });
    });

    it('should handle email sending failure', async () => {
      // Arrange
      const user = await testHelper.createTestUser();
      const emailData = {
        to: 'recipient@example.com',
        subject: 'Test Email',
        text: 'This is a test email',
      };

      mockSendMail.mockRejectedValue(new Error('SMTP connection failed'));

      const token = testHelper.createTestJwtToken({ sub: user.id, type: 'user' });

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/notifications/email')
        .set('Authorization', `Bearer ${token}`)
        .send(emailData)
        .expect(201);

      // Assert
      expect(response.body).toEqual({
        success: false,
        error: 'SMTP connection failed',
      });
    });

    it('should send email with only text content', async () => {
      // Arrange
      const user = await testHelper.createTestUser();
      const emailData = {
        to: 'recipient@example.com',
        subject: 'Text Only Email',
        text: 'This is a text-only email',
      };
      const mockMessageId = 'message-456';

      mockSendMail.mockResolvedValue({ messageId: mockMessageId });

      const token = testHelper.createTestJwtToken({ sub: user.id, type: 'user' });

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/notifications/email')
        .set('Authorization', `Bearer ${token}`)
        .send(emailData)
        .expect(201);

      // Assert
      expect(response.body).toEqual({
        success: true,
        messageId: mockMessageId,
      });

      expect(mockSendMail).toHaveBeenCalledWith({
        from: {
          address: process.env.SMTP_SENDER_EMAIL || 'test@example.com',
          name: 'Mailtrap Test',
        },
        to: emailData.to,
        subject: emailData.subject,
        text: emailData.text,
        html: undefined,
      });
    });

    it('should send email with only HTML content', async () => {
      // Arrange
      const user = await testHelper.createTestUser();
      const emailData = {
        to: 'recipient@example.com',
        subject: 'HTML Only Email',
        html: '<h1>This is an HTML-only email</h1>',
      };
      const mockMessageId = 'message-789';

      mockSendMail.mockResolvedValue({ messageId: mockMessageId });

      const token = testHelper.createTestJwtToken({ sub: user.id, type: 'user' });

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/notifications/email')
        .set('Authorization', `Bearer ${token}`)
        .send(emailData)
        .expect(201);

      // Assert
      expect(response.body).toEqual({
        success: true,
        messageId: mockMessageId,
      });

      expect(mockSendMail).toHaveBeenCalledWith({
        from: {
          address: process.env.SMTP_SENDER_EMAIL || 'test@example.com',
          name: 'Mailtrap Test',
        },
        to: emailData.to,
        subject: emailData.subject,
        text: undefined,
        html: emailData.html,
      });
    });

    it('should handle coach sending email', async () => {
      // Arrange
      const coach = await testHelper.createTestCoach();
      const emailData = {
        to: 'student@example.com',
        subject: 'Session Update',
        text: 'Your session has been updated',
        html: '<p>Your session has been updated</p>',
      };
      const mockMessageId = 'message-coach-123';

      mockSendMail.mockResolvedValue({ messageId: mockMessageId });

      const token = testHelper.createTestJwtToken({ sub: coach.id, type: 'coach' });

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/notifications/email')
        .set('Authorization', `Bearer ${token}`)
        .send(emailData)
        .expect(201);

      // Assert
      expect(response.body).toEqual({
        success: true,
        messageId: mockMessageId,
      });
    });

    it('should return 401 when not authenticated', async () => {
      // Arrange
      const emailData = {
        to: 'recipient@example.com',
        subject: 'Test Email',
        text: 'This is a test email',
      };

      // Act & Assert
      await request(app.getHttpServer())
        .post('/api/notifications/email')
        .send(emailData)
        .expect(401);
    });

    it('should validate email DTO', async () => {
      // Arrange
      const user = await testHelper.createTestUser();
      const invalidEmailData = {
        to: 'invalid-email', // Invalid email format
        subject: 'Test Email',
        text: 'This is a test email',
      };

      const token = testHelper.createTestJwtToken({ sub: user.id, type: 'user' });

      // Act & Assert
      await request(app.getHttpServer())
        .post('/api/notifications/email')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidEmailData)
        .expect(400);
    });

    it('should require subject field', async () => {
      // Arrange
      const user = await testHelper.createTestUser();
      const incompleteEmailData = {
        to: 'recipient@example.com',
        // Missing subject
        text: 'This is a test email',
      };

      const token = testHelper.createTestJwtToken({ sub: user.id, type: 'user' });

      // Act & Assert
      await request(app.getHttpServer())
        .post('/api/notifications/email')
        .set('Authorization', `Bearer ${token}`)
        .send(incompleteEmailData)
        .expect(400);
    });

    it('should handle different user types', async () => {
      // Arrange
      const emailData = {
        to: 'admin@example.com',
        subject: 'System Notification',
        text: 'System maintenance scheduled',
        html: '<p>System maintenance scheduled</p>',
      };
      const mockMessageId = 'message-admin-123';

      mockSendMail.mockResolvedValue({ messageId: mockMessageId });

      // Create token for admin user type
      const token = testHelper.createTestJwtToken({ sub: 'admin-123', type: 'admin' });

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/notifications/email')
        .set('Authorization', `Bearer ${token}`)
        .send(emailData)
        .expect(201);

      // Assert
      expect(response.body).toEqual({
        success: true,
        messageId: mockMessageId,
      });
    });

    it('should handle network timeout errors', async () => {
      // Arrange
      const user = await testHelper.createTestUser();
      const emailData = {
        to: 'recipient@example.com',
        subject: 'Test Email',
        text: 'This is a test email',
      };

      mockSendMail.mockRejectedValue(new Error('Network timeout'));

      const token = testHelper.createTestJwtToken({ sub: user.id, type: 'user' });

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/notifications/email')
        .set('Authorization', `Bearer ${token}`)
        .send(emailData)
        .expect(201);

      // Assert
      expect(response.body).toEqual({
        success: false,
        error: 'Network timeout',
      });
    });
  });
});
