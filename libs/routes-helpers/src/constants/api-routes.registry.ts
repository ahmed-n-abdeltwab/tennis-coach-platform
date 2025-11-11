/**
 * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 * Generated from Swagger metadata
 * 
 * Generation Options:
 * - Inline DTOs: true
 * - Generate Utility Types: true
 * - Generate Schemas: false
 */

export interface Endpoints {
  "/api/accounts": {
    GET: (params: undefined | never) => { id: string; createdAt: string; updatedAt: string; email: string; name: string; role: "USER" | "PREMIUM_USER" | "ADMIN" | "COACH"; gender?: "male" | "female" | "other"; age?: Record<string, unknown>; height?: Record<string, unknown>; weight?: Record<string, unknown>; bio?: Record<string, unknown>; credentials?: Record<string, unknown>; philosophy?: Record<string, unknown>; profileImage?: Record<string, unknown>; disability?: Record<string, unknown>; disabilityCause?: Record<string, unknown>; country?: Record<string, unknown>; address?: Record<string, unknown>; notes?: Record<string, unknown>; isActive: boolean; isOnline: boolean }[];
  };

  "/api/accounts/me": {
    GET: (params: undefined | never) => { id: string; createdAt: string; updatedAt: string; email: string; name: string; role: "USER" | "PREMIUM_USER" | "ADMIN" | "COACH"; gender?: "male" | "female" | "other"; age?: Record<string, unknown>; height?: Record<string, unknown>; weight?: Record<string, unknown>; bio?: Record<string, unknown>; credentials?: Record<string, unknown>; philosophy?: Record<string, unknown>; profileImage?: Record<string, unknown>; disability?: Record<string, unknown>; disabilityCause?: Record<string, unknown>; country?: Record<string, unknown>; address?: Record<string, unknown>; notes?: Record<string, unknown>; isActive: boolean; isOnline: boolean };
  };

  "/api/accounts/{id}": {
    DELETE: (body: undefined) => void;
    GET: (params: { id: string }) => { id: string; createdAt: string; updatedAt: string; email: string; name: string; role: "USER" | "PREMIUM_USER" | "ADMIN" | "COACH"; gender?: "male" | "female" | "other"; age?: Record<string, unknown>; height?: Record<string, unknown>; weight?: Record<string, unknown>; bio?: Record<string, unknown>; credentials?: Record<string, unknown>; philosophy?: Record<string, unknown>; profileImage?: Record<string, unknown>; disability?: Record<string, unknown>; disabilityCause?: Record<string, unknown>; country?: Record<string, unknown>; address?: Record<string, unknown>; notes?: Record<string, unknown>; isActive: boolean; isOnline: boolean };
    PATCH: (body: { name?: string; gender?: "male" | "female" | "other"; age?: Record<string, unknown>; height?: Record<string, unknown>; weight?: Record<string, unknown>; disability?: boolean; disabilityCause?: Record<string, unknown>; country?: Record<string, unknown>; address?: Record<string, unknown>; notes?: Record<string, unknown>; bio?: string; credentials?: string; philosophy?: string; profileImage?: string }) => { id: string; createdAt: string; updatedAt: string; email: string; name: string; role: "USER" | "PREMIUM_USER" | "ADMIN" | "COACH"; gender?: "male" | "female" | "other"; age?: Record<string, unknown>; height?: Record<string, unknown>; weight?: Record<string, unknown>; bio?: Record<string, unknown>; credentials?: Record<string, unknown>; philosophy?: Record<string, unknown>; profileImage?: Record<string, unknown>; disability?: Record<string, unknown>; disabilityCause?: Record<string, unknown>; country?: Record<string, unknown>; address?: Record<string, unknown>; notes?: Record<string, unknown>; isActive: boolean; isOnline: boolean };
  };

  "/api/authentication/coach/login": {
    POST: (body: { email: string; password: string }) => { accessToken: string; account: { id: string; email: string; role: "USER" | "PREMIUM_USER" | "ADMIN" | "COACH" }; refreshToken: string };
  };

  "/api/authentication/login": {
    POST: (body: { email: string; password: string }) => { accessToken: string; account: { id: string; email: string; role: "USER" | "PREMIUM_USER" | "ADMIN" | "COACH" }; refreshToken: string };
  };

  "/api/authentication/logout": {
    POST: (body: undefined) => { message: string };
  };

  "/api/authentication/refresh": {
    POST: (body: undefined) => { accessToken: string; account: { id: string; email: string; role: "USER" | "PREMIUM_USER" | "ADMIN" | "COACH" } };
  };

  "/api/authentication/signup": {
    POST: (body: { email: string; password: string; name: string; role: "USER" | "PREMIUM_USER" | "ADMIN" | "COACH" }) => { accessToken: string; account: { id: string; email: string; role: "USER" | "PREMIUM_USER" | "ADMIN" | "COACH" }; refreshToken: string };
  };

  "/api/authentication/user/login": {
    POST: (body: { email: string; password: string }) => { accessToken: string; account: { id: string; email: string; role: "USER" | "PREMIUM_USER" | "ADMIN" | "COACH" }; refreshToken: string };
  };

  "/api/booking-types": {
    GET: (params: undefined | never) => { id: string; createdAt: string; updatedAt: string; name: string; description?: Record<string, unknown>; basePrice: Record<string, unknown>; isActive: boolean; coachId: string }[];
    POST: (body: { name: string; description?: string; basePrice: Record<string, unknown>; isActive?: boolean }) => { id: string; createdAt: string; updatedAt: string; name: string; description?: Record<string, unknown>; basePrice: Record<string, unknown>; isActive: boolean; coachId: string };
  };

  "/api/booking-types/coach/{coachId}": {
    GET: (params: { coachId: string }) => { id: string; createdAt: string; updatedAt: string; name: string; description?: Record<string, unknown>; basePrice: Record<string, unknown>; isActive: boolean; coachId: string }[];
  };

  "/api/booking-types/{id}": {
    DELETE: (body: undefined) => void;
    PUT: (body: { name?: string; description?: string; basePrice?: Record<string, unknown>; isActive?: boolean }) => { id: string; createdAt: string; updatedAt: string; name: string; description?: Record<string, unknown>; basePrice: Record<string, unknown>; isActive: boolean; coachId: string };
  };

  "/api/calendar/event": {
    POST: (body: { sessionId: string }) => { eventId: string; summary: string; start: string; end: string; attendees: string[] };
  };

  "/api/calendar/event/{eventId}": {
    DELETE: (body: undefined) => void;
  };

  "/api/discounts": {
    POST: (body: { code: string; amount: number; expiry: string; maxUsage: number; isActive: boolean }) => { id: string; createdAt: string; updatedAt: string; code: string; amount: Record<string, unknown>; expiry: string; useCount: number; maxUsage: number; isActive: boolean; coachId: string };
  };

  "/api/discounts/coach": {
    GET: (params: undefined | never) => { id: string; createdAt: string; updatedAt: string; code: string; amount: Record<string, unknown>; expiry: string; useCount: number; maxUsage: number; isActive: boolean; coachId: string }[];
  };

  "/api/discounts/validate": {
    POST: (body: { code: string }) => Record<string, unknown>;
  };

  "/api/discounts/{code}": {
    DELETE: (body: undefined) => void;
    PUT: (body: { amount?: number; expiry?: string; maxUsage?: number; isActive?: boolean }) => { id: string; createdAt: string; updatedAt: string; code: string; amount: Record<string, unknown>; expiry: string; useCount: number; maxUsage: number; isActive: boolean; coachId: string };
  };

  "/api/health": {
    GET: (params: undefined | never) => { status: "ok" | "error"; timestamp: string; uptime: number; memory: Record<string, unknown>; version: string; environment: string; database: string };
  };

  "/api/health/liveness": {
    GET: (params: undefined | never) => { status: "ok" | "error"; timestamp: string };
  };

  "/api/health/readiness": {
    GET: (params: undefined | never) => { status: "ok" | "error"; timestamp: string };
  };

  "/api/messages": {
    POST: (body: { content: string; sessionId: string; receiverType: "USER" | "PREMIUM_USER" | "ADMIN" | "COACH" }) => void;
  };

  "/api/messages/session/{sessionId}": {
    GET: (params: { sessionId: string; page?: number; limit?: number }) => void;
  };

  "/api/notifications/email": {
    POST: (body: { to: string; subject: string; text?: string; html?: string }) => void;
  };

  "/api/payments/capture-order": {
    POST: (body: { orderId: string; sessionId: string }) => void;
  };

  "/api/payments/create-order": {
    POST: (body: { sessionId: string; amount: number }) => void;
  };

  "/api/sessions": {
    GET: (params: { status?: string; startDate?: string; endDate?: string }) => { id: string; createdAt: string; updatedAt: string; dateTime: string; durationMin: number; price: Record<string, unknown>; isPaid: boolean; status: string; notes?: string; paymentId?: string; discountCode?: string; calendarEventId?: string; userId: string; coachId: string; bookingTypeId: string; timeSlotId: string; discountId?: string; user?: Record<string, unknown>; coach?: Record<string, unknown>; bookingType?: Record<string, unknown>; timeSlot?: Record<string, unknown>; discount?: Record<string, unknown> }[];
    POST: (body: { bookingTypeId: string; timeSlotId: string; discountCode?: string; notes?: string }) => { id: string; createdAt: string; updatedAt: string; dateTime: string; durationMin: number; price: Record<string, unknown>; isPaid: boolean; status: string; notes?: string; paymentId?: string; discountCode?: string; calendarEventId?: string; userId: string; coachId: string; bookingTypeId: string; timeSlotId: string; discountId?: string; user?: Record<string, unknown>; coach?: Record<string, unknown>; bookingType?: Record<string, unknown>; timeSlot?: Record<string, unknown>; discount?: Record<string, unknown> };
  };

  "/api/sessions/{id}": {
    GET: (params: { id: string }) => { id: string; createdAt: string; updatedAt: string; dateTime: string; durationMin: number; price: Record<string, unknown>; isPaid: boolean; status: string; notes?: string; paymentId?: string; discountCode?: string; calendarEventId?: string; userId: string; coachId: string; bookingTypeId: string; timeSlotId: string; discountId?: string; user?: Record<string, unknown>; coach?: Record<string, unknown>; bookingType?: Record<string, unknown>; timeSlot?: Record<string, unknown>; discount?: Record<string, unknown> };
    PUT: (body: { notes?: string; status?: string; paymentId?: string; calendarEventId?: string }) => { id: string; createdAt: string; updatedAt: string; dateTime: string; durationMin: number; price: Record<string, unknown>; isPaid: boolean; status: string; notes?: string; paymentId?: string; discountCode?: string; calendarEventId?: string; userId: string; coachId: string; bookingTypeId: string; timeSlotId: string; discountId?: string; user?: Record<string, unknown>; coach?: Record<string, unknown>; bookingType?: Record<string, unknown>; timeSlot?: Record<string, unknown>; discount?: Record<string, unknown> };
  };

  "/api/sessions/{id}/cancel": {
    PUT: (body: undefined) => { id: string; createdAt: string; updatedAt: string; dateTime: string; durationMin: number; price: Record<string, unknown>; isPaid: boolean; status: string; notes?: string; paymentId?: string; discountCode?: string; calendarEventId?: string; userId: string; coachId: string; bookingTypeId: string; timeSlotId: string; discountId?: string; user?: Record<string, unknown>; coach?: Record<string, unknown>; bookingType?: Record<string, unknown>; timeSlot?: Record<string, unknown>; discount?: Record<string, unknown> };
  };

  "/api/time-slots": {
    GET: (params: { startDate?: string; endDate?: string; coachId?: string }) => { id: string; createdAt: string; updatedAt: string; coachId: string; dateTime: string; durationMin: number; isAvailable: boolean; coach?: { id: string; name: string; email: string } }[];
    POST: (body: { dateTime: string; durationMin: number; isAvailable: boolean }) => { id: string; createdAt: string; updatedAt: string; coachId: string; dateTime: string; durationMin: number; isAvailable: boolean; coach?: { id: string; name: string; email: string } };
  };

  "/api/time-slots/coach/{coachId}": {
    GET: (params: { coachId?: string; startDate?: string; endDate?: string }) => { id: string; createdAt: string; updatedAt: string; coachId: string; dateTime: string; durationMin: number; isAvailable: boolean; coach?: { id: string; name: string; email: string } }[];
  };

  "/api/time-slots/{id}": {
    DELETE: (body: undefined) => void;
  };
}

/**
 * Utility types are exported from @routes-helpers
 * Import them using: import { ExtractPaths, ExtractMethods, ... } from '@routes-helpers';
 */
