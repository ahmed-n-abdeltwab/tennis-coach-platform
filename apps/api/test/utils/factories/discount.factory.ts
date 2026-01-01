/**
 * Discount mock factory for creating test discount data
 */

import { DeepPartial } from '@api-sdk/testing';
import { Decimal } from '@prisma/client/runtime/client';

import { AccountMockFactory, type MockAccount } from './account.factory';
import { BaseMockFactory } from './base-factory';

export interface MockDiscount {
  id: string;
  code: string;
  amount: Decimal;
  expiry: Date;
  useCount: number;
  maxUsage: number;
  isActive: boolean;
  coachId: string;
  coach: Pick<MockAccount, 'id' | 'email' | 'name'>;
  createdAt: Date;
  updatedAt: Date;
}

export class DiscountMockFactory extends BaseMockFactory<MockDiscount> {
  private _account?: AccountMockFactory;

  private get account(): AccountMockFactory {
    return (this._account ??= new AccountMockFactory());
  }

  protected generateMock(overrides?: DeepPartial<MockDiscount>): MockDiscount {
    const id = this.generateId();
    const now = this.createDate();

    // Resolve Coach (Ensuring ID and Object match)
    const rawCoach = overrides?.coach ?? this.account.createCoach();
    const coach = {
      id: overrides?.coachId ?? rawCoach.id,
      email: rawCoach.email,
      name: rawCoach.name,
    };

    const discount = {
      id,
      code: this.randomDiscountCode(),
      amount: this.randomAmount(),
      expiry: this.generateFutureDate(30),
      useCount: 0,
      maxUsage: this.randomMaxUsage(),
      isActive: true,
      coachId: coach.id,
      coach,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    } as MockDiscount;

    // Validate required fields
    this.validateRequired(discount.code, 'code');
    this.validateRequired(discount.coachId, 'coachId');
    this.validateRequired(discount.expiry, 'expiry');
    this.validatePositive(discount.amount, 'amount');
    this.validateNonNegative(discount.useCount, 'useCount');
    this.validatePositive(discount.maxUsage, 'maxUsage');

    // Validate business logic
    if (discount.useCount > discount.maxUsage) {
      throw new Error(
        `[Factory] Invalid discount: useCount (${discount.useCount}) cannot exceed maxUsage (${discount.maxUsage})`
      );
    }

    return discount;
  }

  private randomDiscountCode(): string {
    const prefixes = ['SAVE', 'TENNIS', 'COACH', 'PLAY', 'WIN'];
    const suffix = Math.floor(Math.random() * 100);
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    return `${prefix}${suffix}`;
  }

  private randomAmount(): Decimal {
    const amounts = [10, 15, 20, 25, 30, 50]; // Dollar amounts
    return new Decimal(amounts[Math.floor(Math.random() * amounts.length)] ?? 10);
  }

  private randomMaxUsage(): number {
    const usages = [1, 5, 10, 25, 50, 100];
    return usages[Math.floor(Math.random() * usages.length)] ?? 1;
  }
}
