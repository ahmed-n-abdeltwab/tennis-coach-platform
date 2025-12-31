import { BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ControllerTest } from '@test-utils';
import { DeepMocked } from '@test-utils/mixins/mock.mixin';

import { CapturePaymentDto, CreatePaymentDto } from './dto/payment.dto';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

/**
 * PaymentsControllerMocks interface defines typed mocks for the PaymentsController dependencies.
 *
 * This interface provides IntelliSense support for:
 * - PaymentsService mock (createOrder, captureOrder methods)
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
        sessionId: 'session-123',
        amount: 99.99,
      };

      const mockResponse = {
        orderId: 'paypal-order-123',
        approvalUrl: 'https://paypal.com/approve/order-123',
      };

      test.mocks.PaymentsService.createOrder.mockResolvedValue(mockResponse);

      const userToken = await test.auth.createRoleToken(Role.USER, {
        sub: 'user-123',
      });
      await test.http.authenticatedPost('/api/payments/create-order', userToken, {
        body: createDto,
      });

      expect(test.mocks.PaymentsService.createOrder).toHaveBeenCalledWith(
        createDto,
        'user-123',
        Role.USER
      );
    });

    it('should allow coach to create payment order', async () => {
      const createDto: CreatePaymentDto = {
        sessionId: 'session-456',
        amount: 150.0,
      };

      const mockResponse = {
        orderId: 'paypal-order-456',
        approvalUrl: 'https://paypal.com/approve/order-456',
      };

      test.mocks.PaymentsService.createOrder.mockResolvedValue(mockResponse);

      const coachToken = await test.auth.createRoleToken(Role.COACH, {
        sub: 'coach-123',
      });
      await test.http.authenticatedPost('/api/payments/create-order', coachToken, {
        body: createDto,
      });

      expect(test.mocks.PaymentsService.createOrder).toHaveBeenCalledWith(
        createDto,
        'coach-123',
        Role.COACH
      );
    });

    it('should handle invalid session error', async () => {
      const createDto: CreatePaymentDto = {
        sessionId: 'invalid-session',
        amount: 99.99,
      };

      test.mocks.PaymentsService.createOrder.mockRejectedValue(
        new BadRequestException('Invalid session')
      );

      const userToken = await test.auth.createRoleToken(Role.USER, {
        sub: 'user-123',
      });
      const response = await test.http.authenticatedPost('/api/payments/create-order', userToken, {
        body: createDto,
      });

      expect(response.status).toBe(400);
    });

    it('should handle session already paid error', async () => {
      const createDto: CreatePaymentDto = {
        sessionId: 'paid-session',
        amount: 99.99,
      };

      test.mocks.PaymentsService.createOrder.mockRejectedValue(
        new BadRequestException('Session already paid')
      );

      const userToken = await test.auth.createRoleToken(Role.USER, {
        sub: 'user-123',
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
        sessionId: 'session-123',
      };

      const mockResponse = {
        success: true,
        paymentId: 'paypal-order-123',
        captureId: 'capture-123',
      };

      test.mocks.PaymentsService.captureOrder.mockResolvedValue(mockResponse);

      const userToken = await test.auth.createRoleToken(Role.USER, {
        sub: 'user-123',
      });
      await test.http.authenticatedPost('/api/payments/capture-order', userToken, {
        body: captureDto,
      });

      expect(test.mocks.PaymentsService.captureOrder).toHaveBeenCalledWith(
        captureDto,
        'user-123',
        Role.USER
      );
    });

    it('should allow coach to capture payment order', async () => {
      const captureDto: CapturePaymentDto = {
        orderId: 'paypal-order-456',
        sessionId: 'session-456',
      };

      const mockResponse = {
        success: true,
        paymentId: 'paypal-order-456',
        captureId: 'capture-456',
      };

      test.mocks.PaymentsService.captureOrder.mockResolvedValue(mockResponse);

      const coachToken = await test.auth.createRoleToken(Role.COACH, {
        sub: 'coach-123',
      });
      await test.http.authenticatedPost('/api/payments/capture-order', coachToken, {
        body: captureDto,
      });

      expect(test.mocks.PaymentsService.captureOrder).toHaveBeenCalledWith(
        captureDto,
        'coach-123',
        Role.COACH
      );
    });

    it('should handle invalid session error', async () => {
      const captureDto: CapturePaymentDto = {
        orderId: 'paypal-order-123',
        sessionId: 'invalid-session',
      };

      test.mocks.PaymentsService.captureOrder.mockRejectedValue(
        new BadRequestException('Invalid session')
      );

      const userToken = await test.auth.createRoleToken(Role.USER, {
        sub: 'user-123',
      });
      const response = await test.http.authenticatedPost('/api/payments/capture-order', userToken, {
        body: captureDto,
      });

      expect(response.status).toBe(400);
    });

    it('should handle payment capture failure', async () => {
      const captureDto: CapturePaymentDto = {
        orderId: 'failed-order',
        sessionId: 'session-123',
      };

      test.mocks.PaymentsService.captureOrder.mockRejectedValue(
        new BadRequestException('Payment capture failed')
      );

      const userToken = await test.auth.createRoleToken(Role.USER, {
        sub: 'user-123',
      });
      const response = await test.http.authenticatedPost('/api/payments/capture-order', userToken, {
        body: captureDto,
      });

      expect(response.status).toBe(400);
    });
  });
});
