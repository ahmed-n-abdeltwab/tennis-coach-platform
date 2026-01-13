import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Payment, PaymentStatus, Role } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { SessionsService } from './../sessions/sessions.service';
import { TimeSlotsService } from './../time-slots/time-slots.service';
import paymentsConfig from './config/payments.config';
import {
  CapturePaymentDto,
  CapturePaymentResponses,
  CreateOrderResponses,
  CreatePaymentDto,
  PaymentResponseDto,
  UpdatePaymentStatusDto,
} from './dto/payment.dto';

/**
 * PayPal API Response Types
 * These interfaces define the expected structure of PayPal API responses
 */
interface PayPalLink {
  href: string;
  rel: string;
  method?: string;
}

interface PayPalOrderResponse {
  id: string;
  status: string;
  links: PayPalLink[];
}

interface PayPalCaptureResponse {
  id: string;
  status: string;
}

interface PayPalTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

@Injectable()
export class PaymentsService {
  private paypalBaseUrl: string;

  constructor(
    @Inject(paymentsConfig.KEY)
    private readonly paymentsConfiguration: ConfigType<typeof paymentsConfig>,
    private prisma: PrismaService,
    private sessionsService: SessionsService,
    private timeSlotsService: TimeSlotsService
  ) {
    this.paypalBaseUrl =
      this.paymentsConfiguration.environment === 'sandbox'
        ? 'https://api-m.sandbox.paypal.com'
        : 'https://api-m.paypal.com';
  }

  // ========================= //
  // INTERNAL METHODS (Own Table)
  // ========================= //

  /**
   * Find payment by ID - internal method
   */
  private async findPaymentInternal(
    where: { id?: string; paypalOrderId?: string },
    options: { throwIfNotFound?: boolean } = {}
  ): Promise<Payment | null> {
    const { throwIfNotFound = true } = options;

    const payment = await this.prisma.payment.findFirst({ where });

    if (throwIfNotFound && !payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  /**
   * Create a new payment record
   */
  private async createPaymentInternal(data: {
    userId: string;
    amount: number;
    currency?: string;
    paypalOrderId?: string;
    status?: PaymentStatus;
  }): Promise<Payment> {
    return this.prisma.payment.create({
      data: {
        userId: data.userId,
        amount: data.amount,
        currency: data.currency ?? 'USD',
        paypalOrderId: data.paypalOrderId,
        status: data.status ?? PaymentStatus.PENDING,
      },
    });
  }

  /**
   * Update payment record
   */
  private async updatePaymentInternal(
    id: string,
    data: {
      status?: PaymentStatus;
      paypalCaptureId?: string;
    }
  ): Promise<Payment> {
    return this.prisma.payment.update({
      where: { id },
      data,
    });
  }

  // ========================= //
  // PUBLIC METHODS (For Controllers)
  // ========================= //

  /**
   * Find payment by ID
   */
  async findById(id: string): Promise<PaymentResponseDto> {
    const payment = await this.findPaymentInternal({ id });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return this.toResponseDto(payment);
  }

  /**
   * Find payments by user ID
   */
  async findByUserId(userId: string): Promise<PaymentResponseDto[]> {
    const payments = await this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return payments.map(p => this.toResponseDto(p));
  }

  /**
   * Update payment status
   */
  async updateStatus(id: string, dto: UpdatePaymentStatusDto): Promise<PaymentResponseDto> {
    await this.findPaymentInternal({ id }); // Verify exists
    const updated = await this.updatePaymentInternal(id, { status: dto.status });
    return this.toResponseDto(updated);
  }

  /**
   * Convert Payment entity to response DTO
   */
  private toResponseDto(payment: Payment): PaymentResponseDto {
    return {
      id: payment.id,
      userId: payment.userId,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
      paypalOrderId: payment.paypalOrderId ?? undefined,
      paypalCaptureId: payment.paypalCaptureId ?? undefined,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  // ========================= //
  // PUBLIC METHODS (For Other Services)
  // ========================= //

  /**
   * Count payments - used by AnalyticsService
   */
  async countPayments(): Promise<number> {
    return this.prisma.payment.count();
  }

  /**
   * Count payments by status - used by AnalyticsService
   */
  async countByStatus(status: PaymentStatus): Promise<number> {
    return this.prisma.payment.count({ where: { status } });
  }

  /**
   * Get total revenue (completed payments) - used by AnalyticsService
   */
  async getTotalRevenue(): Promise<number> {
    const result = await this.prisma.payment.aggregate({
      where: { status: PaymentStatus.COMPLETED },
      _sum: { amount: true },
    });
    return Number(result._sum.amount ?? 0);
  }

  /**
   * Get payments for a date range - used by AnalyticsService
   */
  async getPaymentsInDateRange(startDate: Date, endDate: Date): Promise<Payment[]> {
    return this.prisma.payment.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: PaymentStatus.COMPLETED,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ========================= //
  // PAYPAL INTEGRATION METHODS
  // ========================= //

  async createOrder(
    createDto: CreatePaymentDto,
    userId: string,
    role: Role
  ): Promise<CreateOrderResponses> {
    const { sessionId, amount } = createDto;

    // Verify session belongs to user
    const session = await this.sessionsService.findOne(sessionId, userId, role);

    if (session?.userId !== userId) {
      throw new BadRequestException('Invalid session');
    }

    if (session.isPaid) {
      throw new BadRequestException('Session already paid');
    }

    // Create payment record in PENDING status
    const payment = await this.createPaymentInternal({
      userId,
      amount,
      currency: 'USD',
      status: PaymentStatus.PENDING,
    });

    // Get PayPal access token
    const accessToken = await this.getAccessToken();

    // Create PayPal order
    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: amount.toString(),
          },
          description: `${session.bookingType.name} - ${session.user.name}`,
        },
      ],
      application_context: {
        return_url: `${this.paymentsConfiguration.frontendUrl}/payment/success`,
        cancel_url: `${this.paymentsConfiguration.frontendUrl}/payment/cancel`,
      },
    };

    const response = await fetch(`${this.paypalBaseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(orderData),
    });

    const order = (await response.json()) as PayPalOrderResponse;

    if (!response.ok) {
      // Mark payment as failed
      await this.updatePaymentInternal(payment.id, { status: PaymentStatus.FAILED });
      throw new BadRequestException('Failed to create PayPal order');
    }

    // Update payment with PayPal order ID
    await this.updatePaymentInternal(payment.id, {
      status: PaymentStatus.PENDING,
    });
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { paypalOrderId: order.id },
    });

    return {
      orderId: order.id,
      approvalUrl: order.links.find(link => link.rel === 'approve')?.href,
    };
  }

  async captureOrder(
    captureDto: CapturePaymentDto,
    userId: string,
    role: Role
  ): Promise<CapturePaymentResponses> {
    const { orderId, sessionId } = captureDto;

    // Verify session
    const session = await this.sessionsService.findOne(sessionId, userId, role);

    if (session?.userId !== userId) {
      throw new BadRequestException('Invalid session');
    }

    // Find the payment record by PayPal order ID
    const payment = await this.findPaymentInternal(
      { paypalOrderId: orderId },
      { throwIfNotFound: false }
    );

    // Get PayPal access token
    const accessToken = await this.getAccessToken();

    // Capture PayPal order
    const response = await fetch(`${this.paypalBaseUrl}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const captureResult = (await response.json()) as PayPalCaptureResponse;

    if (!response.ok || captureResult.status !== 'COMPLETED') {
      // Mark payment as failed if we have a record
      if (payment) {
        await this.updatePaymentInternal(payment.id, { status: PaymentStatus.FAILED });
      }
      throw new BadRequestException('Payment capture failed');
    }

    // Update payment record as completed
    if (payment) {
      await this.updatePaymentInternal(payment.id, {
        status: PaymentStatus.COMPLETED,
        paypalCaptureId: captureResult.id,
      });

      // Update session as paid using SessionsService internal method
      await this.sessionsService.markAsPaidInternal(sessionId, payment.id);
    } else {
      // Fallback: use orderId if no payment record exists (backward compatibility)
      await this.sessionsService.markAsPaidInternal(sessionId, orderId);
    }

    // Mark time slot as unavailable using TimeSlotsService internal method
    await this.timeSlotsService.markAsUnavailableInternal(session.timeSlotId);

    return {
      success: true,
      paymentId: payment?.id ?? orderId,
      captureId: captureResult.id,
    };
  }

  private async getAccessToken(): Promise<string> {
    const auth = Buffer.from(
      `${this.paymentsConfiguration.clientId}:${this.paymentsConfiguration.clientSecret}`
    ).toString('base64');

    const response = await fetch(`${this.paypalBaseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${auth}`,
      },
      body: 'grant_type=client_credentials',
    });

    const data = (await response.json()) as PayPalTokenResponse;
    return data.access_token;
  }
}
