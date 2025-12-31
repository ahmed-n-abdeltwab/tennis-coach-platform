/**
 * BookingType mock factory for creating test booking type data
 */

import { Decimal } from '@prisma/client/runtime/client';

import { DeepPartial } from '../http';

import { BaseMockFactory } from './base-factory';

export interface MockBookingType {
  id: string;
  name: string;
  description?: string;
  basePrice: Decimal;
  isActive: boolean;
  coachId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class BookingTypeMockFactory extends BaseMockFactory<MockBookingType> {
  protected generateMock(overrides?: DeepPartial<MockBookingType>): MockBookingType {
    const id = this.generateId();
    const now = new Date();

    const bookingType = {
      id,
      name: this.randomBookingTypeName(),
      description: this.randomDescription(),
      basePrice: new Decimal(this.randomPrice()),
      isActive: true,
      coachId: this.generateId(),
      createdAt: now,
      updatedAt: now,
      ...overrides,
    } as MockBookingType;

    // Validate required fields
    this.validateRequired(bookingType.name, 'name');
    this.validateRequired(bookingType.coachId, 'coachId');
    this.validatePositive(bookingType.basePrice, 'basePrice');

    return bookingType;
  }

  private randomBookingTypeName(): string {
    const names = [
      'Individual Lesson',
      'Group Training',
      'Match Play Session',
      'Technique Analysis',
      'Fitness Training',
      'Junior Coaching',
      'Advanced Training',
      'Beginner Lesson',
    ];
    return names[Math.floor(Math.random() * names.length)] ?? 'default Booking Type Name';
  }

  private randomDescription(): string {
    const descriptions = [
      'One-on-one personalized coaching session',
      'Small group training for skill development',
      'Competitive match play with coaching guidance',
      'Detailed analysis of technique and form',
      'Tennis-specific fitness and conditioning',
      'Age-appropriate coaching for young players',
      'High-intensity training for competitive players',
      'Introduction to tennis fundamentals',
    ];
    return descriptions[Math.floor(Math.random() * descriptions.length)] ?? 'default descriptions';
  }

  private randomPrice(): number {
    const prices = [50, 75, 100, 125, 150, 200];
    return prices[Math.floor(Math.random() * prices.length)] ?? 50;
  }
}
