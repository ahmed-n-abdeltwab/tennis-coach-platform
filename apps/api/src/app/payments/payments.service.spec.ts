import { ConfigType } from '@nestjs/config';
import { Role } from '@prisma/client';
import { ServiceTest } from '@test-utils';
import { DeepMocked } from '@test-utils/mixins/mock.mixin';

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
 * - SessionsService mock (findOne, markAsPaidInternal methods)
 * - TimeSlotsService mock (markAsUnavailableInternal method)
 */
interface PaymentMocks {
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
      const userId = 'user-123';
      const createDto: CreatePaymentDto = {
        sessionId: 'session-123',
        amount: 99.99,
      };

      const mockSession = test.factory.session.createWithNulls({
        id: 'session-123',
        userId: 'user-123',
        coachId: 'coach-1',
        isPaid: false,
      });

      const mockAccessToken = 'mock-access-token';
      const mockPayPalOrder = {
        id: 'paypal-order-123',
        links: [
          { rel: 'self', href: 'https://api.paypal.com/self' },
          { rel: 'approve', href: 'https://paypal.com/approve/order-123' },
        ],
      };

      test.mocks.SessionsService.findOne.mockResolvedValue(mockSession);

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

      const result = await test.service.createOrder(createDto, userId, Role.USER);

      expect(result).toEqual({
        orderId: 'paypal-order-123',
        approvalUrl: 'https://paypal.com/approve/order-123',
      });
      expect(test.mocks.SessionsService.findOne).toHaveBeenCalledWith(
        'session-123',
        userId,
        Role.USER
      );
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should throw BadRequestException when session does not belong to user', async () => {
      const userId = 'user-123';
      const createDto: CreatePaymentDto = {
        sessionId: 'session-123',
        amount: 99.99,
      };

      const mockSession = test.factory.session.createWithNulls({
        id: 'session-123',
        userId: 'different-user',
        isPaid: false,
      });

      test.mocks.SessionsService.findOne.mockResolvedValue(mockSession);

      await expect(test.service.createOrder(createDto, userId, Role.USER)).rejects.toThrow(
        'Invalid session'
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when session is already paid', async () => {
      const userId = 'user-123';
      const createDto: CreatePaymentDto = {
        sessionId: 'session-123',
        amount: 99.99,
      };

      const mockSession = test.factory.session.createWithNulls({
        id: 'session-123',
        userId: 'user-123',
        isPaid: true,
      });

      test.mocks.SessionsService.findOne.mockResolvedValue(mockSession);

      await expect(test.service.createOrder(createDto, userId, Role.USER)).rejects.toThrow(
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

      const mockSession = test.factory.session.createWithNulls({
        id: 'session-123',
        userId: 'user-123',
        isPaid: false,
      });

      test.mocks.SessionsService.findOne.mockResolvedValue(mockSession);

      // Mock getAccessToken and failed createOrder
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ accessToken: 'token' }),
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
      const userId = 'user-123';
      const captureDto: CapturePaymentDto = {
        orderId: 'paypal-order-123',
        sessionId: 'session-123',
      };

      const mockSession = test.factory.session.createWithNulls({
        id: 'session-123',
        userId: 'user-123',
        coachId: 'coach-1',
        timeSlotId: 'slot-1',
        isPaid: false,
      });

      const mockAccessToken = 'mock-access-token';
      const mockCaptureResult = {
        id: 'capture-123',
        status: 'COMPLETED',
      };

      test.mocks.SessionsService.findOne.mockResolvedValue(mockSession);

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

      test.mocks.SessionsService.markAsPaidInternal.mockResolvedValue(undefined);
      test.mocks.TimeSlotsService.markAsUnavailableInternal.mockResolvedValue(undefined);

      const result = await test.service.captureOrder(captureDto, userId, Role.USER);

      expect(result).toEqual({
        success: true,
        paymentId: 'paypal-order-123',
        captureId: 'capture-123',
      });
      expect(test.mocks.SessionsService.findOne).toHaveBeenCalledWith(
        'session-123',
        userId,
        Role.USER
      );
      expect(test.mocks.SessionsService.markAsPaidInternal).toHaveBeenCalledWith(
        'session-123',
        'paypal-order-123'
      );
      expect(test.mocks.TimeSlotsService.markAsUnavailableInternal).toHaveBeenCalledWith('slot-1');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should throw BadRequestException when session does not belong to user', async () => {
      const userId = 'user-123';
      const captureDto: CapturePaymentDto = {
        orderId: 'paypal-order-123',
        sessionId: 'session-123',
      };

      const mockSession = test.factory.session.createWithNulls({
        id: 'session-123',
        userId: 'different-user',
      });

      test.mocks.SessionsService.findOne.mockResolvedValue(mockSession);

      await expect(test.service.captureOrder(captureDto, userId, Role.USER)).rejects.toThrow(
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

      const mockSession = test.factory.session.createWithNulls({
        id: 'session-123',
        userId: 'user-123',
        coachId: 'coach-1',
        timeSlotId: 'slot-1',
      });

      test.mocks.SessionsService.findOne.mockResolvedValue(mockSession);

      // Mock getAccessToken and failed capture
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ accessToken: 'token' }),
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
      const userId = 'user-123';
      const captureDto: CapturePaymentDto = {
        orderId: 'paypal-order-123',
        sessionId: 'session-123',
      };

      const mockSession = test.factory.session.createWithNulls({
        id: 'session-123',
        userId: 'user-123',
        coachId: 'coach-1',
        timeSlotId: 'slot-1',
      });

      test.mocks.SessionsService.findOne.mockResolvedValue(mockSession);

      // Mock getAccessToken and capture with non-COMPLETED status
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ accessToken: 'token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'capture-123', status: 'PENDING' }),
        });

      await expect(test.service.captureOrder(captureDto, userId, Role.USER)).rejects.toThrow(
        'Payment capture failed'
      );
      expect(test.mocks.SessionsService.markAsPaidInternal).not.toHaveBeenCalled();
      expect(test.mocks.TimeSlotsService.markAsUnavailableInternal).not.toHaveBeenCalled();
    });
  });
});
