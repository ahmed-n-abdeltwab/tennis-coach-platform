/**
 * Mock Data Factories
 *
 * Provides factories for creating in-memory mock objects.
 * Use these for unit tests where no database is needed.
 *
 * For real database records, use DatabaseMixin instead.
 *
 * @module test-utils/factories
 */

// Base factory
export { BaseMockFactory } from './base-factory';
export type { MockFactory, Nullified } from './base-factory';

// Domain entity factories
export { AccountMockFactory, type MockAccount } from './account.factory';
export {
  AnalyticsMockFactory,
  type MockCustomServiceStats,
  type MockDashboardAnalytics,
  type MockFinancialAnalytics,
  type MockPlatformGrowth,
  type MockSessionMetrics,
  type MockSystemMetrics,
  type MockUserStatistics,
} from './analytics.factory';
export { BookingTypeMockFactory, type MockBookingType } from './booking-type.factory';
export { CalendarMockFactory, type MockCalendar } from './calendar.factory';
export {
  ConversationMockFactory,
  type MockConversation,
  type MockLastMessage,
} from './conversation.factory';
export { CustomServiceMockFactory, type MockCustomService } from './custom-service.factory';
export { DiscountMockFactory, type MockDiscount } from './discount.factory';
export { MessageMockFactory, type MockMessage } from './message.factory';
export { SessionMockFactory, type MockSession } from './session.factory';
export { TimeSlotMockFactory, type MockTimeSlot } from './time-slot.factory';

// Infrastructure factories
export {
  AuthMockFactory,
  type MockAuthHeaders,
  type MockAuthPayload,
  type MockAuthResponse,
} from './auth.factory';
export { EmailMockFactory, type MockEmail, type MockEmailResult } from './email.factory';
export {
  HttpMockFactory,
  type CreateRequestOptions,
  type MockHttpResponse,
  type MockRequest,
  type MockRequestOverrides,
} from './http.factory';
export { NotificationMockFactory, type MockNotification } from './notification.factory';
export {
  PaymentMockFactory,
  type MockPayment,
  type MockPayPalCapture,
  type MockPayPalOrder,
} from './payment.factory';

// Lazy singleton instances - initialized on first access
import { AccountMockFactory } from './account.factory';
import { AnalyticsMockFactory } from './analytics.factory';
import { AuthMockFactory } from './auth.factory';
import { BookingTypeMockFactory } from './booking-type.factory';
import { CalendarMockFactory } from './calendar.factory';
import { ConversationMockFactory } from './conversation.factory';
import { CustomServiceMockFactory } from './custom-service.factory';
import { DiscountMockFactory } from './discount.factory';
import { EmailMockFactory } from './email.factory';
import { MessageMockFactory } from './message.factory';
import { NotificationMockFactory } from './notification.factory';
import { PaymentMockFactory } from './payment.factory';
import { SessionMockFactory } from './session.factory';
import { TimeSlotMockFactory } from './time-slot.factory';

export class FactorySingletons {
  private static _account: AccountMockFactory;
  private static _analytics: AnalyticsMockFactory;
  private static _auth: AuthMockFactory;
  private static _bookingType: BookingTypeMockFactory;
  private static _conversation: ConversationMockFactory;
  private static _customService: CustomServiceMockFactory;
  private static _discount: DiscountMockFactory;
  private static _message: MessageMockFactory;
  private static _session: SessionMockFactory;
  private static _timeSlot: TimeSlotMockFactory;
  private static _calendar: CalendarMockFactory;
  private static _notification: NotificationMockFactory;
  private static _email: EmailMockFactory;
  private static _payment: PaymentMockFactory;

  static get account(): AccountMockFactory {
    return (this._account ??= new AccountMockFactory());
  }

  static get analytics(): AnalyticsMockFactory {
    return (this._analytics ??= new AnalyticsMockFactory());
  }

  static get auth(): AuthMockFactory {
    return (this._auth ??= new AuthMockFactory());
  }

  static get bookingType(): BookingTypeMockFactory {
    return (this._bookingType ??= new BookingTypeMockFactory());
  }

  static get conversation(): ConversationMockFactory {
    return (this._conversation ??= new ConversationMockFactory());
  }

  static get customService(): CustomServiceMockFactory {
    return (this._customService ??= new CustomServiceMockFactory());
  }

  static get discount(): DiscountMockFactory {
    return (this._discount ??= new DiscountMockFactory());
  }

  static get message(): MessageMockFactory {
    return (this._message ??= new MessageMockFactory());
  }

  static get session(): SessionMockFactory {
    return (this._session ??= new SessionMockFactory());
  }

  static get timeSlot(): TimeSlotMockFactory {
    return (this._timeSlot ??= new TimeSlotMockFactory());
  }

  static get calendar(): CalendarMockFactory {
    return (this._calendar ??= new CalendarMockFactory());
  }

  static get notification(): NotificationMockFactory {
    return (this._notification ??= new NotificationMockFactory());
  }

  static get email(): EmailMockFactory {
    return (this._email ??= new EmailMockFactory());
  }

  static get payment(): PaymentMockFactory {
    return (this._payment ??= new PaymentMockFactory());
  }
}

// Export singleton accessors
export const accountFactory = FactorySingletons.account;
export const analyticsFactory = FactorySingletons.analytics;
export const authFactory = FactorySingletons.auth;
export const bookingTypeFactory = FactorySingletons.bookingType;
export const conversationFactory = FactorySingletons.conversation;
export const customServiceFactory = FactorySingletons.customService;
export const discountFactory = FactorySingletons.discount;
export const messageFactory = FactorySingletons.message;
export const sessionFactory = FactorySingletons.session;
export const timeSlotFactory = FactorySingletons.timeSlot;
export const calendarFactory = FactorySingletons.calendar;
export const notificationFactory = FactorySingletons.notification;
export const emailFactory = FactorySingletons.email;
export const paymentFactory = FactorySingletons.payment;
