import { UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { ServiceTest } from '@test-utils';
import { DeepMocked } from '@test-utils/mixins/mock.mixin';

import { AccountsService } from '../accounts/accounts.service';
import { AppLoggerService } from '../logger';
import { MessagesGateway } from '../messages/messages.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { SessionsService } from '../sessions/sessions.service';

import { SendEmailDto } from './dto/notification.dto';
import { MailerService } from './mailer';
import { NotificationsService } from './notifications.service';

/**
 * NotificationMocks interface defines typed mocks for the NotificationsService dependencies.
 *
 * This interface provides IntelliSense support for:
 * - PrismaService mock (notification table operations)
 * - AccountsService mock (existsById, getAccounts methods)
 * - MessagesGateway mock (sendCustomServiceNotification method)
 * - MailerService mock (sendMail method)
 * - SessionsService mock (findOne method)
 * - AppLoggerService mock (logging methods)
 */
interface NotificationMocks {
  PrismaService: {
    notification: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      delete: jest.Mock;
    };
  };
  AccountsService: DeepMocked<AccountsService>;
  MessagesGateway: DeepMocked<MessagesGateway>;
  MailerService: DeepMocked<MailerService>;
  SessionsService: DeepMocked<SessionsService>;
  AppLoggerService: DeepMocked<AppLoggerService>;
}

describe('NotificationsService', () => {
  let test: ServiceTest<NotificationsService, NotificationMocks>;

  beforeEach(async () => {
    test = new ServiceTest({
      service: NotificationsService,
      providers: [
        {
          provide: PrismaService,
          useValue: {
            notification: {
              create: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
        {
          provide: AccountsService,
          useValue: {
            existsById: jest.fn(),
            getAccounts: jest.fn(),
          },
        },
        {
          provide: MessagesGateway,
          useValue: {
            sendCustomServiceNotification: jest.fn(),
            notifyConversationUpdate: jest.fn(),
            notifyMessageRead: jest.fn(),
            getOnlineUsers: jest.fn(),
            getUserStatus: jest.fn(),
          },
        },
        {
          provide: MailerService,
          useValue: {
            sendMail: jest.fn(),
          },
        },
        {
          provide: SessionsService,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: AppLoggerService,
          useValue: {
            setContext: jest.fn(),
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
          },
        },
      ],
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

      const result = await test.service.sendEmail(emailDto, 'cuser12345678901234567', Role.USER);

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

      const result = await test.service.sendEmail(emailDto, 'cuser12345678901234567', Role.USER);

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

      const result = await test.service.sendEmail(emailDto, 'cuser12345678901234567', Role.COACH);

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
      const sessionId = 'csession123456789012345';
      const userId = 'cuser12345678901234567';
      const role = Role.USER;

      const mockSession = test.factory.session.createWithNulls({
        id: sessionId,
        userId,
        user: { id: userId, name: 'John Doe', email: 'john@example.com' },
        coach: { id: 'ccoach1234567890123456', name: 'Coach Smith', email: 'coach@example.com' },
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
      const sessionId = 'cnonexistent12345678901';
      const userId = 'cuser12345678901234567';
      const role = Role.USER;

      test.mocks.SessionsService.findOne.mockResolvedValue(null as any);

      await expect(test.service.sendBookingConfirmation(sessionId, userId, role)).rejects.toThrow(
        UnauthorizedException
      );
      expect(test.mocks.MailerService.sendMail).not.toHaveBeenCalled();
    });

    it('should include session details in confirmation email', async () => {
      const sessionId = 'csession456789012345678';
      const userId = 'cuser45678901234567890';
      const role = Role.USER;

      const mockSession = test.factory.session.createWithNulls({
        id: sessionId,
        userId,
        user: { id: userId, name: 'Jane Doe', email: 'jane@example.com' },
        coach: {
          id: 'ccoach4567890123456789',
          name: 'Coach Johnson',
          email: 'johnson@example.com',
        },
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
