/**
 * Test Data Factories
 *
 * Provides factories for creating test data with sensible defaults.
 *
 * @deprecated For new code, prefer using DatabaseMixin methods through
 * IntegrationTest or E2ETest classes (e.g., test.db.createTestUser()).
 * These factories create mock data objects, while DatabaseMixin creates
 * real database records. These factories are maintained for backward
 * compatibility and unit testing scenarios.
 *
 * @example Recommended approach (creates real database records)
 * ```typescript
 * import { IntegrationTest } from '@test-utils/base';
 *
 * const test = new IntegrationTest({ modules: [MyModule] });
 * await test.setup();
 * const user = await test.db.createTestUser();
 * const coach = await test.db.createTestCoach();
 * ```
 *
 * @example Legacy approach (creates mock objects, still supported)
 * ```typescript
 * import { userFactory, coachFactory } from '@test-utils/factories';
 *
 * const user = userFactory.create();
 * const coach = coachFactory.create();
 * ```
 *
 * @example Convenience scenarios
 * ```typescript
 * import { createTestScenario, createBookingScenario } from '@test-utils/factories';
 *
 * // Create related test data
 * const scenario = createTestScenario();
 * // Returns: { user, coach, bookingType, timeSlot, session }
 *
 * // Create booking scenario with discount
 * const bookingScenario = createBookingScenario({ withDiscount: true });
 * ```
 *
 * @module factories
 */

import { MockDiscount } from '../mocks';

import { AccountMockFactory } from './account.factory';
import { AuthMockFactory } from './auth.factory';
import { BookingTypeMockFactory } from './booking-type.factory';
import { CoachMockFactory } from './coach.factory';
import { DiscountMockFactory } from './discount.factory';
import { HttpMockFactory } from './http/http.factory';
import { MessageMockFactory } from './message.factory';
import { PaymentMockFactory } from './payment.factory';
import { SessionMockFactory } from './session.factory';
import { TimeSlotMockFactory } from './time-slot.factory';
import { UserMockFactory } from './user.factory';

// Export factory classes
export {
  AccountMockFactory,
  AuthMockFactory,
  BookingTypeMockFactory,
  CoachMockFactory,
  DiscountMockFactory,
  HttpMockFactory,
  MessageMockFactory,
  PaymentMockFactory,
  SessionMockFactory,
  TimeSlotMockFactory,
  UserMockFactory,
};

// Export factory instances for convenience
export const accountFactory = new AccountMockFactory();
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
