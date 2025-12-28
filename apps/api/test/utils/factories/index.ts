/**
 * Mock Data Factories
 *
 * Provides factories for creating in-memory mock objects.
 * Use these for unit tests where no database is needed.
 *
 * For real database records, use DatabaseMixin instead.
 *
 * @module base/factories
 */

// Base factory
export { BaseMockFactory } from './base-factory';
export type { MockFactory } from './base-factory';

// Domain entity factories and types
export { BookingTypeMockFactory } from './booking-type.factory';
export type { MockBookingType } from './booking-type.factory';

export { CoachMockFactory } from './coach.factory';
export type { MockCoach } from './coach.factory';

export { DiscountMockFactory } from './discount.factory';
export type { MockDiscount } from './discount.factory';

export { MessageMockFactory } from './message.factory';
export type { MockMessage } from './message.factory';

export { SessionMockFactory } from './session.factory';
export type { MockSession } from './session.factory';

export { TimeSlotMockFactory } from './time-slot.factory';
export type { MockTimeSlot } from './time-slot.factory';

export { UserMockFactory } from './user.factory';
export type { MockUser } from './user.factory';

// Infrastructure factories and types
export { AccountMockFactory } from './account.factory';
export type { MockAccount } from './account.factory';

export { AuthMockFactory } from './auth.factory';
export type { MockAuthHeaders, MockAuthPayload, MockAuthResponse } from './auth.factory';

export { HttpMockFactory } from './http.factory';
export type {
  CreateRequestOptions,
  MockHttpResponse,
  MockRequest,
  MockRequestOverrides,
  MockResponse,
} from './http.factory';

export { NotificationMockFactory } from './notification.factory';
export type { MockEmailResult, MockNotification } from './notification.factory';

export { PaymentMockFactory } from './payment.factory';
export type { MockPayment, MockPayPalCapture, MockPayPalOrder } from './payment.factory';

// Factory instances for convenience
import { SessionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';

import { BookingScenario, ConversationScenario, TestScenario } from '../mixins/mock.mixin';

import { AccountMockFactory, MockAccount } from './account.factory';
import { AuthMockFactory } from './auth.factory';
import { BookingTypeMockFactory, MockBookingType } from './booking-type.factory';
import { CoachMockFactory, MockCoach } from './coach.factory';
import { DiscountMockFactory, MockDiscount } from './discount.factory';
import { HttpMockFactory } from './http.factory';
import { MessageMockFactory } from './message.factory';
import { NotificationMockFactory } from './notification.factory';
import { PaymentMockFactory } from './payment.factory';
import { MockSession, SessionMockFactory } from './session.factory';
import { MockTimeSlot, TimeSlotMockFactory } from './time-slot.factory';
import { UserMockFactory } from './user.factory';

/**
 * Singleton instances of mock factories
 */
export const userFactory = new UserMockFactory();
export const coachFactory = new CoachMockFactory();
export const bookingTypeFactory = new BookingTypeMockFactory();
export const timeSlotFactory = new TimeSlotMockFactory();
export const sessionFactory = new SessionMockFactory();
export const discountFactory = new DiscountMockFactory();
export const messageFactory = new MessageMockFactory();
export const accountFactory = new AccountMockFactory();
export const authFactory = new AuthMockFactory();
export const httpFactory = new HttpMockFactory();
export const notificationFactory = new NotificationMockFactory();
export const paymentFactory = new PaymentMockFactory();

// Convenience functions for creating test scenarios

/**
 * Creates a complete test scenario with properly related entities
 * This represents a typical booking flow: user -> coach -> booking type -> time slot -> session
 */
export function createTestScenario(overrides?: {
  user?: Partial<MockAccount>;
  coach?: Partial<MockCoach>;
  bookingType?: Partial<MockBookingType>;
  timeSlot?: Partial<MockTimeSlot>;
  session?: Partial<MockSession>;
}): TestScenario {
  // Create coach first (needed for booking type and time slot)
  const coach = coachFactory.create(overrides?.coach);

  // Create user
  const user = userFactory.create(overrides?.user);

  // Create booking type for this coach
  const bookingType = bookingTypeFactory.createWithCoach(coach.id, overrides?.bookingType);

  // Create time slot for this coach
  const timeSlot = timeSlotFactory.createWithCoach(coach.id, overrides?.timeSlot);

  // Create session that connects everything together
  const sessionOverrides = {
    userId: user.id,
    coachId: coach.id,
    bookingTypeId: bookingType.id,
    timeSlotId: timeSlot.id,
    // Ensure session dateTime matches time slot
    dateTime: timeSlot.dateTime,
    // Set appropriate price based on booking type
    price: bookingType.basePrice,
    ...overrides?.session,
  };

  const session = sessionFactory.create(sessionOverrides);

  return { user, coach, bookingType, timeSlot, session };
}

/**
 * Creates a booking scenario with optional discount and payment state
 * Extends the basic test scenario with booking-specific features
 */
export function createBookingScenario(options?: {
  withDiscount?: boolean;
  discountAmount?: Decimal;
  sessionStatus?: SessionStatus;
  isPaid?: boolean;
  user?: Partial<MockAccount>;
  coach?: Partial<MockCoach>;
  bookingType?: Partial<MockBookingType>;
  timeSlot?: Partial<MockTimeSlot>;
  session?: Partial<MockSession>;
}): BookingScenario {
  // Create base scenario
  const scenario = createTestScenario({
    user: options?.user,
    coach: options?.coach,
    bookingType: options?.bookingType,
    timeSlot: options?.timeSlot,
    session: options?.session,
  });

  let discount: MockDiscount | null = null;

  // Create discount if requested
  if (options?.withDiscount) {
    // Use provided amount or default to 10% of session price (but not more than $50)
    const discountAmount =
      options.discountAmount ?? Decimal.min(scenario.session.price.mul(0.1), new Decimal(50));

    discount = discountFactory.createWithCoach(scenario.coach.id, {
      amount: discountAmount,
      maxUsage: 10, // Allow multiple uses for testing
      useCount: 0,
    });

    // Apply discount to session
    scenario.session.discountId = discount.id;
    scenario.session.discountCode = discount.code;

    // Calculate discounted price (ensure it doesn't go below 0)
    scenario.session.price = Decimal.max(
      new Decimal(0),
      scenario.session.price.sub(discount.amount)
    );

    // Update discount usage
    discount.useCount += 1;
  }

  // Set session status
  if (options?.sessionStatus) {
    scenario.session.status = options.sessionStatus;

    // If completed, set appropriate timestamps
    if (options.sessionStatus === SessionStatus.COMPLETED) {
      scenario.session.updatedAt = new Date();
    }
  }

  // Handle payment state
  if (options?.isPaid !== undefined) {
    scenario.session.isPaid = options.isPaid;

    if (options.isPaid) {
      scenario.session.paymentId = `pay_${scenario.session.id}`;
      // If paid, status should be at least confirmed
      if (scenario.session.status === SessionStatus.SCHEDULED) {
        scenario.session.status = SessionStatus.CONFIRMED;
      }
    } else {
      scenario.session.paymentId = undefined;
    }
  }

  return { ...scenario, discount };
}

/**
 * Creates a conversation scenario with realistic message flow
 * Alternates between user and coach messages with appropriate timing
 */
export function createConversationScenario(options?: {
  messageCount?: number;
  conversationType?: 'support' | 'booking' | 'feedback' | 'general';
  user?: Partial<MockAccount>;
  coach?: Partial<MockCoach>;
  startTime?: Date;
}): ConversationScenario {
  const messageCount = options?.messageCount ?? 5;

  // Create user and coach
  const user = userFactory.create(options?.user);
  const coach = coachFactory.create(options?.coach);

  // Create conversation with specific type
  const messages = messageFactory.createConversation(
    user.id,
    coach.id,
    messageCount,
    options?.conversationType,
    options?.startTime
  );

  return { user, coach, messages };
}
