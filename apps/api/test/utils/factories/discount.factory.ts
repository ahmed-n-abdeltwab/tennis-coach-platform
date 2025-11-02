/**
 * Discount mock factory for creating test discount data
 */

import { MockDiscount } from '../mocks';

import { BaseMockFactory } from './base-factory';

export class DiscountMockFactory extends BaseMockFactory<MockDiscount> {
  create(overrides?: Partial<MockDiscount>): MockDiscount {
    const id = this.generateId();
    const now = new Date();

    return {
      id,
      code: this.randomDiscountCode(),
      amount: this.randomAmount(),
      expiry: this.generateFutureDate(30), // Expires within 30 days
      useCount: 0,
      maxUsage: this.randomMaxUsage(),
      isActive: true,
      coachId: this.generateId(),
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  }

  createActive(overrides?: Partial<MockDiscount>): MockDiscount {
    return this.create({
      isActive: true,
      expiry: this.generateFutureDate(30),
      ...overrides,
    });
  }

  createExpired(overrides?: Partial<MockDiscount>): MockDiscount {
    return this.create({
      isActive: true,
      expiry: this.generatePastDate(7),
      ...overrides,
    });
  }

  createInactive(overrides?: Partial<MockDiscount>): MockDiscount {
    return this.create({
      isActive: false,
      ...overrides,
    });
  }

  createFullyUsed(overrides?: Partial<MockDiscount>): MockDiscount {
    const maxUsage = this.randomMaxUsage();
    return this.create({
      maxUsage,
      useCount: maxUsage,
      ...overrides,
    });
  }

  createWithCoach(coachId: string, overrides?: Partial<MockDiscount>): MockDiscount {
    return this.create({
      coachId,
      ...overrides,
    });
  }

  createSingleUse(overrides?: Partial<MockDiscount>): MockDiscount {
    return this.create({
      maxUsage: 1,
      useCount: 0,
      ...overrides,
    });
  }

  private randomDiscountCode(): string {
    const prefixes = ['SAVE', 'TENNIS', 'COACH', 'PLAY', 'WIN'];
    const suffix = Math.floor(Math.random() * 100);
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    return `${prefix}${suffix}`;
  }

  private randomAmount(): number {
    const amounts = [10, 15, 20, 25, 30, 50]; // Dollar amounts
    return amounts[Math.floor(Math.random() * amounts.length)];
  }

  private randomMaxUsage(): number {
    const usages = [1, 5, 10, 25, 50, 100];
    return usages[Math.floor(Math.random() * usages.length)];
  }
}
