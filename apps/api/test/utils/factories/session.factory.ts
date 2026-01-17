/**
 * Session mock factory for creating test session data
 */

import { DeepPartial } from '@api-sdk/testing';
import { SessionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';

import { AccountMockFactory, type MockAccount } from './account.factory';
import { BaseMockFactory } from './base-factory';
import { BookingTypeMockFactory, type MockBookingType } from './booking-type.factory';
import { CalendarMockFactory } from './calendar.factory';
import { DiscountMockFactory, type MockDiscount } from './discount.factory';
import { PaymentMockFactory } from './payment.factory';
import { TimeSlotMockFactory, type MockTimeSlot } from './time-slot.factory';

export interface MockSession {
  id: string;
  dateTime: Date;
  durationMin: number;
  price: Decimal;
  isPaid: boolean;
  status: SessionStatus;
  notes?: string;
  paymentId?: string;
  discountCode?: string;
  calendarEventId?: string;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  userId: string;
  coachId: string;
  bookingTypeId: string;
  timeSlotId: string;
  discountId?: string;

  user: Pick<MockAccount, 'id' | 'email' | 'name'>;
  coach: Pick<MockAccount, 'id' | 'email' | 'name'>;
  bookingType: MockBookingType;
  timeSlot: MockTimeSlot;
  discount?: MockDiscount;
}

export class SessionMockFactory extends BaseMockFactory<MockSession> {
  private _account?: AccountMockFactory;
  private _bookingType?: BookingTypeMockFactory;
  private _timeSlot?: TimeSlotMockFactory;
  private _discount?: DiscountMockFactory;
  private _payment?: PaymentMockFactory;
  private _calendar?: CalendarMockFactory;

  private get account(): AccountMockFactory {
    return (this._account ??= new AccountMockFactory());
  }

  private get bookingType(): BookingTypeMockFactory {
    return (this._bookingType ??= new BookingTypeMockFactory());
  }

  private get timeSlot(): TimeSlotMockFactory {
    return (this._timeSlot ??= new TimeSlotMockFactory());
  }

  private get discount(): DiscountMockFactory {
    return (this._discount ??= new DiscountMockFactory());
  }

  private get payment(): PaymentMockFactory {
    return (this._payment ??= new PaymentMockFactory());
  }

  private get calendar(): CalendarMockFactory {
    return (this._calendar ??= new CalendarMockFactory());
  }

  protected generateMock(overrides?: DeepPartial<MockSession>): MockSession {
    const id = this.generateId();
    const now = this.createDate();

    // 1. Resolve Coach (Ensuring ID and Object match)
    const rawCoach = overrides?.coach ?? this.account.createCoach();
    const coach = {
      id: overrides?.coachId ?? rawCoach.id,
      email: rawCoach.email,
      name: rawCoach.name,
    };

    // 2. Resolve User (Ensuring ID and Object match)
    const rawUser = overrides?.user ?? this.account.createUser();
    const user = {
      id: overrides?.userId ?? rawUser.id,
      email: rawUser.email,
      name: rawUser.name,
    };

    // 3. Pass the resolved coachId to subsequent factories
    const bookingType =
      overrides?.bookingType ??
      this.bookingType.create({ ...overrides?.bookingType, coachId: coach.id });
    const discount =
      overrides?.discount ?? this.discount.create({ ...overrides?.discount, coachId: coach.id });
    const timeSlot =
      overrides?.timeSlot ?? this.timeSlot.create({ ...overrides?.timeSlot, coachId: coach.id });

    const paymentId =
      overrides?.paymentId ??
      this.payment.create({ amount: bookingType.basePrice, updatedAt: now, userId: user.id }).id;

    const calendarEventId = overrides?.calendarEventId ?? this.calendar.create().eventId;

    const session = {
      id,
      dateTime: this.generateFutureDate(14),
      durationMin: this.randomDuration(),
      price: bookingType.basePrice,
      isPaid: false,
      status: SessionStatus.SCHEDULED,
      notes: this.randomNotes(),
      paymentId,
      discountCode: discount.code,
      createdAt: now,
      updatedAt: now,
      calendarEventId,
      bookingTypeId: bookingType.id,
      timeSlotId: timeSlot.id,
      discountId: discount.id,
      userId: user.id,
      coachId: coach.id,
      user,
      coach,
      bookingType,
      timeSlot,
      discount,
      ...overrides,
    } as MockSession;

    // Validate required fields
    this.validateRequired(session.userId, 'userId');
    this.validateRequired(session.coachId, 'coachId');
    this.validateRequired(session.bookingTypeId, 'bookingTypeId');
    this.validateRequired(session.timeSlotId, 'timeSlotId');
    this.validatePositive(session.durationMin, 'durationMin');
    this.validateNonNegative(session.price, 'price');

    return session;
  }

  private randomDuration(): number {
    const durations = [30, 45, 60, 90, 120]; // minutes
    return durations[Math.floor(Math.random() * durations.length)] ?? 30;
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
    return notes[Math.floor(Math.random() * notes.length)] ?? 'default notes';
  }
}
