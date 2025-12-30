import { Role } from '@prisma/client';
import { ControllerTest } from '@test-utils';

import { MailResponse, SendBookingConfirmationDto, SendEmailDto } from './dto/notification.dto';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

describe.skip('NotificationsController', () => {
  let test: ControllerTest<NotificationsController, NotificationsService, 'notifications'>;
  let mockService: jest.Mocked<NotificationsService>;

  beforeEach(async () => {
    mockService = {
      sendEmail: jest.fn(),
      sendBookingConfirmation: jest.fn(),
    } as any;

    test = new ControllerTest({
      controllerClass: NotificationsController,
      moduleName: 'notifications',
      providers: [{ provide: NotificationsService, useValue: mockService }],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('POST /notifications/email', () => {
    it('should call sendEmail service method with correct parameters', async () => {
      const emailDto: SendEmailDto = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML content</p>',
        text: 'Test text content',
      };

      const mockResponse: MailResponse = {
        success: true,
        message_ids: ['msg-123'],
      };

      mockService.sendEmail.mockResolvedValue(mockResponse);

      const userToken = await test.auth.createRoleToken(Role.USER, {
        sub: 'user-123',
      });
      await test.http.authenticatedPost('/api/notifications/email', userToken, {
        body: emailDto,
      });

      expect(mockService.sendEmail).toHaveBeenCalledWith(emailDto, 'user-123', Role.USER);
    });

    it('should allow coach to send email notifications', async () => {
      const emailDto: SendEmailDto = {
        to: 'user@example.com',
        subject: 'Coach Notification',
        html: '<p>Coach message</p>',
      };

      const mockResponse: MailResponse = {
        success: true,
        message_ids: ['msg-456'],
      };

      mockService.sendEmail.mockResolvedValue(mockResponse);

      const coachToken = await test.auth.createRoleToken(Role.COACH, {
        sub: 'coach-123',
      });
      await test.http.authenticatedPost('/api/notifications/email', coachToken, {
        body: emailDto,
      });

      expect(mockService.sendEmail).toHaveBeenCalledWith(emailDto, 'coach-123', Role.COACH);
    });

    it('should handle email send failure response', async () => {
      const emailDto: SendEmailDto = {
        to: 'invalid@example.com',
        subject: 'Test Subject',
        html: '<p>Test</p>',
      };

      const mockResponse: MailResponse = {
        success: false,
        errors: ['Invalid recipient address'],
      };

      mockService.sendEmail.mockResolvedValue(mockResponse);

      const userToken = await test.auth.createRoleToken(Role.USER, {
        sub: 'user-123',
      });
      await test.http.authenticatedPost('/api/notifications/email', userToken, {
        body: emailDto,
      });

      expect(mockService.sendEmail).toHaveBeenCalled();
    });
  });

  describe('POST /notifications/confirm', () => {
    it('should call sendBookingConfirmation service method with sessionId', async () => {
      const confirmDto: SendBookingConfirmationDto = {
        sessionId: 'session-123',
      };

      mockService.sendBookingConfirmation.mockResolvedValue(undefined);

      const userToken = await test.auth.createRoleToken(Role.USER, {
        sub: 'user-123',
      });
      await test.http.authenticatedPost('/api/notifications/confirm', userToken, {
        body: confirmDto,
      });

      expect(mockService.sendBookingConfirmation).toHaveBeenCalledWith('session-123');
    });

    it('should allow coach to send booking confirmation', async () => {
      const confirmDto: SendBookingConfirmationDto = {
        sessionId: 'session-456',
      };

      mockService.sendBookingConfirmation.mockResolvedValue(undefined);

      const coachToken = await test.auth.createRoleToken(Role.COACH, {
        sub: 'coach-123',
      });
      await test.http.authenticatedPost('/api/notifications/confirm', coachToken, {
        body: confirmDto,
      });

      expect(mockService.sendBookingConfirmation).toHaveBeenCalledWith('session-456');
    });
  });
});
