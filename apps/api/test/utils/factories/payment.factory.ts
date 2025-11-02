/**
 * Payment mock factory for creating test payment data
 */

import { MockPayment, MockPayPalCapture, MockPayPalOrder } from '../mocks';

import { BaseMockFactory } from './base-factory';

export class PaymentMockFactory extends BaseMockFactory<MockPayment> {
  create(overrides?: Partial<MockPayment>): MockPayment {
    const id = this.generateId();
    const now = new Date();

    return {
      id,
      sessionId: this.generateId(),
      orderId: this.generatePayPalOrderId(),
      amount: this.randomAmount(),
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  }

  createCompleted(overrides?: Partial<MockPayment>): MockPayment {
    return this.create({
      status: 'completed',
      paypalOrderId: this.generatePayPalOrderId(),
      captureId: this.generateCaptureId(),
      ...overrides,
    });
  }

  createFailed(overrides?: Partial<MockPayment>): MockPayment {
    return this.create({
      status: 'failed',
      ...overrides,
    });
  }

  createWithSession(sessionId: string, overrides?: Partial<MockPayment>): MockPayment {
    return this.create({
      sessionId,
      ...overrides,
    });
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
    return amounts[Math.floor(Math.random() * amounts.length)];
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
