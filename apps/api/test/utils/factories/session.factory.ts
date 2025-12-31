/**
 * Session mock factory for creating test session data
 */

import { SessionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';

import { DeepPartial } from '../http';

import { BaseMockFactory } from './base-factory';

import {
  AccountMockFactory,
  BookingTypeMockFactory,
  CalendarMockFactory,
  DiscountMockFactory,
  PaymentMockFactory,
  TimeSlotMockFactory,
  type MockAccount,
  type MockBookingType,
  type MockDiscount,
  type MockTimeSlot,
} from '.';

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
  // Compose factories for clean separation of concerns
  private readonly account: AccountMockFactory;
  private readonly bookingType: BookingTypeMockFactory;
  private readonly timeSlot: TimeSlotMockFactory;
  private readonly discount: DiscountMockFactory;
  private readonly payment: PaymentMockFactory;
  private readonly calendar: CalendarMockFactory;

  constructor() {
    // Initialize mixins
    super();
    this.account = new AccountMockFactory();
    this.bookingType = new BookingTypeMockFactory();
    this.timeSlot = new TimeSlotMockFactory();
    this.discount = new DiscountMockFactory();
    this.payment = new PaymentMockFactory();
    this.calendar = new CalendarMockFactory();
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
      this.payment.create({ amount: bookingType.basePrice, sessionId: id }).id;

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
