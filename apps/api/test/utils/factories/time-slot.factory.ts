/**
 * TimeSlot mock factory for creating test time slot data
 */

import { BaseMockFactory } from './base-factory';

export interface MockTimeSlot {
  id: string;
  dateTime: Date;
  durationMin: number;
  isAvailable: boolean;
  coachId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class TimeSlotMockFactory extends BaseMockFactory<MockTimeSlot> {
  protected generateMock(overrides?: Partial<MockTimeSlot>): MockTimeSlot {
    const id = this.generateId();
    const now = new Date();

    const timeSlot = {
      id,
      dateTime: this.generateFutureDate(14), // Within next 2 weeks
      durationMin: this.randomDuration(),
      isAvailable: true,
      coachId: this.generateId(),
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };

    // Validate required fields
    this.validateRequired(timeSlot.coachId, 'coachId');
    this.validateRequired(timeSlot.dateTime, 'dateTime');
    this.validatePositive(timeSlot.durationMin, 'durationMin');

    return timeSlot;
  }

  createAvailable(overrides?: Partial<MockTimeSlot>): MockTimeSlot {
    return this.create({
      isAvailable: true,
      ...overrides,
    });
  }

  createUnavailable(overrides?: Partial<MockTimeSlot>): MockTimeSlot {
    return this.create({
      isAvailable: false,
      ...overrides,
    });
  }

  createWithCoach(coachId: string, overrides?: Partial<MockTimeSlot>): MockTimeSlot {
    return this.create({
      coachId,
      ...overrides,
    });
  }

  createForDate(date: Date, overrides?: Partial<MockTimeSlot>): MockTimeSlot {
    return this.create({
      dateTime: date,
      ...overrides,
    });
  }

  createForTimeRange(startDate: Date, endDate: Date, count: number): MockTimeSlot[] {
    const slots: MockTimeSlot[] = [];
    const timeDiff = endDate.getTime() - startDate.getTime();

    for (let i = 0; i < count; i++) {
      const randomTime = new Date(startDate.getTime() + Math.random() * timeDiff);
      slots.push(
        this.create({
          dateTime: randomTime,
        })
      );
    }

    return slots.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
  }

  private randomDuration(): number {
    const durations = [30, 45, 60, 90, 120]; // minutes
    return durations[Math.floor(Math.random() * durations.length)] ?? 30;
  }
}
