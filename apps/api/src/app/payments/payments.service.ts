import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Role } from '@prisma/client';

import { SessionsService } from './../sessions/sessions.service';
import { TimeSlotsService } from './../time-slots/time-slots.service';
import paymentsConfig from './config/payments.config';
import {
  CapturePaymentDto,
  CapturePaymentResponses,
  CreateOrderResponses,
  CreatePaymentDto,
} from './dto/payment.dto';

@Injectable()
export class PaymentsService {
  private paypalBaseUrl: string;

  constructor(
    @Inject(paymentsConfig.KEY)
    private readonly paymentsConfiguration: ConfigType<typeof paymentsConfig>,
    private sessionsService: SessionsService,
    private timeSlotsService: TimeSlotsService
  ) {
    this.paypalBaseUrl =
      this.paymentsConfiguration.environment === 'sandbox'
        ? 'https://api-m.sandbox.paypal.com'
        : 'https://api-m.paypal.com';
  }

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

    const order = (await response.json()) as any;

    if (!response.ok) {
      throw new BadRequestException('Failed to create PayPal order');
    }

    return {
      orderId: order.id,
      approvalUrl: order.links.find((link: any) => link.rel === 'approve')?.href,
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

    const captureResult = (await response.json()) as any;

    if (!response.ok || captureResult.status !== 'COMPLETED') {
      throw new BadRequestException('Payment capture failed');
    }

    // Update session as paid using SessionsService internal method
    await this.sessionsService.markAsPaidInternal(sessionId, orderId);
    // Mark time slot as unavailable using TimeSlotsService internal method
    await this.timeSlotsService.markAsUnavailableInternal(session.timeSlotId);

    return {
      success: true,
      paymentId: orderId,
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

    const data = (await response.json()) as any;
    return data.accessToken;
  }
}
