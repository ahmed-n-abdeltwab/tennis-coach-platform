import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentStatus, Role } from '@prisma/client';
import { ControllerTest } from '@test-utils';
import { DeepMocked } from '@test-utils/mixins/mock.mixin';

import {
  CapturePaymentDto,
  CreatePaymentDto,
  PaymentResponseDto,
  UpdatePaymentStatusDto,
} from './dto/payment.dto';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

/**
 * PaymentsControllerMocks interface defines typed mocks for the PaymentsController dependencies.
 *
 * This interface provides IntelliSense support for:
 * - PaymentsService mock (createOrder, captureOrder, findById, findByUserId, updateStatus methods)
 */
interface PaymentsControllerMocks {
  PaymentsService: DeepMocked<PaymentsService>;
}

describe('PaymentsController', () => {
  let test: ControllerTest<PaymentsController, PaymentsControllerMocks, 'payments'>;

  beforeEach(async () => {
    test = new ControllerTest({
      controller: PaymentsController,
      moduleName: 'payments',
      providers: [PaymentsService],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('POST /api/payments/create-order', () => {
    it('should call createOrder service method with correct parameters', async () => {
      const createDto: CreatePaymentDto = {
        sessionId: 'csession123456789012345',
        amount: '99.99',
      };

      const mockResponse = {
        orderId: 'paypal-order-123',
        approvalUrl: 'https://paypal.com/approve/order-123',
      };

      test.mocks.PaymentsService.createOrder.mockResolvedValue(mockResponse);

      const userToken = await test.auth.createToken({
        role: Role.USER,
        sub: 'cuser12345678901234567',
      });
      await test.http.authenticatedPost('/api/payments/create-order', userToken, {
        body: createDto,
      });

      expect(test.mocks.PaymentsService.createOrder).toHaveBeenCalledWith(
        createDto,
        'cuser12345678901234567',
        Role.USER
      );
    });

    it('should allow coach to create payment order', async () => {
      const createDto: CreatePaymentDto = {
        sessionId: 'csession456789012345678',
        amount: '150.0',
      };

      const mockResponse = {
        orderId: 'paypal-order-456',
        approvalUrl: 'https://paypal.com/approve/order-456',
      };

      test.mocks.PaymentsService.createOrder.mockResolvedValue(mockResponse);

      const coachToken = await test.auth.createToken({
        role: Role.COACH,
        sub: 'ccoach1234567890123456',
      });
      await test.http.authenticatedPost('/api/payments/create-order', coachToken, {
        body: createDto,
      });

      expect(test.mocks.PaymentsService.createOrder).toHaveBeenCalledWith(
        createDto,
        'ccoach1234567890123456',
        Role.COACH
      );
    });

    it('should handle invalid session error', async () => {
      const createDto: CreatePaymentDto = {
        sessionId: 'cinvalidsession12345678',
        amount: '99.99',
      };

      test.mocks.PaymentsService.createOrder.mockRejectedValue(
        new BadRequestException('Invalid session')
      );

      const userToken = await test.auth.createToken({
        role: Role.USER,
        sub: 'cuser12345678901234567',
      });
      const response = await test.http.authenticatedPost('/api/payments/create-order', userToken, {
        body: createDto,
      });

      expect(response.status).toBe(400);
    });

    it('should handle session already paid error', async () => {
      const createDto: CreatePaymentDto = {
        sessionId: 'cpaidsession1234567890',
        amount: '99.99',
      };

      test.mocks.PaymentsService.createOrder.mockRejectedValue(
        new BadRequestException('Session already paid')
      );

      const userToken = await test.auth.createToken({
        role: Role.USER,
        sub: 'cuser12345678901234567',
      });
      const response = await test.http.authenticatedPost('/api/payments/create-order', userToken, {
        body: createDto,
      });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/payments/capture-order', () => {
    it('should call captureOrder service method with correct parameters', async () => {
      const captureDto: CapturePaymentDto = {
        orderId: 'paypal-order-123',
        sessionId: 'csession123456789012345',
      };

      const mockResponse = {
        success: true,
        paymentId: 'paypal-order-123',
        captureId: 'capture-123',
      };

      test.mocks.PaymentsService.captureOrder.mockResolvedValue(mockResponse);

      const userToken = await test.auth.createToken({
        role: Role.USER,
        sub: 'cuser12345678901234567',
      });
      await test.http.authenticatedPost('/api/payments/capture-order', userToken, {
        body: captureDto,
      });

      expect(test.mocks.PaymentsService.captureOrder).toHaveBeenCalledWith(
        captureDto,
        'cuser12345678901234567',
        Role.USER
      );
    });

    it('should allow coach to capture payment order', async () => {
      const captureDto: CapturePaymentDto = {
        orderId: 'paypal-order-456',
        sessionId: 'csession456789012345678',
      };

      const mockResponse = {
        success: true,
        paymentId: 'paypal-order-456',
        captureId: 'capture-456',
      };

      test.mocks.PaymentsService.captureOrder.mockResolvedValue(mockResponse);

      const coachToken = await test.auth.createToken({
        role: Role.COACH,
        sub: 'ccoach1234567890123456',
      });
      await test.http.authenticatedPost('/api/payments/capture-order', coachToken, {
        body: captureDto,
      });

      expect(test.mocks.PaymentsService.captureOrder).toHaveBeenCalledWith(
        captureDto,
        'ccoach1234567890123456',
        Role.COACH
      );
    });

    it('should handle invalid session error', async () => {
      const captureDto: CapturePaymentDto = {
        orderId: 'paypal-order-123',
        sessionId: 'cinvalidsession12345678',
      };

      test.mocks.PaymentsService.captureOrder.mockRejectedValue(
        new BadRequestException('Invalid session')
      );

      const userToken = await test.auth.createToken({
        role: Role.USER,
        sub: 'cuser12345678901234567',
      });
      const response = await test.http.authenticatedPost('/api/payments/capture-order', userToken, {
        body: captureDto,
      });

      expect(response.status).toBe(400);
    });

    it('should handle payment capture failure', async () => {
      const captureDto: CapturePaymentDto = {
        orderId: 'failed-order',
        sessionId: 'csession123456789012345',
      };

      test.mocks.PaymentsService.captureOrder.mockRejectedValue(
        new BadRequestException('Payment capture failed')
      );

      const userToken = await test.auth.createToken({
        role: Role.USER,
        sub: 'cuser12345678901234567',
      });
      const response = await test.http.authenticatedPost('/api/payments/capture-order', userToken, {
        body: captureDto,
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/payments/:id', () => {
    it('should return payment by ID', async () => {
      const mockPayment: PaymentResponseDto = {
        id: 'cpayment12345678901234',
        userId: 'cuser12345678901234567',
        amount: 99.99,
        currency: 'USD',
        status: PaymentStatus.COMPLETED,
        paypalOrderId: 'paypal-order-123',
        paypalCaptureId: 'capture-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      test.mocks.PaymentsService.findById.mockResolvedValue(mockPayment);

      const userToken = await test.auth.createToken({
        role: Role.USER,
        sub: 'cuser12345678901234567',
      });
      const response = await test.http.authenticatedGet(
        '/api/payments/cpayment12345678901234' as '/api/payments/{id}',
        userToken
      );

      expect(response.status).toBe(200);
      expect(test.mocks.PaymentsService.findById).toHaveBeenCalledWith('cpayment12345678901234');
    });

    it('should return 404 when payment not found', async () => {
      test.mocks.PaymentsService.findById.mockRejectedValue(
        new NotFoundException('Payment not found')
      );

      const userToken = await test.auth.createToken({
        role: Role.USER,
        sub: 'cuser12345678901234567',
      });
      const response = await test.http.authenticatedGet(
        '/api/payments/cnonexistent1234567890' as '/api/payments/{id}',
        userToken
      );

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/payments/user/:userId', () => {
    it('should return payments by user ID', async () => {
      const mockPayments: PaymentResponseDto[] = [
        {
          id: 'cpayment12345678901234',
          userId: 'cuser12345678901234567',
          amount: 99.99,
          currency: 'USD',
          status: PaymentStatus.COMPLETED,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      test.mocks.PaymentsService.findByUserId.mockResolvedValue(mockPayments);

      const userToken = await test.auth.createToken({
        role: Role.USER,
        sub: 'cuser12345678901234567',
      });
      const response = await test.http.authenticatedGet(
        '/api/payments/user/cuser12345678901234567' as '/api/payments/user/{userId}',
        userToken
      );

      expect(response.status).toBe(200);
      expect(test.mocks.PaymentsService.findByUserId).toHaveBeenCalledWith(
        'cuser12345678901234567'
      );
    });
  });

  describe('PATCH /api/payments/:id/status', () => {
    it('should allow admin to update payment status', async () => {
      const updateDto: UpdatePaymentStatusDto = {
        status: PaymentStatus.REFUNDED,
      };

      const mockPayment: PaymentResponseDto = {
        id: 'cpayment12345678901234',
        userId: 'cuser12345678901234567',
        amount: 99.99,
        currency: 'USD',
        status: PaymentStatus.REFUNDED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      test.mocks.PaymentsService.updateStatus.mockResolvedValue(mockPayment);

      const adminToken = await test.auth.createToken({
        role: Role.ADMIN,
        sub: 'cadmin1234567890123456',
      });
      const response = await test.http.authenticatedPatch(
        '/api/payments/cpayment12345678901234/status' as '/api/payments/{id}/status',
        adminToken,
        { body: updateDto }
      );

      expect(response.status).toBe(200);
      expect(test.mocks.PaymentsService.updateStatus).toHaveBeenCalledWith(
        'cpayment12345678901234',
        updateDto
      );
    });

    it('should deny non-admin users from updating payment status', async () => {
      const updateDto: UpdatePaymentStatusDto = {
        status: PaymentStatus.REFUNDED,
      };

      const userToken = await test.auth.createToken({
        role: Role.USER,
        sub: 'cuser12345678901234567',
      });
      const response = await test.http.authenticatedPatch(
        '/api/payments/cpayment12345678901234/status' as '/api/payments/{id}/status',
        userToken,
        { body: updateDto }
      );

      expect(response.status).toBe(403);
      expect(test.mocks.PaymentsService.updateStatus).not.toHaveBeenCalled();
    });
  });
});
