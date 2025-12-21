import { UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Role } from '@prisma/client';
import { ServiceTest } from '@test-utils';
import nodemailer from 'nodemailer';

import { PrismaService } from '../prisma/prisma.service';
import { SessionsService } from '../sessions/sessions.service';

import notificationsConfig from './config/notifications.config';
import { SendEmailDto } from './dto/notification.dto';
import { NotificationsService } from './notifications.service';

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn(),
  }),
}));

// Mock mailtrap
jest.mock('mailtrap', () => ({
  MailtrapTransport: jest.fn().mockReturnValue({}),
}));

describe('NotificationsService', () => {
  let test: ServiceTest<NotificationsService, PrismaService>;
  let mockSessionsService: jest.Mocked<SessionsService>;
  let mockTransporter: { sendMail: jest.Mock };

  const mockConfig: ConfigType<typeof notificationsConfig> = {
    token: 'test-token',
    senderEmail: 'test@example.com',
  };

  beforeEach(async () => {
    mockSessionsService = {
      findUnique: jest.fn(),
    } as any;

    mockTransporter = {
      sendMail: jest.fn(),
    };

    // Reset the nodemailer mock to return our mockTransporter
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    test = new ServiceTest({
      serviceClass: NotificationsService,
      mocks: [
        { provide: notificationsConfig.KEY, useValue: mockConfig },
        { provide: SessionsService, useValue: mockSessionsService },
      ],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('constructor', () => {
    it('should throw error when token is not provided', async () => {
      const invalidConfig = {
        token: undefined,
        senderEmail: 'test@example.com',
      };

      const invalidTest = new ServiceTest({
        serviceClass: NotificationsService,
        mocks: [
          { provide: notificationsConfig.KEY, useValue: invalidConfig },
          { provide: SessionsService, useValue: mockSessionsService },
        ],
      });

      await expect(invalidTest.setup()).rejects.toThrow(
        'SMTP_TOKEN and SMTP_SENDER_EMAIL must be provided'
      );
    });

    it('should throw error when senderEmail is not provided', async () => {
      const invalidConfig = {
        token: 'test-token',
        senderEmail: undefined,
      };

      const invalidTest = new ServiceTest({
        serviceClass: NotificationsService,
        mocks: [
          { provide: notificationsConfig.KEY, useValue: invalidConfig },
          { provide: SessionsService, useValue: mockSessionsService },
        ],
      });

      await expect(invalidTest.setup()).rejects.toThrow(
        'SMTP_TOKEN and SMTP_SENDER_EMAIL must be provided'
      );
    });
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

      mockTransporter.sendMail.mockResolvedValue(mockResponse);

      const result = await test.service.sendEmail(emailDto, 'user-123', Role.USER);

      expect(result).toEqual({
        success: true,
        message_ids: ['msg-123'],
      });
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: {
          address: 'test@example.com',
          name: 'Mailtrap Test',
        },
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

      mockTransporter.sendMail.mockResolvedValue(mockResponse);

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

      mockTransporter.sendMail.mockResolvedValue(mockResponse);

      const result = await test.service.sendEmail(emailDto, 'user-123', Role.COACH);

      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'recipient@example.com',
          subject: 'Test Subject',
          html: '<p>Test HTML</p>',
          text: undefined,
        })
      );
    });
  });

  describe('sendBookingConfirmation', () => {
    it('should send booking confirmation email successfully', async () => {
      const sessionId = 'session-123';
      const mockSession = {
        id: sessionId,
        user: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
        },
        coach: {
          id: 'coach-123',
          name: 'Coach Smith',
          email: 'coach@example.com',
        },
        bookingType: {
          id: 'booking-type-123',
          name: 'Tennis Lesson',
        },
        dateTime: new Date('2024-12-25T10:00:00Z'),
        durationMin: 60,
        price: 100,
      };

      mockSessionsService.findUnique.mockResolvedValue(mockSession as any);
      mockTransporter.sendMail.mockResolvedValue({
        success: true,
        message_ids: ['msg-789'],
      });

      await test.service.sendBookingConfirmation(sessionId);

      expect(mockSessionsService.findUnique).toHaveBeenCalledWith(sessionId);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'john@example.com',
          subject: 'Booking Confirmation - Tennis Coaching Session',
        })
      );
    });

    it('should throw UnauthorizedException when session not found', async () => {
      mockSessionsService.findUnique.mockResolvedValue(null);

      await expect(test.service.sendBookingConfirmation('non-existent')).rejects.toThrow(
        UnauthorizedException
      );
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });

    it('should include session details in confirmation email', async () => {
      const sessionId = 'session-456';
      const mockSession = {
        id: sessionId,
        user: {
          id: 'user-456',
          name: 'Jane Doe',
          email: 'jane@example.com',
        },
        coach: {
          id: 'coach-456',
          name: 'Coach Johnson',
          email: 'johnson@example.com',
        },
        bookingType: {
          id: 'booking-type-456',
          name: 'Advanced Training',
        },
        dateTime: new Date('2024-12-30T14:00:00Z'),
        durationMin: 90,
        price: 150,
      };

      mockSessionsService.findUnique.mockResolvedValue(mockSession as any);
      mockTransporter.sendMail.mockResolvedValue({
        success: true,
        message_ids: ['msg-confirmation'],
      });

      await test.service.sendBookingConfirmation(sessionId);

      const sendMailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(sendMailCall.html).toContain('Jane Doe');
      expect(sendMailCall.html).toContain('Coach Johnson');
      expect(sendMailCall.html).toContain('Advanced Training');
      expect(sendMailCall.html).toContain('90 minutes');
      expect(sendMailCall.html).toContain('150');
    });
  });
});
