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
  AnalyticsMockFactory,
  AuthMockFactory,
  BookingTypeMockFactory,
  CalendarMockFactory,
  ConversationMockFactory,
  CustomServiceMockFactory,
  DiscountMockFactory,
  EmailMockFactory,
  FactorySingletons,
  MessageMockFactory,
  NotificationMockFactory,
  PaymentMockFactory,
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
 * const userPayload = test.factory.auth.createUserPayload();
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
   * Analytics factory for creating mock dashboard analytics data.
   */
  get analytics(): AnalyticsMockFactory {
    return FactorySingletons.analytics;
  }

  /**
   * Auth factory for creating mock authentication payloads and tokens.
   */
  get auth(): AuthMockFactory {
    return FactorySingletons.auth;
  }

  /**
   * Booking type factory for creating mock booking/session types.
   */
  get bookingType(): BookingTypeMockFactory {
    return FactorySingletons.bookingType;
  }

  /**
   * Conversation factory for creating mock conversations.
   */
  get conversation(): ConversationMockFactory {
    return FactorySingletons.conversation;
  }

  /**
   * Custom service factory for creating mock custom services.
   */
  get customService(): CustomServiceMockFactory {
    return FactorySingletons.customService;
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

  /**
   * Notification factory for creating mock Prisma Notification records.
   */
  get notification(): NotificationMockFactory {
    return FactorySingletons.notification;
  }

  /**
   * Email factory for creating mock email notifications (Nodemailer).
   */
  get email(): EmailMockFactory {
    return FactorySingletons.email;
  }

  /**
   * Payment factory for creating mock payment records and PayPal responses.
   */
  get payment(): PaymentMockFactory {
    return FactorySingletons.payment;
  }
}
