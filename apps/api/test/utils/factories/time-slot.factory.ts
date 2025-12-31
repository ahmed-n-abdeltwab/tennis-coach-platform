/**
 * TimeSlot mock factory for creating test time slot data
 */

import { DeepPartial } from '../http';

import { AccountMockFactory, type MockAccount } from './account.factory';
import { BaseMockFactory } from './base-factory';

export interface MockTimeSlot {
  id: string;
  dateTime: Date;
  durationMin: number;
  isAvailable: boolean;
  coachId: string;
  coach: Pick<MockAccount, 'id' | 'email' | 'name'>;
  createdAt: Date;
  updatedAt: Date;
}

export class TimeSlotMockFactory extends BaseMockFactory<MockTimeSlot> {
  private readonly account: AccountMockFactory;
  constructor() {
    // Initialize mixins
    super();
    this.account = new AccountMockFactory();
  }
  protected generateMock(overrides?: DeepPartial<MockTimeSlot>): MockTimeSlot {
    const id = this.generateId();
    const now = this.createDate();

    // Resolve Coach (Ensuring ID and Object match)
    const rawCoach = overrides?.coach ?? this.account.createCoach();
    const coach = {
      id: overrides?.coachId ?? rawCoach.id,
      email: rawCoach.email,
      name: rawCoach.name,
    };

    const timeSlot = {
      id,
      dateTime: this.generateFutureDate(14), // Within next 2 weeks
      durationMin: this.randomDuration(),
      isAvailable: true,
      coachId: coach.id,
      coach,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    } as MockTimeSlot;

    // Validate required fields
    this.validateRequired(timeSlot.coachId, 'coachId');
    this.validateRequired(timeSlot.dateTime, 'dateTime');
    this.validatePositive(timeSlot.durationMin, 'durationMin');

    return timeSlot;
  }

  createForTimeRange(startDate: Date, endDate: Date, count: number): MockTimeSlot[] {
    const slots: MockTimeSlot[] = [];
    const timeDiff = endDate.getTime() - startDate.getTime();

    for (let i = 0; i < count; i++) {
      const randomTime = this.createDate(new Date(startDate.getTime() + Math.random() * timeDiff));
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
