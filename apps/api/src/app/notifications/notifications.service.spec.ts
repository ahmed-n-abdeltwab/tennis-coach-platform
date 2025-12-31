import { UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { ServiceTest } from '@test-utils';
import { DeepMocked } from '@test-utils/mixins/mock.mixin';

import { SessionsService } from '../sessions/sessions.service';

import { SendEmailDto } from './dto/notification.dto';
import { MailerService } from './mailer';
import { NotificationsService } from './notifications.service';

/**
 * NotificationMocks interface defines typed mocks for the NotificationsService dependencies.
 *
 * This interface provides IntelliSense support for:
 * - MailerService mock (sendMail method)
 * - SessionsService mock (findOne method)
 */
interface NotificationMocks {
  MailerService: DeepMocked<MailerService>;
  SessionsService: DeepMocked<SessionsService>;
}

describe('NotificationsService', () => {
  let test: ServiceTest<NotificationsService, NotificationMocks>;

  beforeEach(async () => {
    test = new ServiceTest({
      service: NotificationsService,
      providers: [MailerService, SessionsService],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      const emailDto: SendEmailDto = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Test text',
      };

      const mockResponse = {
        success: true,
        message_ids: ['msg-123'],
      };

      test.mocks.MailerService.sendMail.mockResolvedValue(mockResponse);

      const result = await test.service.sendEmail(emailDto, 'user-123', Role.USER);

      expect(result).toEqual({
        success: true,
        message_ids: ['msg-123'],
      });
      expect(test.mocks.MailerService.sendMail).toHaveBeenCalledWith({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test text',
        html: '<p>Test HTML</p>',
      });
    });

    it('should return error response when email fails', async () => {
      const emailDto: SendEmailDto = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
      };

      const mockResponse = {
        success: false,
        errors: ['Invalid recipient'],
      };

      test.mocks.MailerService.sendMail.mockResolvedValue(mockResponse);

      const result = await test.service.sendEmail(emailDto, 'user-123', Role.USER);

      expect(result).toEqual({
        success: false,
        errors: ['Invalid recipient'],
      });
    });

    it('should send email without text when not provided', async () => {
      const emailDto: SendEmailDto = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
      };

      const mockResponse = {
        success: true,
        message_ids: ['msg-456'],
      };

      test.mocks.MailerService.sendMail.mockResolvedValue(mockResponse);

      const result = await test.service.sendEmail(emailDto, 'user-123', Role.COACH);

      expect(result.success).toBe(true);
      expect(test.mocks.MailerService.sendMail).toHaveBeenCalledWith({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: undefined,
      });
    });
  });

  describe('sendBookingConfirmation', () => {
    it('should send booking confirmation email successfully', async () => {
      const sessionId = 'session-123';
      const userId = 'user-123';
      const role = Role.USER;

      const mockSession = test.factory.session.createWithNulls({
        id: sessionId,
        userId,
        user: { id: userId, name: 'John Doe', email: 'john@example.com' },
        coach: { id: 'coach-123', name: 'Coach Smith', email: 'coach@example.com' },
        dateTime: new Date('2024-12-25T10:00:00Z'),
        durationMin: 60,
        price: new Decimal(100),
      });

      test.mocks.SessionsService.findOne.mockResolvedValue(mockSession);
      test.mocks.MailerService.sendMail.mockResolvedValue({
        success: true,
        message_ids: ['msg-789'],
      });

      await test.service.sendBookingConfirmation(sessionId, userId, role);

      expect(test.mocks.SessionsService.findOne).toHaveBeenCalledWith(sessionId, userId, role);
      expect(test.mocks.MailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'john@example.com',
          subject: 'Booking Confirmation - Tennis Coaching Session',
        })
      );
    });

    it('should throw UnauthorizedException when session not found', async () => {
      const sessionId = 'non-existent';
      const userId = 'user-123';
      const role = Role.USER;

      test.mocks.SessionsService.findOne.mockResolvedValue(null as any);

      await expect(test.service.sendBookingConfirmation(sessionId, userId, role)).rejects.toThrow(
        UnauthorizedException
      );
      expect(test.mocks.MailerService.sendMail).not.toHaveBeenCalled();
    });

    it('should include session details in confirmation email', async () => {
      const sessionId = 'session-456';
      const userId = 'user-456';
      const role = Role.USER;

      const mockSession = test.factory.session.createWithNulls({
        id: sessionId,
        userId,
        user: { id: userId, name: 'Jane Doe', email: 'jane@example.com' },
        coach: { id: 'coach-456', name: 'Coach Johnson', email: 'johnson@example.com' },
        dateTime: new Date('2024-12-30T14:00:00Z'),
        durationMin: 90,
        price: new Decimal(150),
      });

      test.mocks.SessionsService.findOne.mockResolvedValue(mockSession);
      test.mocks.MailerService.sendMail.mockResolvedValue({
        success: true,
        message_ids: ['msg-confirmation'],
      });

      await test.service.sendBookingConfirmation(sessionId, userId, role);

      const sendMailCalls = test.mocks.MailerService.sendMail.mock.calls;
      expect(sendMailCalls).toHaveLength(1);
      const sendMailCall = sendMailCalls[0]?.[0];
      expect(sendMailCall).toBeDefined();
      expect(sendMailCall?.html).toContain('Jane Doe');
      expect(sendMailCall?.html).toContain('Coach Johnson');
      expect(sendMailCall?.html).toContain(mockSession.bookingType.name);
      expect(sendMailCall?.html).toContain('90 minutes');
      expect(sendMailCall?.html).toContain('150');
    });
  });
});
