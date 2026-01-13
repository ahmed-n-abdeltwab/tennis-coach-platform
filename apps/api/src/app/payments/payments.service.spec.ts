import { NotFoundException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PaymentStatus, Role } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { ServiceTest } from '@test-utils';
import { DeepMocked } from '@test-utils/mixins/mock.mixin';

import { PrismaService } from '../prisma/prisma.service';
import { SessionsService } from '../sessions/sessions.service';
import { TimeSlotsService } from '../time-slots/time-slots.service';

import paymentsConfig from './config/payments.config';
import { CapturePaymentDto, CreatePaymentDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';

// Mock fetch globally
global.fetch = jest.fn();

/**
 * PaymentMocks interface defines typed mocks for the PaymentsService dependencies.
 *
 * This interface provides IntelliSense support for:
 * - PrismaService mock (payment table operations)
 * - SessionsService mock (findOne, markAsPaidInternal methods)
 * - TimeSlotsService mock (markAsUnavailableInternal method)
 */
interface PaymentMocks {
  PrismaService: {
    payment: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
      aggregate: jest.Mock;
    };
  };
  SessionsService: DeepMocked<SessionsService>;
  TimeSlotsService: DeepMocked<TimeSlotsService>;
}

describe('PaymentsService', () => {
  let test: ServiceTest<PaymentsService, PaymentMocks>;
  let mockConfig: ConfigType<typeof paymentsConfig>;

  beforeEach(async () => {
    mockConfig = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      environment: 'sandbox',
      frontendUrl: 'http://localhost:3000',
    };

    test = new ServiceTest({
      service: PaymentsService,
      providers: [
        { provide: paymentsConfig.KEY, useValue: mockConfig },
        {
          provide: PrismaService,
          useValue: {
            payment: {
              create: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
              aggregate: jest.fn(),
            },
          },
        },
        SessionsService,
        TimeSlotsService,
      ],
    });

    await test.setup();

    // Register global fetch mock for automatic cleanup
    test.registerGlobalMock(global.fetch as jest.Mock);
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('createOrder', () => {
    it('should create a PayPal order successfully', async () => {
      const userId = 'cuser12345678901234567';
      const sessionId = 'csession123456789012345';
      const createDto: CreatePaymentDto = {
        sessionId,
        amount: 99.99,
      };

      const mockSession = test.factory.session.createWithNulls({
        id: sessionId,
        userId,
        coachId: 'ccoach1234567890123456',
        isPaid: false,
      });

      const mockPayment = test.factory.payment.create({
        userId,
        amount: new Decimal(99.99),
        status: PaymentStatus.PENDING,
      });

      const mockPayPalOrder = test.factory.payment.createPayPalOrder();
      const mockAccessTokenResponse = test.factory.payment.createAccessTokenResponse();

      test.mocks.SessionsService.findOne.mockResolvedValue(mockSession);
      test.mocks.PrismaService.payment.create.mockResolvedValue(mockPayment);
      test.mocks.PrismaService.payment.update.mockResolvedValue({
        ...mockPayment,
        paypalOrderId: mockPayPalOrder.id,
      });

      // Mock getAccessToken
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAccessTokenResponse,
      });

      // Mock createOrder
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPayPalOrder,
      });

      const result = await test.service.createOrder(createDto, userId, Role.USER);

      const approvalLink = mockPayPalOrder.links.find(link => link.rel === 'approve');
      expect(result).toEqual({
        orderId: mockPayPalOrder.id,
        approvalUrl: approvalLink?.href,
      });
      expect(test.mocks.SessionsService.findOne).toHaveBeenCalledWith(sessionId, userId, Role.USER);
      expect(test.mocks.PrismaService.payment.create).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should throw BadRequestException when session does not belong to user', async () => {
      const userId = 'cuser12345678901234567';
      const sessionId = 'csession123456789012345';
      const createDto: CreatePaymentDto = {
        sessionId,
        amount: 99.99,
      };

      const mockSession = test.factory.session.createWithNulls({
        id: sessionId,
        userId: 'cdifferentuser123456789',
        isPaid: false,
      });

      test.mocks.SessionsService.findOne.mockResolvedValue(mockSession);

      await expect(test.service.createOrder(createDto, userId, Role.USER)).rejects.toThrow(
        'Invalid session'
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when session is already paid', async () => {
      const userId = 'cuser12345678901234567';
      const sessionId = 'csession123456789012345';
      const createDto: CreatePaymentDto = {
        sessionId,
        amount: 99.99,
      };

      const mockSession = test.factory.session.createWithNulls({
        id: sessionId,
        userId,
        isPaid: true,
      });

      test.mocks.SessionsService.findOne.mockResolvedValue(mockSession);

      await expect(test.service.createOrder(createDto, userId, Role.USER)).rejects.toThrow(
        'Session already paid'
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when PayPal order creation fails', async () => {
      const userId = 'cuser12345678901234567';
      const sessionId = 'csession123456789012345';
      const createDto: CreatePaymentDto = {
        sessionId,
        amount: 99.99,
      };

      const mockSession = test.factory.session.createWithNulls({
        id: sessionId,
        userId,
        isPaid: false,
      });

      const mockPayment = test.factory.payment.create({
        userId,
        amount: new Decimal(99.99),
        status: PaymentStatus.PENDING,
      });

      test.mocks.SessionsService.findOne.mockResolvedValue(mockSession);
      test.mocks.PrismaService.payment.create.mockResolvedValue(mockPayment);
      test.mocks.PrismaService.payment.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.FAILED,
      });

      // Mock getAccessToken and failed createOrder
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => test.factory.payment.createAccessTokenResponse(),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'PayPal error' }),
        });

      await expect(test.service.createOrder(createDto, userId, Role.USER)).rejects.toThrow(
        'Failed to create PayPal order'
      );
    });
  });

  describe('captureOrder', () => {
    it('should capture a PayPal order successfully', async () => {
      const userId = 'cuser12345678901234567';
      const sessionId = 'csession123456789012345';
      const timeSlotId = 'ctimeslot1234567890123';
      const paypalOrderId = 'ORDER_TEST123456789';

      const captureDto: CapturePaymentDto = {
        orderId: paypalOrderId,
        sessionId,
      };

      const mockSession = test.factory.session.createWithNulls({
        id: sessionId,
        userId,
        coachId: 'ccoach1234567890123456',
        timeSlotId,
        isPaid: false,
      });

      const mockPayment = test.factory.payment.create({
        userId,
        amount: new Decimal(99.99),
        status: PaymentStatus.PENDING,
        paypalOrderId,
      });

      const mockCaptureResult = test.factory.payment.createPayPalCapture();
      const mockAccessTokenResponse = test.factory.payment.createAccessTokenResponse();

      test.mocks.SessionsService.findOne.mockResolvedValue(mockSession);
      test.mocks.PrismaService.payment.findFirst.mockResolvedValue(mockPayment);
      test.mocks.PrismaService.payment.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.COMPLETED,
        paypalCaptureId: mockCaptureResult.id,
      });

      // Mock getAccessToken
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAccessTokenResponse,
      });

      // Mock captureOrder
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCaptureResult,
      });

      test.mocks.SessionsService.markAsPaidInternal.mockResolvedValue(undefined);
      test.mocks.TimeSlotsService.markAsUnavailableInternal.mockResolvedValue(undefined);

      const result = await test.service.captureOrder(captureDto, userId, Role.USER);

      expect(result).toEqual({
        success: true,
        paymentId: mockPayment.id,
        captureId: mockCaptureResult.id,
      });
      expect(test.mocks.SessionsService.findOne).toHaveBeenCalledWith(sessionId, userId, Role.USER);
      expect(test.mocks.SessionsService.markAsPaidInternal).toHaveBeenCalledWith(
        sessionId,
        mockPayment.id
      );
      expect(test.mocks.TimeSlotsService.markAsUnavailableInternal).toHaveBeenCalledWith(
        timeSlotId
      );
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should throw BadRequestException when session does not belong to user', async () => {
      const userId = 'cuser12345678901234567';
      const captureDto: CapturePaymentDto = {
        orderId: 'paypal-order-123',
        sessionId: 'csession123456789012345',
      };

      const mockSession = test.factory.session.createWithNulls({
        id: 'csession123456789012345',
        userId: 'cdifferentuser123456789',
      });

      test.mocks.SessionsService.findOne.mockResolvedValue(mockSession);

      await expect(test.service.captureOrder(captureDto, userId, Role.USER)).rejects.toThrow(
        'Invalid session'
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when payment capture fails', async () => {
      const userId = 'cuser12345678901234567';
      const sessionId = 'csession123456789012345';
      const timeSlotId = 'ctimeslot1234567890123';
      const paypalOrderId = 'paypal-order-123';

      const captureDto: CapturePaymentDto = {
        orderId: paypalOrderId,
        sessionId,
      };

      const mockSession = test.factory.session.createWithNulls({
        id: sessionId,
        userId,
        coachId: 'ccoach1234567890123456',
        timeSlotId,
      });

      const mockPayment = test.factory.payment.create({
        userId,
        amount: new Decimal(99.99),
        status: PaymentStatus.PENDING,
        paypalOrderId,
      });

      test.mocks.SessionsService.findOne.mockResolvedValue(mockSession);
      test.mocks.PrismaService.payment.findFirst.mockResolvedValue(mockPayment);
      test.mocks.PrismaService.payment.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.FAILED,
      });

      // Mock getAccessToken and failed capture
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => test.factory.payment.createAccessTokenResponse(),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Capture failed' }),
        });

      await expect(test.service.captureOrder(captureDto, userId, Role.USER)).rejects.toThrow(
        'Payment capture failed'
      );
      expect(test.mocks.SessionsService.markAsPaidInternal).not.toHaveBeenCalled();
      expect(test.mocks.TimeSlotsService.markAsUnavailableInternal).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when capture status is not COMPLETED', async () => {
      const userId = 'cuser12345678901234567';
      const sessionId = 'csession123456789012345';
      const timeSlotId = 'ctimeslot1234567890123';
      const paypalOrderId = 'paypal-order-123';

      const captureDto: CapturePaymentDto = {
        orderId: paypalOrderId,
        sessionId,
      };

      const mockSession = test.factory.session.createWithNulls({
        id: sessionId,
        userId,
        coachId: 'ccoach1234567890123456',
        timeSlotId,
      });

      const mockPayment = test.factory.payment.create({
        userId,
        amount: new Decimal(99.99),
        status: PaymentStatus.PENDING,
        paypalOrderId,
      });

      test.mocks.SessionsService.findOne.mockResolvedValue(mockSession);
      test.mocks.PrismaService.payment.findFirst.mockResolvedValue(mockPayment);
      test.mocks.PrismaService.payment.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.FAILED,
      });

      // Mock getAccessToken and capture with non-COMPLETED status
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => test.factory.payment.createAccessTokenResponse(),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () =>
            test.factory.payment.createPayPalCapture({
              status: 'PENDING',
            }),
        });

      await expect(test.service.captureOrder(captureDto, userId, Role.USER)).rejects.toThrow(
        'Payment capture failed'
      );
      expect(test.mocks.SessionsService.markAsPaidInternal).not.toHaveBeenCalled();
      expect(test.mocks.TimeSlotsService.markAsUnavailableInternal).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return payment when found', async () => {
      const mockPayment = test.factory.payment.create({
        status: PaymentStatus.COMPLETED,
        paypalOrderId: 'paypal-order-123',
        paypalCaptureId: 'capture-123',
      });
      test.mocks.PrismaService.payment.findFirst.mockResolvedValue(mockPayment);

      const result = await test.service.findById(mockPayment.id);

      expect(result.id).toBe(mockPayment.id);
      expect(result.amount).toBe(Number(mockPayment.amount));
      expect(result.status).toBe(PaymentStatus.COMPLETED);
    });

    it('should throw NotFoundException when payment not found', async () => {
      test.mocks.PrismaService.payment.findFirst.mockResolvedValue(null);

      await expect(test.service.findById('cnonexistent12345678901')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('findByUserId', () => {
    it('should return payments for a user', async () => {
      const userId = 'cuser12345678901234567';
      const mockPayments = [
        test.factory.payment.create({
          userId,
          amount: new Decimal(99.99),
          status: PaymentStatus.COMPLETED,
          paypalOrderId: 'paypal-order-123',
          paypalCaptureId: 'capture-123',
        }),
        test.factory.payment.create({
          userId,
          amount: new Decimal(49.99),
          status: PaymentStatus.PENDING,
          paypalOrderId: 'paypal-order-456',
        }),
      ];
      test.mocks.PrismaService.payment.findMany.mockResolvedValue(mockPayments);

      const result = await test.service.findByUserId(userId);

      expect(result).toHaveLength(2);
      expect(result[0]?.amount).toBe(99.99);
      expect(result[1]?.amount).toBe(49.99);
    });

    it('should return empty array when no payments found', async () => {
      test.mocks.PrismaService.payment.findMany.mockResolvedValue([]);

      const result = await test.service.findByUserId('cuser12345678901234567');

      expect(result).toEqual([]);
    });
  });

  describe('updateStatus', () => {
    it('should update payment status', async () => {
      const mockPayment = test.factory.payment.create({
        status: PaymentStatus.PENDING,
        paypalOrderId: 'paypal-order-123',
      });
      const updatedPayment = { ...mockPayment, status: PaymentStatus.COMPLETED };

      test.mocks.PrismaService.payment.findFirst.mockResolvedValue(mockPayment);
      test.mocks.PrismaService.payment.update.mockResolvedValue(updatedPayment);

      const result = await test.service.updateStatus(mockPayment.id, {
        status: PaymentStatus.COMPLETED,
      });

      expect(result.status).toBe(PaymentStatus.COMPLETED);
    });

    it('should throw NotFoundException when payment not found', async () => {
      test.mocks.PrismaService.payment.findFirst.mockResolvedValue(null);

      await expect(
        test.service.updateStatus('cnonexistent12345678901', { status: PaymentStatus.COMPLETED })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('countPayments', () => {
    it('should return total payment count', async () => {
      test.mocks.PrismaService.payment.count.mockResolvedValue(10);

      const result = await test.service.countPayments();

      expect(result).toBe(10);
    });
  });

  describe('countByStatus', () => {
    it('should return count of payments by status', async () => {
      test.mocks.PrismaService.payment.count.mockResolvedValue(5);

      const result = await test.service.countByStatus(PaymentStatus.COMPLETED);

      expect(result).toBe(5);
      expect(test.mocks.PrismaService.payment.count).toHaveBeenCalledWith({
        where: { status: PaymentStatus.COMPLETED },
      });
    });
  });

  describe('getTotalRevenue', () => {
    it('should return total revenue from completed payments', async () => {
      test.mocks.PrismaService.payment.aggregate.mockResolvedValue({
        _sum: { amount: 500.0 },
      });

      const result = await test.service.getTotalRevenue();

      expect(result).toBe(500);
      expect(test.mocks.PrismaService.payment.aggregate).toHaveBeenCalledWith({
        where: { status: PaymentStatus.COMPLETED },
        _sum: { amount: true },
      });
    });

    it('should return 0 when no completed payments', async () => {
      test.mocks.PrismaService.payment.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });

      const result = await test.service.getTotalRevenue();

      expect(result).toBe(0);
    });
  });

  describe('getPaymentsInDateRange', () => {
    it('should return payments within date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      const mockPayments = [
        test.factory.payment.create({
          status: PaymentStatus.COMPLETED,
          paypalOrderId: 'paypal-order-123',
          paypalCaptureId: 'capture-123',
          createdAt: new Date('2024-06-15'),
          updatedAt: new Date('2024-06-15'),
        }),
      ];
      test.mocks.PrismaService.payment.findMany.mockResolvedValue(mockPayments);

      const result = await test.service.getPaymentsInDateRange(startDate, endDate);

      expect(result).toHaveLength(1);
      expect(test.mocks.PrismaService.payment.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          status: PaymentStatus.COMPLETED,
        },
        orderBy: { createdAt: 'asc' },
      });
    });
  });
});
