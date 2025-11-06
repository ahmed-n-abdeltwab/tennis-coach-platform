/**
 * BookingType mock factory for creating test booking type data
 */

import { MockBookingType } from '../mocks';

import { BaseMockFactory } from './base-factory';

export class BookingTypeMockFactory extends BaseMockFactory<MockBookingType> {
  create(overrides?: Partial<MockBookingType>): MockBookingType {
    const id = this.generateId();
    const now = new Date();

    return {
      id,
      name: this.randomBookingTypeName(),
      description: this.randomDescription(),
      basePrice: this.randomPrice(),
      isActive: true,
      coachId: this.generateId(),
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  }

  createActive(overrides?: Partial<MockBookingType>): MockBookingType {
    return this.create({
      isActive: true,
      ...overrides,
    });
  }

  createInactive(overrides?: Partial<MockBookingType>): MockBookingType {
    return this.create({
      isActive: false,
      ...overrides,
    });
  }

  createWithCoach(coachId: string, overrides?: Partial<MockBookingType>): MockBookingType {
    return this.create({
      coachId,
      ...overrides,
    });
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
