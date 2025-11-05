/**
 * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 * Generated from Swagger metadata: scripts/generate-routes-from-swagger.ts
 * Run: npm run generate:routes
 */
// "/api/auth/coach/logn"
export interface Endpoints {
  "/api/auth/coach/login": {
    POST: (body: { email: string; password: string }) => { accessToken: string; refreshToken: string; user: { id: string; email: string; role: "USER" | "PREMIUM_USER" | "ADMIN" | "COACH" } };
  };

  "/api/auth/coach/signup": {
    POST: (body: { email: string; password: string; name: string; isAdmin?: boolean; bio?: string; credentials?: string; philosophy?: string; profileImage?: string }) => { accessToken: string; refreshToken: string; user: { id: string; email: string; role: "USER" | "PREMIUM_USER" | "ADMIN" | "COACH" } };
  };

  "/api/auth/logout": {
    POST: (body: undefined) => any;
  };

  "/api/auth/refresh": {
    POST: (body: undefined) => { accessToken: string; refreshToken: string; user: { id: string; email: string; role: "USER" | "PREMIUM_USER" | "ADMIN" | "COACH" } };
  };

  "/api/auth/user/login": {
    POST: (body: { email: string; password: string }) => { accessToken: string; refreshToken: string; user: { id: string; email: string; role: "USER" | "PREMIUM_USER" | "ADMIN" | "COACH" } };
  };

  "/api/auth/user/signup": {
    POST: (body: { email: string; password: string; name: string; gender?: string; age?: number; height?: number; weight?: number; disability?: boolean; disabilityCause?: string; country?: string; address?: string; notes?: string }) => { accessToken: string; refreshToken: string; user: { id: string; email: string; role: "USER" | "PREMIUM_USER" | "ADMIN" | "COACH" } };
  };

  "/api/booking-types": {
    GET: (params: undefined) => any;
    POST: (body: { name: string; description?: string; basePrice: number; isActive: boolean }) => any;
  };

  "/api/booking-types/coach/{coachId}": {
    GET: (params: { coachId: string }) => any;
  };

  "/api/booking-types/{id}": {
    DELETE: (body: undefined) => any;
    PUT: (body: { name?: string; description?: string; basePrice?: number; isActive?: boolean }) => any;
  };

  "/api/calendar/event": {
    POST: (body: { sessionId: string }) => any;
  };

  "/api/calendar/event/{eventId}": {
    DELETE: (body: undefined) => any;
  };

  "/api/coaches": {
    GET: (params: undefined) => any;
  };

  "/api/coaches/profile": {
    PUT: (body: { name?: string; bio?: string; credentials?: string; philosophy?: string; profileImage?: string }) => any;
  };

  "/api/coaches/{id}": {
    GET: (params: { id: string }) => any;
  };

  "/api/discounts": {
    POST: (body: { code: string; amount: number; expiry: string; maxUsage: number; isActive: boolean }) => any;
  };

  "/api/discounts/coach": {
    GET: (params: undefined) => any;
  };

  "/api/discounts/validate": {
    POST: (body: { code: string }) => any;
  };

  "/api/discounts/{code}": {
    DELETE: (body: undefined) => any;
    PUT: (body: { amount?: number; expiry?: string; maxUsage?: number; isActive?: boolean }) => any;
  };

  "/api/health": {
    GET: (params: undefined) => any;
  };

  "/api/health/liveness": {
    GET: (params: undefined) => any;
  };

  "/api/health/readiness": {
    GET: (params: undefined) => any;
  };

  "/api/messages": {
    POST: (body: { content: string; sessionId: string; receiverType: string }) => any;
  };

  "/api/messages/session/{sessionId}": {
    GET: (params: { sessionId: string; page?: number; limit?: number }) => any;
  };

  "/api/notifications/email": {
    POST: (body: { to: string; subject: string; text?: string; html?: string }) => any;
  };

  "/api/payments/capture-order": {
    POST: (body: { orderId: string; sessionId: string }) => any;
  };

  "/api/payments/create-order": {
    POST: (body: { sessionId: string; amount: number }) => any;
  };

  "/api/sessions": {
    GET: (params: { status?: string; startDate?: string; endDate?: string }) => { id: string; createdAt: Record<string, any>; updatedAt: Record<string, any>; userId: string; coachId: string; bookingTypeId: string; timeSlotId: string; status: string; startTime: string; endTime: string; totalPrice: number; discountCode?: string; discountAmount?: number; notes?: string; paymentId?: string; calendarEventId?: string; user?: Record<string, any>; coach?: Record<string, any>; bookingType?: Record<string, any> }[];
    POST: (body: { bookingTypeId: string; timeSlotId: string; discountCode?: string; notes?: string }) => { id: string; createdAt: Record<string, any>; updatedAt: Record<string, any>; userId: string; coachId: string; bookingTypeId: string; timeSlotId: string; status: string; startTime: string; endTime: string; totalPrice: number; discountCode?: string; discountAmount?: number; notes?: string; paymentId?: string; calendarEventId?: string; user?: Record<string, any>; coach?: Record<string, any>; bookingType?: Record<string, any> };
  };

  "/api/sessions/{id}": {
    GET: (params: { id: string }) => { id: string; createdAt: Record<string, any>; updatedAt: Record<string, any>; userId: string; coachId: string; bookingTypeId: string; timeSlotId: string; status: string; startTime: string; endTime: string; totalPrice: number; discountCode?: string; discountAmount?: number; notes?: string; paymentId?: string; calendarEventId?: string; user?: Record<string, any>; coach?: Record<string, any>; bookingType?: Record<string, any> };
    PUT: (body: { notes?: string; status?: string; paymentId?: string; calendarEventId?: string }) => { id: string; createdAt: Record<string, any>; updatedAt: Record<string, any>; userId: string; coachId: string; bookingTypeId: string; timeSlotId: string; status: string; startTime: string; endTime: string; totalPrice: number; discountCode?: string; discountAmount?: number; notes?: string; paymentId?: string; calendarEventId?: string; user?: Record<string, any>; coach?: Record<string, any>; bookingType?: Record<string, any> };
  };

  "/api/sessions/{id}/cancel": {
    PUT: (body: undefined) => { id: string; createdAt: Record<string, any>; updatedAt: Record<string, any>; userId: string; coachId: string; bookingTypeId: string; timeSlotId: string; status: string; startTime: string; endTime: string; totalPrice: number; discountCode?: string; discountAmount?: number; notes?: string; paymentId?: string; calendarEventId?: string; user?: Record<string, any>; coach?: Record<string, any>; bookingType?: Record<string, any> };
  };

  "/api/time-slots": {
    GET: (params: { startDate?: string; endDate?: string; coachId?: string }) => { id: string; createdAt: Record<string, any>; updatedAt: Record<string, any>; coachId: string; dateTime: string; durationMin: number; isAvailable: boolean; coach?: { id: string; name: string; email: string } }[];
    POST: (body: { dateTime: string; durationMin: number; isAvailable: boolean }) => { id: string; createdAt: Record<string, any>; updatedAt: Record<string, any>; coachId: string; dateTime: string; durationMin: number; isAvailable: boolean; coach?: { id: string; name: string; email: string } };
  };

  "/api/time-slots/coach/{coachId}": {
    GET: (params: { coachId?: string; startDate?: string; endDate?: string }) => { id: string; createdAt: Record<string, any>; updatedAt: Record<string, any>; coachId: string; dateTime: string; durationMin: number; isAvailable: boolean; coach?: { id: string; name: string; email: string } }[];
  };

  "/api/time-slots/{id}": {
    DELETE: (body: undefined) => any;
  };

  "/api/users/profile": {
    GET: (params: undefined) => { id: string; createdAt: Record<string, any>; updatedAt: Record<string, any>; email: string; name: string; role: "USER" | "PREMIUM_USER" | "ADMIN" | "COACH"; gender?: "male" | "female" | "other"; age?: number; height?: number; weight?: number; disability?: boolean; country?: string; address?: string; notes?: string };
    PUT: (body: { id?: string; name?: string; email?: string; gender?: Record<string, any>; age?: Record<string, any>; height?: Record<string, any>; weight?: Record<string, any>; disability?: boolean; country?: Record<string, any>; address?: Record<string, any>; notes?: Record<string, any> }) => { id: string; createdAt: Record<string, any>; updatedAt: Record<string, any>; email: string; name: string; role: "USER" | "PREMIUM_USER" | "ADMIN" | "COACH"; gender?: "male" | "female" | "other"; age?: number; height?: number; weight?: number; disability?: boolean; country?: string; address?: string; notes?: string };
  };
}
