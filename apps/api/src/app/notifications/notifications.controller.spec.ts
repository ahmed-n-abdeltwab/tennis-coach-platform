import { UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ControllerTest } from '@test-utils';
import { DeepMocked } from '@test-utils/mixins/mock.mixin';

import { MailResponse, SendBookingConfirmationDto, SendEmailDto } from './dto/notification.dto';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

/**
 * NotificationsControllerMocks interface defines typed mocks for the NotificationsController dependencies.
 *
 * This interface provides IntelliSense support for:
 * - NotificationsService mock (sendEmail, sendBookingConfirmation methods)
 */
interface NotificationsControllerMocks {
  NotificationsService: DeepMocked<NotificationsService>;
}

describe('NotificationsController', () => {
  let test: ControllerTest<NotificationsController, NotificationsControllerMocks, 'notifications'>;

  beforeEach(async () => {
    test = new ControllerTest({
      controller: NotificationsController,
      moduleName: 'notifications',
      providers: [NotificationsService],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('POST /api/notifications/email', () => {
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

      test.mocks.NotificationsService.sendEmail.mockResolvedValue(mockResponse);

      const userToken = await test.auth.createToken({
        role: Role.USER,
        sub: 'cuser12345678901234567',
      });
      await test.http.authenticatedPost('/api/notifications/email', userToken, {
        body: emailDto,
      });

      expect(test.mocks.NotificationsService.sendEmail).toHaveBeenCalledWith(
        emailDto,
        'cuser12345678901234567',
        Role.USER
      );
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

      test.mocks.NotificationsService.sendEmail.mockResolvedValue(mockResponse);

      const coachToken = await test.auth.createToken({
        role: Role.COACH,
        sub: 'ccoach1234567890123456',
      });
      await test.http.authenticatedPost('/api/notifications/email', coachToken, {
        body: emailDto,
      });

      expect(test.mocks.NotificationsService.sendEmail).toHaveBeenCalledWith(
        emailDto,
        'ccoach1234567890123456',
        Role.COACH
      );
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

      test.mocks.NotificationsService.sendEmail.mockResolvedValue(mockResponse);

      const userToken = await test.auth.createToken({
        role: Role.USER,
        sub: 'cuser12345678901234567',
      });
      await test.http.authenticatedPost('/api/notifications/email', userToken, {
        body: emailDto,
      });

      expect(test.mocks.NotificationsService.sendEmail).toHaveBeenCalled();
    });
  });

  describe('POST /api/notifications/confirm', () => {
    it('should call sendBookingConfirmation service method with correct parameters', async () => {
      const confirmDto: SendBookingConfirmationDto = {
        sessionId: 'csession123456789012345',
      };

      test.mocks.NotificationsService.sendBookingConfirmation.mockResolvedValue(undefined);

      const userToken = await test.auth.createToken({
        role: Role.USER,
        sub: 'cuser12345678901234567',
      });
      await test.http.authenticatedPost('/api/notifications/confirm', userToken, {
        body: confirmDto,
      });

      expect(test.mocks.NotificationsService.sendBookingConfirmation).toHaveBeenCalledWith(
        'csession123456789012345',
        'cuser12345678901234567',
        Role.USER
      );
    });

    it('should allow coach to send booking confirmation', async () => {
      const confirmDto: SendBookingConfirmationDto = {
        sessionId: 'csession456789012345678',
      };

      test.mocks.NotificationsService.sendBookingConfirmation.mockResolvedValue(undefined);

      const coachToken = await test.auth.createToken({
        role: Role.COACH,
        sub: 'ccoach1234567890123456',
      });
      await test.http.authenticatedPost('/api/notifications/confirm', coachToken, {
        body: confirmDto,
      });

      expect(test.mocks.NotificationsService.sendBookingConfirmation).toHaveBeenCalledWith(
        'csession456789012345678',
        'ccoach1234567890123456',
        Role.COACH
      );
    });

    it('should handle session not found error', async () => {
      const confirmDto: SendBookingConfirmationDto = {
        sessionId: 'cnonexistentsession12345',
      };

      test.mocks.NotificationsService.sendBookingConfirmation.mockRejectedValue(
        new UnauthorizedException('you must create session first')
      );

      const userToken = await test.auth.createToken({
        role: Role.USER,
        sub: 'cuser12345678901234567',
      });

      const response = await test.http.authenticatedPost('/api/notifications/confirm', userToken, {
        body: confirmDto,
      });

      expect(response.status).toBe(401);
    });
  });
});
