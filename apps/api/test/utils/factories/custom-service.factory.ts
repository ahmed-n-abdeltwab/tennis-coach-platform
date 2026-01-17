/**
 * CustomService mock factory for creating test custom service data
 */

import { DeepPartial } from '@api-sdk/testing';
import { Decimal } from '@prisma/client/runtime/client';

import { AccountMockFactory, type MockAccount } from './account.factory';
import { BaseMockFactory } from './base-factory';

export interface MockCustomService {
  id: string;
  name: string;
  description?: string;
  basePrice: Decimal;
  duration: number;
  isTemplate: boolean;
  isPublic: boolean;
  usageCount: number;
  coachId: string;
  coach: Pick<MockAccount, 'id' | 'email' | 'name'>;
  prefilledBookingTypeId?: string;
  prefilledDateTime?: Date;
  prefilledTimeSlotId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class CustomServiceMockFactory extends BaseMockFactory<MockCustomService> {
  private _account?: AccountMockFactory;

  private get account(): AccountMockFactory {
    return (this._account ??= new AccountMockFactory());
  }

  protected generateMock(overrides?: DeepPartial<MockCustomService>): MockCustomService {
    const id = this.generateId();
    const now = this.createDate();

    // Resolve Coach (Ensuring ID and Object match)
    const rawCoach = overrides?.coach ?? this.account.createCoach();
    const coach = {
      id: overrides?.coachId ?? rawCoach.id,
      email: rawCoach.email,
      name: rawCoach.name,
    };

    const customService = {
      id,
      name: this.randomServiceName(),
      description: this.randomDescription(),
      basePrice: this.randomPrice(),
      duration: this.randomDuration(),
      isTemplate: false,
      isPublic: false,
      usageCount: 0,
      coachId: coach.id,
      coach,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    } as MockCustomService;

    // Validate required fields
    this.validateRequired(customService.name, 'name');
    this.validateRequired(customService.coachId, 'coachId');
    this.validatePositive(customService.basePrice, 'basePrice');
    this.validatePositive(customService.duration, 'duration');
    this.validateNonNegative(customService.usageCount, 'usageCount');

    return customService;
  }

  private randomServiceName(): string {
    const names = [
      'Personal Training Session',
      'Group Coaching',
      'Technique Analysis',
      'Match Strategy Session',
      'Fitness Assessment',
      'Video Analysis',
    ];
    return names[Math.floor(Math.random() * names.length)] ?? 'Custom Service';
  }

  private randomDescription(): string {
    const descriptions = [
      'One-on-one coaching session',
      'Group training for up to 4 players',
      'Detailed technique breakdown and improvement plan',
      'Strategic match preparation',
      'Comprehensive fitness evaluation',
      'Video review and feedback session',
    ];
    return (
      descriptions[Math.floor(Math.random() * descriptions.length)] ?? 'Custom service description'
    );
  }

  private randomPrice(): Decimal {
    const prices = [49.99, 79.99, 99.99, 149.99, 199.99];
    const price = prices[Math.floor(Math.random() * prices.length)] ?? 99.99;
    return new Decimal(price.toFixed(2));
  }

  private randomDuration(): number {
    const durations = [30, 45, 60, 90, 120];
    return durations[Math.floor(Math.random() * durations.length)] ?? 60;
  }

  /**
   * Create a custom service marked as a template
   */
  createTemplate(overrides?: DeepPartial<MockCustomService>): MockCustomService {
    return this.create({
      isTemplate: true,
      ...overrides,
    });
  }

  /**
   * Create a public custom service
   */
  createPublic(overrides?: DeepPartial<MockCustomService>): MockCustomService {
    return this.create({
      isPublic: true,
      ...overrides,
    });
  }

  /**
   * Create a custom service with prefilled booking details
   */
  createWithPrefilled(
    bookingTypeId: string,
    timeSlotId: string,
    dateTime: Date,
    overrides?: DeepPartial<MockCustomService>
  ): MockCustomService {
    return this.create({
      prefilledBookingTypeId: bookingTypeId,
      prefilledTimeSlotId: timeSlotId,
      prefilledDateTime: dateTime,
      ...overrides,
    });
  }
}
