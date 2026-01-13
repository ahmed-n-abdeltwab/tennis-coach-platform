/**
 * Payment mock factory for creating test payment data
 */

import { DeepPartial } from '@api-sdk/testing';
import { PaymentStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';

import { BaseMockFactory } from './base-factory';

export interface MockPayment {
  id: string;
  userId: string;
  amount: Decimal;
  currency: string;
  status: PaymentStatus;
  paypalOrderId?: string;
  paypalCaptureId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockPayPalOrder {
  id: string;
  status: string;
  links: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

export interface MockPayPalCapture {
  id: string;
  status: string;
  amount: {
    currency_code: string;
    value: string;
  };
}

export class PaymentMockFactory extends BaseMockFactory<MockPayment> {
  protected generateMock(overrides?: DeepPartial<MockPayment>): MockPayment {
    const id = this.generateId();
    const now = this.createDate();

    // Note: userId should be provided via overrides when creating payment
    // for a specific user. Default generates a placeholder ID.
    const payment = {
      id,
      userId: overrides?.userId ?? this.generateId(),
      amount: new Decimal(this.randomAmount()),
      currency: 'USD',
      status: PaymentStatus.PENDING,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    } as MockPayment;

    this.validateRequired(payment.userId, 'userId');

    return payment;
  }

  createPayPalOrder(overrides?: Partial<MockPayPalOrder>): MockPayPalOrder {
    const orderId = this.generatePayPalOrderId();
    return {
      id: orderId,
      status: 'CREATED',
      links: [
        {
          href: `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}`,
          rel: 'self',
          method: 'GET',
        },
        {
          href: `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}`,
          rel: 'approve',
          method: 'GET',
        },
        {
          href: `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}/capture`,
          rel: 'capture',
          method: 'POST',
        },
      ],
      ...overrides,
    };
  }

  createPayPalCapture(overrides?: Partial<MockPayPalCapture>): MockPayPalCapture {
    return {
      id: this.generateCaptureId(),
      status: 'COMPLETED',
      amount: {
        currency_code: 'USD',
        value: this.randomAmount().toString(),
      },
      ...overrides,
    };
  }

  createAccessTokenResponse(): { accessToken: string; expires_in: number } {
    return {
      accessToken: this.generateAccessToken(),
      expires_in: 32400,
    };
  }

  private randomAmount(): number {
    const amounts = [25.0, 50.0, 75.0, 100.0, 125.0, 150.0];
    return amounts[Math.floor(Math.random() * amounts.length)] ?? 25.0;
  }

  private generatePayPalOrderId(): string {
    return `ORDER_${this.generateId().toUpperCase()}`;
  }

  private generateCaptureId(): string {
    return `CAPTURE_${this.generateId().toUpperCase()}`;
  }

  private generateAccessToken(): string {
    return `ACCESS_TOKEN_${this.generateId()}`;
  }
}
