/**
 * Factory Mixin
 *
 * Provides test data factories for creating in-memory mock objects.
 * Uses singleton factory instances for consistent ID generation.
 *
 * @module test-utils/mixins/factory
 */

import {
  AccountMockFactory,
  BookingTypeMockFactory,
  CalendarMockFactory,
  DiscountMockFactory,
  FactorySingletons,
  MessageMockFactory,
  SessionMockFactory,
  TimeSlotMockFactory,
  type MockAccount,
  type MockBookingType,
  type MockDiscount,
  type MockMessage,
  type MockSession,
  type MockTimeSlot,
} from '../factories';

/**
 * Test scenario with related entities
 */
export interface TestScenario {
  user: MockAccount;
  coach: MockAccount;
  bookingType: MockBookingType;
  timeSlot: MockTimeSlot;
  session: MockSession;
}

/**
 * Booking scenario with optional discount
 */
export interface BookingScenario extends TestScenario {
  discount: MockDiscount | null;
}

/**
 * Conversation scenario with messages
 */
export interface ConversationScenario {
  user: MockAccount;
  coach: MockAccount;
  messages: MockMessage[];
}

/**
 * Factory Mixin
 *
 * Creates in-memory mock data objects for unit tests using the factory system.
 * Uses singleton factory instances for consistent ID generation across tests.
 *
 * Use this when you don't need real database records.
 * For real database records, use DatabaseMixin instead.
 *
 * @example
 * ```typescript
 * // Access via test.factory
 * const user = test.factory.account.createUser();
 * const coach = test.factory.account.createCoach();
 * const session = test.factory.session.create();
 * ```
 */
export class FactoryMixin {
  /**
   * Account factory for creating mock user, coach, and admin accounts.
   */
  get account(): AccountMockFactory {
    return FactorySingletons.account;
  }

  /**
   * Booking type factory for creating mock booking/session types.
   */
  get bookingType(): BookingTypeMockFactory {
    return FactorySingletons.bookingType;
  }

  /**
   * Time slot factory for creating mock coach availability slots.
   */
  get timeSlot(): TimeSlotMockFactory {
    return FactorySingletons.timeSlot;
  }

  /**
   * Session factory for creating mock booking sessions with related entities.
   */
  get session(): SessionMockFactory {
    return FactorySingletons.session;
  }

  /**
   * Discount factory for creating mock discount codes.
   */
  get discount(): DiscountMockFactory {
    return FactorySingletons.discount;
  }

  /**
   * Message factory for creating mock chat messages.
   */
  get message(): MessageMockFactory {
    return FactorySingletons.message;
  }

  /**
   * Calendar factory for creating mock Google Calendar events.
   */
  get calendar(): CalendarMockFactory {
    return FactorySingletons.calendar;
  }
}
