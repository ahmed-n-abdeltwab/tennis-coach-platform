/**
 * Session mock factory for creating test session data
 */

import { BaseMockFactory } from './base-factory';

export interface MockSession {
  id: string;
  dateTime: Date;
  durationMin: number;
  price: number;
  isPaid: boolean;
  status: string;
  notes?: string;
  paymentId?: string;
  discountCode?: string;
  calendarEventId?: string;
  userId: string;
  coachId: string;
  bookingTypeId: string;
  timeSlotId: string;
  discountId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class SessionMockFactory extends BaseMockFactory<MockSession> {
  create(overrides?: Partial<MockSession>): MockSession {
    const id = this.generateId();
    const now = new Date();

    return {
      id,
      dateTime: this.generateFutureDate(14),
      durationMin: this.randomDuration(),
      price: this.randomPrice(),
      isPaid: false,
      status: 'scheduled',
      notes: this.randomNotes(),
      userId: this.generateId(),
      coachId: this.generateId(),
      bookingTypeId: this.generateId(),
      timeSlotId: this.generateId(),
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  }

  createScheduled(overrides?: Partial<MockSession>): MockSession {
    return this.create({
      status: 'scheduled',
      isPaid: false,
      ...overrides,
    });
  }

  createCompleted(overrides?: Partial<MockSession>): MockSession {
    return this.create({
      status: 'completed',
      isPaid: true,
      dateTime: this.generatePastDate(7),
      paymentId: `pay_${this.generateId()}`,
      ...overrides,
    });
  }

  createCancelled(overrides?: Partial<MockSession>): MockSession {
    return this.create({
      status: 'cancelled',
      isPaid: false,
      ...overrides,
    });
  }

  createPaid(overrides?: Partial<MockSession>): MockSession {
    return this.create({
      isPaid: true,
      paymentId: `pay_${this.generateId()}`,
      ...overrides,
    });
  }

  createWithDiscount(
    discountCode: string,
    discountId: string,
    overrides?: Partial<MockSession>
  ): MockSession {
    return this.create({
      discountCode,
      discountId,
      price: this.randomPrice() * 0.8, // 20% discount applied
      ...overrides,
    });
  }

  createForUserAndCoach(
    userId: string,
    coachId: string,
    overrides?: Partial<MockSession>
  ): MockSession {
    return this.create({
      userId,
      coachId,
      ...overrides,
    });
  }

  private randomDuration(): number {
    const durations = [30, 45, 60, 90, 120]; // minutes
    return durations[Math.floor(Math.random() * durations.length)];
  }

  private randomPrice(): number {
    return Math.floor(Math.random() * 150) + 50; // $50-$200
  }

  private randomNotes(): string {
    const notes = [
      'Focus on backhand technique',
      'Work on serve consistency',
      'Practice net play',
      'Improve footwork and positioning',
      'Mental game coaching session',
      'Match strategy discussion',
    ];
    return notes[Math.floor(Math.random() * notes.length)];
  }
}
