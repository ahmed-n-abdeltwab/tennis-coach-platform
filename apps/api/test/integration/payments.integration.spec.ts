import { BadRequestException, INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { TestDatabaseManager } from '@test/utils/database/test-database-manager';
import {
  bookingTypeFactory,
  coachFactory,
  paymentFactory,
  sessionFactory,
  timeSlotFactory,
  userFactory,
} from '@test/utils/facto';
import { PrismaModule, PrismaService } from '../prisma/prisma.service';

import paymentsConfig from '../../src/app/payments/config/payments.config';
import { CapturePaymentDto, CreatePaymentDto } from '../../src/app/payments/dto/payment.dto';
import { PaymentsModule } from '../../src/app/payments/payments.module';
import { PaymentsService } from '../../src/app/payments/payments.service';

// Mock fetch globally
global.fetch = jest.fn();

describe('Payments Integration', () => {
  let app: INestApplication;
  let paymentsService: PaymentsService;
  let prisma: PrismaService;
  let dbManager: TestDatabaseManager;

  beforeAll(async () => {
    dbManager = TestDatabaseManager.getInstance();
    await dbManager.setupTestDatabase('payments-integration');

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [paymentsConfig],
        }),
        PrismaModule,
        PaymentsModule,
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    paymentsService = module.get<PaymentsService>(PaymentsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
    await dbManager.cleanupTestDatabase('payments-integration');
  });

  beforeEach(async () => {
    await dbManager.cleanupTestData();
    (fetch as jest.Mock).mockReset();
  });

  describe('Payment Order Creation Workflow', () => {
    it('should create a complete payment order workflow', async () => {
      // Arrange - Create test data
      const user = await prisma.account.create({
        data: userFactory.create(),
      });

      const coach = await prisma.account.create({
        data: coachFactory.create(),
      });

      const bookingType = await prisma.bookingType.create({
        data: bookingTypeFactory.createWithCoach(coach.id),
      });

      const timeSlot = await prisma.timeSlot.create({
        data: timeSlotFactory.createWithCoach(coach.id, { isAvailable: true }),
      });

      const session = await prisma.session.create({
        data: sessionFactory.create({
          userId: user.id,
          coachId: coach.id,
          bookingTypeId: bookingType.id,
          timeSlotId: timeSlot.id,
          isPaid: false,
        }),
      });

      const createDto: CreatePaymentDto = {
        sessionId: session.id,
        amount: 100.0,
      };

      const mockPayPalOrder = paymentFactory.createPayPalOrder();
      const mockAccessToken = 'mock-access-token';

      // Mock PayPal API responses
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ accessToken: mockAccessToken }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPayPalOrder),
        });

      // Act
      const result = await paymentsService.createOrder(createDto, user.id);

      // Assert
      expect(result).toEqual({
        orderId: mockPayPalOrder.id,
        approvalUrl: mockPayPalOrder.links.find(link => link.rel === 'approve')?.href,
      });

      // Verify PayPal API calls
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenNthCalledWith(
        1,
        'https://api-m.sandbox.paypal.com/v1/oauth2/token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: expect.stringContaining('Basic '),
          }),
        })
      );
      expect(fetch).toHaveBeenNthCalledWith(
        2,
        'https://api-m.sandbox.paypal.com/v2/checkout/orders',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockAccessToken}`,
          }),
        })
      );
    });

    it('should handle session validation in payment workflow', async () => {
      // Arrange
      const user = await prisma.account.create({
        data: userFactory.create(),
      });

      const createDto: CreatePaymentDto = {
        sessionId: 'non-existent-session',
        amount: 100.0,
      };

      // Act & Assert
      await expect(paymentsService.createOrder(createDto, user.id)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should prevent payment for already paid sessions', async () => {
      // Arrange
      const user = await prisma.account.create({
        data: userFactory.create(),
      });

      const session = await prisma.session.create({
        data: sessionFactory.create({
          userId: user.id,
          isPaid: true,
          paymentId: 'existing-payment-id',
        }),
      });

      const createDto: CreatePaymentDto = {
        sessionId: session.id,
        amount: 100.0,
      };

      // Act & Assert
      await expect(paymentsService.createOrder(createDto, user.id)).rejects.toThrow(
        new BadRequestException('Session already paid')
      );
    });
  });

  describe('Payment Capture Workflow', () => {
    it('should complete payment capture workflow', async () => {
      // Arrange - Create test data
      const user = await prisma.account.create({
        data: userFactory.create(),
      });

      const timeSlot = await prisma.timeSlot.create({
        data: timeSlotFactory.create({ isAvailable: true }),
      });

      const session = await prisma.session.create({
        data: sessionFactory.create({
          userId: user.id,
          timeSlotId: timeSlot.id,
          isPaid: false,
        }),
      });

      const captureDto: CapturePaymentDto = {
        orderId: 'PAYPAL_ORDER_123',
        sessionId: session.id,
      };

      const mockCaptureResult = {
        id: 'CAPTURE_456',
        status: 'COMPLETED',
      };
      const mockAccessToken = 'mock-access-token';

      // Mock PayPal API responses
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ accessToken: mockAccessToken }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCaptureResult),
        });

      // Act
      const result = await paymentsService.captureOrder(captureDto, user.id);

      // Assert
      expect(result).toEqual({
        success: true,
        paymentId: captureDto.orderId,
        captureId: mockCaptureResult.id,
      });

      // Verify database updates
      const updatedSession = await prisma.session.findUnique({
        where: { id: session.id },
      });
      expect(updatedSession?.isPaid).toBe(true);
      expect(updatedSession?.paymentId).toBe(captureDto.orderId);

      const updatedTimeSlot = await prisma.timeSlot.findUnique({
        where: { id: timeSlot.id },
      });
      expect(updatedTimeSlot?.isAvailable).toBe(false);
    });

    it('should handle payment capture failures', async () => {
      // Arrange
      const user = await prisma.account.create({
        data: userFactory.create(),
      });

      const session = await prisma.session.create({
        data: sessionFactory.create({
          userId: user.id,
          isPaid: false,
        }),
      });

      const captureDto: CapturePaymentDto = {
        orderId: 'PAYPAL_ORDER_123',
        sessionId: session.id,
      };

      // Mock PayPal API responses - capture failure
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ accessToken: 'mock-token' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Capture failed' }),
        });

      // Act & Assert
      await expect(paymentsService.captureOrder(captureDto, user.id)).rejects.toThrow(
        BadRequestException
      );

      // Verify session remains unpaid
      const unchangedSession = await prisma.session.findUnique({
        where: { id: session.id },
      });
      expect(unchangedSession?.isPaid).toBe(false);
      expect(unchangedSession?.paymentId).toBeNull();
    });
  });

  describe('Payment Status Tracking', () => {
    it('should track payment status through complete workflow', async () => {
      // Arrange - Create complete booking scenario
      const user = await prisma.account.create({
        data: userFactory.create(),
      });

      const coach = await prisma.account.create({
        data: coachFactory.create(),
      });

      const bookingType = await prisma.bookingType.create({
        data: bookingTypeFactory.createWithCoach(coach.id),
      });

      const timeSlot = await prisma.timeSlot.create({
        data: timeSlotFactory.createWithCoach(coach.id, { isAvailable: true }),
      });

      const session = await prisma.session.create({
        data: sessionFactory.create({
          userId: user.id,
          coachId: coach.id,
          bookingTypeId: bookingType.id,
          timeSlotId: timeSlot.id,
          isPaid: false,
          status: 'scheduled',
        }),
      });

      // Mock PayPal responses for both create and capture
      const mockPayPalOrder = paymentFactory.createPayPalOrder();
      const mockCaptureResult = { id: 'CAPTURE_456', status: 'COMPLETED' };
      const mockAccessToken = 'mock-access-token';

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ accessToken: mockAccessToken }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPayPalOrder),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ accessToken: mockAccessToken }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCaptureResult),
        });

      // Act - Complete payment workflow
      // Step 1: Create order
      const createResult = await paymentsService.createOrder(
        { sessionId: session.id, amount: 100.0 },
        user.id
      );

      // Step 2: Capture order
      const captureResult = await paymentsService.captureOrder(
        { orderId: createResult.orderId, sessionId: session.id },
        user.id
      );

      // Assert - Verify complete workflow
      expect(createResult.orderId).toBeDefined();
      expect(createResult.approvalUrl).toBeDefined();
      expect(captureResult.success).toBe(true);
      expect(captureResult.paymentId).toBe(createResult.orderId);

      // Verify final database state
      const finalSession = await prisma.session.findUnique({
        where: { id: session.id },
      });
      expect(finalSession?.isPaid).toBe(true);
      expect(finalSession?.paymentId).toBe(createResult.orderId);

      const finalTimeSlot = await prisma.timeSlot.findUnique({
        where: { id: timeSlot.id },
      });
      expect(finalTimeSlot?.isAvailable).toBe(false);
    });
  });

  describe('Error Handling in Payment Workflows', () => {
    it('should handle PayPal API errors gracefully', async () => {
      // Arrange
      const user = await prisma.account.create({
        data: userFactory.create(),
      });

      const session = await prisma.session.create({
        data: sessionFactory.create({
          userId: user.id,
          isPaid: false,
        }),
      });

      // Mock PayPal API failure
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ accessToken: 'mock-token' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ error: 'Invalid request' }),
        });

      // Act & Assert
      await expect(
        paymentsService.createOrder({ sessionId: session.id, amount: 100.0 }, user.id)
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle network errors in payment processing', async () => {
      // Arrange
      const user = await prisma.account.create({
        data: userFactory.create(),
      });

      const session = await prisma.session.create({
        data: sessionFactory.create({
          userId: user.id,
          isPaid: false,
        }),
      });

      // Mock network error
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(
        paymentsService.createOrder({ sessionId: session.id, amount: 100.0 }, user.id)
      ).rejects.toThrow('Network error');
    });
  });
});
