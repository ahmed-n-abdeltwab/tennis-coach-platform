/**
 * Factory exports for easy importing in tests
 */

import { AuthMockFactory } from './auth.factory';
import { BookingTypeMockFactory } from './booking-type.factory';
import { CoachMockFactory } from './coach.factory';
import { DiscountMockFactory, MockDiscount } from './discount.factory';
import { HttpMockFactory } from './http.factory';
import { MessageMockFactory } from './message.factory';
import { PaymentMockFactory } from './payment.factory';
import { SessionMockFactory } from './session.factory';
import { TimeSlotMockFactory } from './time-slot.factory';
import { UserMockFactory } from './user.factory';

export const userFactory = new UserMockFactory();
export const coachFactory = new CoachMockFactory();
export const bookingTypeFactory = new BookingTypeMockFactory();
export const timeSlotFactory = new TimeSlotMockFactory();
export const sessionFactory = new SessionMockFactory();
export const discountFactory = new DiscountMockFactory();
export const messageFactory = new MessageMockFactory();
export const paymentFactory = new PaymentMockFactory();
export const authFactory = new AuthMockFactory();
export const httpFactory = new HttpMockFactory();

// Convenience function to create related test data
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

  return {
    user,
    coach,
    bookingType,
    timeSlot,
    session,
  };
}

// Convenience function to create a complete booking scenario
export function createBookingScenario(options?: {
  withDiscount?: boolean;
  sessionStatus?: string;
  isPaid?: boolean;
}) {
  const scenario = createTestScenario();

  let discount: MockDiscount | null = null;

  if (options?.withDiscount) {
    discount = discountFactory.createWithCoach(scenario.coach.id);
    scenario.session.discountId = discount.id;
    scenario.session.discountCode = discount.code;
    scenario.session.price = scenario.session.price * 0.8; // Apply discount
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

  return {
    ...scenario,
    discount,
  };
}

// Convenience function to create message conversation
export function createConversationScenario(messageCount = 5) {
  const user = userFactory.create();
  const coach = coachFactory.create();
  const messages = messageFactory.createConversation(user.id, coach.id, messageCount);

  return {
    user,
    coach,
    messages,
  };
}
