import { Role } from '@prisma/client';
import { ControllerTest } from '@test-utils';

import { CapturePaymentDto, CreatePaymentDto } from './dto/payment.dto';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

describe('PaymentsController', () => {
  let test: ControllerTest<PaymentsController, PaymentsService, 'payments'>;
  let mockService: jest.Mocked<PaymentsService>;

  beforeEach(async () => {
    mockService = {
      createOrder: jest.fn(),
      captureOrder: jest.fn(),
    } as any;

    test = new ControllerTest({
      controllerClass: PaymentsController,
      moduleName: 'payments',
      providers: [{ provide: PaymentsService, useValue: mockService }],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('POST /payments/create-order', () => {
    it('should call createOrder service method with correct parameters', async () => {
      const createDto: CreatePaymentDto = {
        sessionId: 'session-123',
        amount: 99.99,
      };

      const mockResponse = {
        orderId: 'paypal-order-123',
        approvalUrl: 'https://paypal.com/approve/order-123',
      };

      mockService.createOrder.mockResolvedValue(mockResponse);

      const userToken = await test.auth.createRoleToken(Role.USER, {
        sub: 'user-123',
      });

      const response = await test.http.authenticatedPost('/api/payments/create-order', userToken, {
        body: createDto,
      });

      expect(mockService.createOrder).toHaveBeenCalledWith(createDto, 'user-123');
      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockResponse);
    });
  });

  describe('POST /payments/capture-order', () => {
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

      mockService.captureOrder.mockResolvedValue(mockResponse);

      const userToken = await test.auth.createRoleToken(Role.USER, {
        sub: 'user-123',
      });

      const response = await test.http.authenticatedPost('/api/payments/capture-order', userToken, {
        body: captureDto,
      });

      expect(mockService.captureOrder).toHaveBeenCalledWith(captureDto, 'user-123');
      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockResponse);
    });

    it('should work for authenticated users', async () => {
      const captureDto: CapturePaymentDto = {
        orderId: 'paypal-order-123',
        sessionId: 'session-123',
      };

      const mockResponse = {
        success: true,
        paymentId: 'paypal-order-123',
        captureId: 'capture-123',
      };

      mockService.captureOrder.mockResolvedValue(mockResponse);

      const userToken = await test.auth.createRoleToken(Role.USER, {
        sub: 'user-456',
      });

      const response = await test.http.authenticatedPost('/api/payments/capture-order', userToken, {
        body: captureDto,
      });

      expect(mockService.captureOrder).toHaveBeenCalledWith(captureDto, 'user-456');
      expect(response.status).toBe(201);
    });
  });
});
