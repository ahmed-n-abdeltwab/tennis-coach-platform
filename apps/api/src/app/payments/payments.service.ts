import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

import paymentsConfig from './config/payments.config';
import { CapturePaymentDto, CreatePaymentDto } from './dto/payment.dto';

@Injectable()
export class PaymentsService {
  private paypalBaseUrl: string;

  constructor(
    private prisma: PrismaService,
    @Inject(paymentsConfig.KEY)
    private readonly paymentsConfiguration: ConfigType<typeof paymentsConfig>
  ) {
    this.paypalBaseUrl =
      this.paymentsConfiguration.environment === 'sandbox'
        ? 'https://api-m.sandbox.paypal.com'
        : 'https://api-m.paypal.com';
  }

  async createOrder(createDto: CreatePaymentDto, userId: string) {
    const { sessionId, amount } = createDto;

    // Verify session belongs to user
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        bookingType: true,
        user: true,
      },
    });

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
        authorization: `Bearer ${accessToken}`,
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

  async captureOrder(captureDto: CapturePaymentDto, userId: string) {
    const { orderId, sessionId } = captureDto;

    // Verify session
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

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
        authorization: `Bearer ${accessToken}`,
      },
    });

    const captureResult = (await response.json()) as any;

    if (!response.ok || captureResult.status !== 'COMPLETED') {
      throw new BadRequestException('Payment capture failed');
    }

    // Update session as paid
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        isPaid: true,
        paymentId: orderId,
      },
    });

    // Mark time slot as unavailable
    await this.prisma.timeSlot.update({
      where: { id: session.timeSlotId },
      data: { isAvailable: false },
    });

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
        authorization: `Basic ${auth}`,
      },
      body: 'grant_type=client_credentials',
    });

    const data = (await response.json()) as any;
    return data.accessToken;
  }
}
