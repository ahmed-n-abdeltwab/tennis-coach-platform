/**
 * Factory Mixin
 *
 * Provides test data factories for creating in-memory mock objects.
 * Use fots where no database is needed.
 *
 * @module test-utils/mixins/factory
 */

import {
  AccountMockFactory,
  BookingTypeMockFactory,
  CalendarMockFactory,
  DiscountMockFactory,
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
 * Provides direct access to factory instances for clean API usage.
 *
 * Use this when you don't need real database records.
 * For real database records, use DatabaseMixin instead.
 *
 * @example
 * ```typescript
 * // Access via test.factory
 * const user = test.factory.account.createUser();
 * const coach = test.factory.account.createCoachWithNulls();
 * const session = test.factory.session.createWithNulls();
 * ```
 */
export class FactoryMixin {
  /**
   * Account factory for creating mock user, coach, admin, and premium user accounts.
   *
   * @example
   * ```typescript
   * // Create a user account
   * const user = test.factory.account.createUser();
   * const userWithNulls = test.factory.account.createUserWithNulls();
   *
   * // Create a coach account
   * const coach = test.factory.account.createCoach();
   * const coachWithNulls = test.factory.account.createCoachWithNulls();
   *
   * // Create multiple accounts
   * const users = test.factory.account.createManyUser(5);
   * const coaches = test.factory.account.createManyCoachWithNulls(3);
   *
   * // Create with overrides
   * const customUser = test.factory.account.createUser({ name: 'John Doe' });
   * ```
   */
  readonly account: AccountMockFactory;

  /**
   * Booking type factory for creating mock booking/session types.
   *
   * @example
   * ```typescript
   * // Create a booking type
   * const bookingType = test.factory.bookingType.create();
   * const bookingTypeWithNulls = test.factory.bookingType.createWithNulls();
   *
   * // Create multiple booking types
   * const types = test.factory.bookingType.createMany(3);
   * const typesWithNulls = test.factory.bookingType.createManyWithNulls(3);
   *
   * // Create with specific coach
   * const coachType = test.factory.bookingType.createWithNulls({ coachId: 'coach-123' });
   * ```
   */
  readonly bookingType: BookingTypeMockFactory;

  /**
   * Time slot factory for creating mock coach availability slots.
   *
   * @example
   * ```typescript
   * // Create a time slot
   * const slot = test.factory.timeSlot.create();
   * const slotWithNulls = test.factory.timeSlot.createWithNulls();
   *
   * // Create available/unavailable slots
   * const available = test.factory.timeSlot.createAvailable();
   * const unavailable = test.factory.timeSlot.createUnavailable();
   *
   * // Create for specific coach
   * const coachSlot = test.factory.timeSlot.createWithCoach('coach-123');
   * ```
   */
  readonly timeSlot: TimeSlotMockFactory;

  /**
   * Session factory for creating mock booking sessions with related entities.
   *
   * @example
   * ```typescript
   * // Create a session (includes user, coach, bookingType, timeSlot relations)
   * const session = test.factory.session.create();
   * const sessionWithNulls = test.factory.session.createWithNulls();
   *
   * // Create sessions with specific status
   * const scheduled = test.factory.session.createScheduled();
   * const completed = test.factory.session.createCompleted();
   * const cancelled = test.factory.session.createCancelled();
   *
   * // Create paid session
   * const paid = test.factory.session.createPaid();
   *
   * // Create for specific user and coach
   * const custom = test.factory.session.createForUserAndCoach('user-123', 'coach-456');
   * ```
   */
  readonly session: SessionMockFactory;

  /**
   * Discount factory for creating mock discount codes.
   *
   * @example
   * ```typescript
   * // Create a discount
   * const discount = test.factory.discount.create();
   * const discountWithNulls = test.factory.discount.createWithNulls();
   *
   * // Create active/inactive/expired discounts
   * const active = test.factory.discount.createActive();
   * const inactive = test.factory.discount.createInactive();
   * const expired = test.factory.discount.createExpired();
   *
   * // Create fully used discount
   * const fullyUsed = test.factory.discount.createFullyUsed();
   * ```
   */
  readonly discount: DiscountMockFactory;

  /**
   * Message factory for creating mock chat messages.
   *
   * @example
   * ```typescript
   * // Create a message
   * const message = test.factory.message.create();
   * const messageWithNulls = test.factory.message.createWithNulls();
   *
   * // Create directional messages
   * const userToCoach = test.factory.message.createUserToCoach('user-123', 'coach-456');
   * const coachToUser = test.factory.message.createCoachToUser('coach-456', 'user-123');
   *
   * // Create a conversation (alternating messages)
   * const conversation = test.factory.message.createConversation('user-123', 'coach-456', 10);
   * ```
   */
  readonly message: MessageMockFactory;

  /**
   * Calendar factory for creating mock Google Calendar events.
   *
   * @example
   * ```typescript
   * // Create a calendar event
   * const event = test.factory.calendar.create();
   * const eventWithNulls = test.factory.calendar.createWithNulls();
   *
   * // Create with specific details
   * const custom = test.factory.calendar.create({
   *   summary: 'Tennis Lesson',
   *   attendees: ['coach@example.com', 'user@example.com'],
   * });
   * ```
   */
  readonly calendar: CalendarMockFactory;

  constructor() {
    this.account = new AccountMockFactory();
    this.bookingType = new BookingTypeMockFactory();
    this.timeSlot = new TimeSlotMockFactory();
    this.session = new SessionMockFactory();
    this.discount = new DiscountMockFactory();
    this.message = new MessageMockFactory();
    this.calendar = new CalendarMockFactory();
  }
}
