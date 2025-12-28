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

import { SessionStatus } from '@prisma/client';

// Factory instances for convenience
import { AccountMockFactory } from './account.factory';
import { AuthMockFactory } from './auth.factory';
import { BookingTypeMockFactory } from './booking-type.factory';
import { CoachMockFactory } from './coach.factory';
import { DiscountMockFactory, MockDiscount } from './discount.factory';
import { HttpMockFactory } from './http.factory';
import { MessageMockFactory } from './message.factory';
import { NotificationMockFactory } from './notification.factory';
import { PaymentMockFactory } from './payment.factory';
import { SessionMockFactory } from './session.factory';
import { TimeSlotMockFactory } from './time-slot.factory';
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

export function createTestScenario() {
  const user = userFactory.create();
  const coach = coachFactory.create();
  const bookingType = bookingTypeFactory.createWithCoach(coach.id);
  const timeSlot = timeSlotFactory.createWithCoach(coach.id);
  const session = sessionFactory.create({
    userId: user.id,
    coachId: coach.id,
    bookingTypeId: bookingType.id,
    timeSlotId: timeSlot.id,
  });

  return { user, coach, bookingType, timeSlot, session };
}

export function createBookingScenario(options?: {
  withDiscount?: boolean;
  sessionStatus?: SessionStatus;
  isPaid?: boolean;
}) {
  const scenario = createTestScenario();
  let discount: MockDiscount | null = null;

  if (options?.withDiscount) {
    discount = discountFactory.createWithCoach(scenario.coach.id);
    scenario.session.discountId = discount.id;
    scenario.session.discountCode = discount.code;
    scenario.session.price = scenario.session.price * 0.8;
  }

  if (options?.sessionStatus) {
    scenario.session.status = options.sessionStatus;
  }

  if (options?.isPaid !== undefined) {
    scenario.session.isPaid = options.isPaid;
    if (options.isPaid) {
      scenario.session.paymentId = `pay_${scenario.session.id}`;
    }
  }

  return { ...scenario, discount };
}

export function createConversationScenario(messageCount = 5) {
  const user = userFactory.create();
  const coach = coachFactory.create();
  const messages = messageFactory.createConversation(user.id, coach.id, messageCount);

  return { user, coach, messages };
}
