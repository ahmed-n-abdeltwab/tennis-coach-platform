/**
 * BookingType mock factory for creating test booking type data
 */

import { DeepPartial } from '../http';

import { BaseMockFactory } from './base-factory';

export interface MockCalendar {
  eventId: string;
  summary: string;
  start?: Date;
  end?: Date;
  attendees?: string[];
}

export class CalendarMockFactory extends BaseMockFactory<MockCalendar> {
  protected generateMock(overrides?: DeepPartial<MockCalendar>): MockCalendar {
    const eventId = this.generateId();
    const now = new Date();
    const calendar = {
      eventId,
      summary: this.randomSummary(),
      start: now,
      end: this.generateFutureDate(7),
      attendees: [this.generateEmail('coach'), this.generateEmail('user')],
      ...overrides,
    } as MockCalendar;

    // Validate required fields
    this.validateRequired(calendar.eventId, 'eventId');
    this.validateRequired(calendar.summary, 'summary');

    return calendar;
  }

  private randomSummary(): string {
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
}
