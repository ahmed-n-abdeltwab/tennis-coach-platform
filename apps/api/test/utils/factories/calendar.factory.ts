/**
 * Calendar mock factory for creating test calendar event data
 */

import { DeepPartial } from '@api-sdk/testing';

import { BaseMockFactory } from './base-factory';

export interface MockCalendar {
  eventId: string;
  summary: string;
  start: Date;
  end: Date;
  attendees: string[];
}

export class CalendarMockFactory extends BaseMockFactory<MockCalendar> {
  protected generateMock(overrides?: DeepPartial<MockCalendar>): MockCalendar {
    const eventId = this.generateId();
    const now = this.createDate();

    const calendar = {
      eventId,
      summary: this.randomSummary(),
      start: now,
      end: this.generateFutureDate(7),
      attendees: [this.generateEmail('coach'), this.generateEmail('user')],
      ...overrides,
    } as MockCalendar;

    this.validateRequired(calendar.eventId, 'eventId');
    this.validateRequired(calendar.summary, 'summary');

    return calendar;
  }

  private randomSummary(): string {
    const summaries = [
      'Tennis Coaching Session',
      'Group Training Session',
      'Match Play Practice',
      'Technique Analysis Session',
      'Fitness Training',
      'Junior Coaching Session',
    ];
    return summaries[Math.floor(Math.random() * summaries.length)] ?? 'Tennis Session';
  }
}
