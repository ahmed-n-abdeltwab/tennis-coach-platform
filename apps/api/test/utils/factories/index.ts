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

export { DiscountMockFactory } from './discount.factory';
export type { MockDiscount } from './discount.factory';

export { MessageMockFactory } from './message.factory';
export type { MockMessage } from './message.factory';

export { SessionMockFactory } from './session.factory';
export type { MockSession } from './session.factory';

export { TimeSlotMockFactory } from './time-slot.factory';
export type { MockTimeSlot } from './time-slot.factory';

export { CalendarMockFactory } from './calendar.factory';
export type { MockCalendar } from './calendar.factory';

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
} from './http.factory';

export { NotificationMockFactory } from './notification.factory';
export type { MockEmailResult, MockNotification } from './notification.factory';

export { PaymentMockFactory } from './payment.factory';
export type { MockPayment, MockPayPalCapture, MockPayPalOrder } from './payment.factory';
