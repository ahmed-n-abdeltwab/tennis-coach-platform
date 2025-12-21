import { BadRequestException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Role } from '@prisma/client';
import { ServiceTest } from '@test-utils';

import { PrismaService } from '../prisma/prisma.service';
import { SessionsService } from '../sessions/sessions.service';
import { TimeSlotsService } from '../time-slots/time-slots.service';

import paymentsConfig from './config/payments.config';
import { CapturePaymentDto, CreatePaymentDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';

// Mock fetch globally
global.fetch = jest.fn();

describe('PaymentsService', () => {
  let test: ServiceTest<PaymentsService, PrismaService>;
  let sessionsService: jest.Mocked<SessionsService>;
  let timeSlotsService: jest.Mocked<TimeSlotsService>;
  let mockConfig: ConfigType<typeof paymentsConfig>;

  beforeEach(async () => {
    // Reset fetch mock
    (global.fetch as jest.Mock).mockReset();

    mockConfig = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      environment: 'sandbox',
      frontendUrl: 'http://localhost:3000',
    };

    const mockSessionsService = {
      findUnique: jest.fn(),
      update: jest.fn(),
    };

    const mockTimeSlotsService = {
      update: jest.fn(),
    };

    test = new ServiceTest({
      serviceClass: PaymentsService,
      mocks: [
        { provide: paymentsConfig.KEY, useValue: mockConfig },
        { provide: SessionsService, useValue: mockSessionsService },
        { provide: TimeSlotsService, useValue: mockTimeSlotsService },
      ],
    });

    await test.setup();

    sessionsService = mockSessionsService as unknown as jest.Mocked<SessionsService>;
    timeSlotsService = mockTimeSlotsService as unknown as jest.Mocked<TimeSlotsService>;
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('createOrder', () => {
    it('should create a PayPal order successfully', async () => {
      const userId = 'user-123';
      const createDto: CreatePaymentDto = {
        sessionId: 'session-123',
        amount: 99.99,
      };

      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        coachId: 'coach-1',
        isPaid: false,
        bookingType: {
          name: 'Coaching Session',
        },
        user: {
          name: 'John Doe',
        },
      };

      const mockAccessToken = 'mock-access-token';
      const mockPayPalOrder = {
        id: 'paypal-order-123',
        links: [
          { rel: 'self', href: 'https://api.paypal.com/self' },
          { rel: 'approve', href: 'https://paypal.com/approve/order-123' },
        ],
      };

      sessionsService.findUnique.mockResolvedValue(mockSession as any);

      // Mock getAccessToken
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accessToken: mockAccessToken }),
      });

      // Mock createOrder
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPayPalOrder,
      });

      const result = await test.service.createOrder(createDto, userId);

      expect(result).toEqual({
        orderId: 'paypal-order-123',
        approvalUrl: 'https://paypal.com/approve/order-123',
      });
      expect(sessionsService.findUnique).toHaveBeenCalledWith('session-123');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should throw BadRequestException when session does not belong to user', async () => {
      const userId = 'user-123';
      const createDto: CreatePaymentDto = {
        sessionId: 'session-123',
        amount: 99.99,
      };

      const mockSession = {
        id: 'session-123',
        userId: 'different-user',
        isPaid: false,
      };

      sessionsService.findUnique.mockResolvedValue(mockSession as any);

      await expect(test.service.createOrder(createDto, userId)).rejects.toThrow(
        BadRequestException
      );
      await expect(test.service.createOrder(createDto, userId)).rejects.toThrow('Invalid session');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when session is already paid', async () => {
      const userId = 'user-123';
      const createDto: CreatePaymentDto = {
        sessionId: 'session-123',
        amount: 99.99,
      };

      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        isPaid: true,
      };

      sessionsService.findUnique.mockResolvedValue(mockSession as any);

      await expect(test.service.createOrder(createDto, userId)).rejects.toThrow(
        BadRequestException
      );
      await expect(test.service.createOrder(createDto, userId)).rejects.toThrow(
        'Session already paid'
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when PayPal order creation fails', async () => {
      const userId = 'user-123';
      const createDto: CreatePaymentDto = {
        sessionId: 'session-123',
        amount: 99.99,
      };

      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        isPaid: false,
        bookingType: { name: 'Session' },
        user: { name: 'User' },
      };

      sessionsService.findUnique.mockResolvedValue(mockSession as any);

      // Mock getAccessToken and failed createOrder for first assertion
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ accessToken: 'token' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'PayPal error' }),
        });

      await expect(test.service.createOrder(createDto, userId)).rejects.toThrow(
        BadRequestException
      );

      // Reset and setup mocks for second assertion
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ accessToken: 'token' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'PayPal error' }),
        });

      await expect(test.service.createOrder(createDto, userId)).rejects.toThrow(
        'Failed to create PayPal order'
      );
    });
  });

  describe('captureOrder', () => {
    it('should capture a PayPal order successfully', async () => {
      const userId = 'user-123';
      const captureDto: CapturePaymentDto = {
        orderId: 'paypal-order-123',
        sessionId: 'session-123',
      };

      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        coachId: 'coach-1',
        timeSlotId: 'slot-1',
        isPaid: false,
      };

      const mockAccessToken = 'mock-access-token';
      const mockCaptureResult = {
        id: 'capture-123',
        status: 'COMPLETED',
      };

      const mockUpdatedSession = {
        ...mockSession,
        isPaid: true,
        paymentId: 'paypal-order-123',
      };

      sessionsService.findUnique.mockResolvedValue(mockSession as any);

      // Mock getAccessToken
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accessToken: mockAccessToken }),
      });

      // Mock captureOrder
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCaptureResult,
      });

      sessionsService.update.mockResolvedValue(mockUpdatedSession as any);
      timeSlotsService.update.mockResolvedValue({} as any);

      const result = await test.service.captureOrder(captureDto, userId);

      expect(result).toEqual({
        success: true,
        paymentId: 'paypal-order-123',
        captureId: 'capture-123',
      });
      expect(sessionsService.findUnique).toHaveBeenCalledWith('session-123');
      expect(sessionsService.update).toHaveBeenCalledWith(
        'session-123',
        { isPaid: true, paymentId: 'paypal-order-123' },
        'user-123',
        Role.USER
      );
      expect(timeSlotsService.update).toHaveBeenCalledWith(
        'slot-1',
        { isAvailable: false },
        'coach-1'
      );
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should throw BadRequestException when session does not belong to user', async () => {
      const userId = 'user-123';
      const captureDto: CapturePaymentDto = {
        orderId: 'paypal-order-123',
        sessionId: 'session-123',
      };

      const mockSession = {
        id: 'session-123',
        userId: 'different-user',
      };

      sessionsService.findUnique.mockResolvedValue(mockSession as any);

      await expect(test.service.captureOrder(captureDto, userId)).rejects.toThrow(
        BadRequestException
      );
      await expect(test.service.captureOrder(captureDto, userId)).rejects.toThrow(
        'Invalid session'
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when payment capture fails', async () => {
      const userId = 'user-123';
      const captureDto: CapturePaymentDto = {
        orderId: 'paypal-order-123',
        sessionId: 'session-123',
      };

      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        coachId: 'coach-1',
        timeSlotId: 'slot-1',
      };

      sessionsService.findUnique.mockResolvedValue(mockSession as any);

      // Mock getAccessToken and failed capture for first assertion
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ accessToken: 'token' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Capture failed' }),
        });

      await expect(test.service.captureOrder(captureDto, userId)).rejects.toThrow(
        BadRequestException
      );

      // Reset and setup mocks for second assertion
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ accessToken: 'token' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Capture failed' }),
        });

      await expect(test.service.captureOrder(captureDto, userId)).rejects.toThrow(
        'Payment capture failed'
      );
      expect(sessionsService.update).not.toHaveBeenCalled();
      expect(timeSlotsService.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when capture status is not COMPLETED', async () => {
      const userId = 'user-123';
      const captureDto: CapturePaymentDto = {
        orderId: 'paypal-order-123',
        sessionId: 'session-123',
      };

      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        coachId: 'coach-1',
        timeSlotId: 'slot-1',
      };

      sessionsService.findUnique.mockResolvedValue(mockSession as any);

      // Mock getAccessToken and capture with non-COMPLETED status for first assertion
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ accessToken: 'token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'capture-123', status: 'PENDING' }),
        });

      await expect(test.service.captureOrder(captureDto, userId)).rejects.toThrow(
        BadRequestException
      );

      // Reset and setup mocks for second assertion
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ accessToken: 'token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'capture-123', status: 'PENDING' }),
        });

      await expect(test.service.captureOrder(captureDto, userId)).rejects.toThrow(
        'Payment capture failed'
      );
      expect(sessionsService.update).not.toHaveBeenCalled();
      expect(timeSlotsService.update).not.toHaveBeenCalled();
    });
  });
});
