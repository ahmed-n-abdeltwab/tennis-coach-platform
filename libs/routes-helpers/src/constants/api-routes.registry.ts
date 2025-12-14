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
  '/api/accounts': {
    GET: (
      params: undefined | never,
      body: undefined | never
    ) => {
      id: string;
      createdAt: string;
      updatedAt: string;
      email: string;
      name: string;
      role: 'USER' | 'PREMIUM_USER' | 'ADMIN' | 'COACH';
      gender?: 'male' | 'female' | 'other';
      age?: number;
      height?: number;
      weight?: number;
      bio?: string | null;
      credentials?: string | null;
      philosophy?: string | null;
      profileImage?: string | null;
      disability?: string | null;
      disabilityCause?: string | null;
      country?: string | null;
      address?: string | null;
      notes?: string | null;
      isActive: boolean;
      isOnline: boolean;
    }[];
  };

  '/api/accounts/me': {
    GET: (
      params: undefined | never,
      body: undefined | never
    ) => {
      id: string;
      createdAt: string;
      updatedAt: string;
      email: string;
      name: string;
      role: 'USER' | 'PREMIUM_USER' | 'ADMIN' | 'COACH';
      gender?: 'male' | 'female' | 'other';
      age?: number;
      height?: number;
      weight?: number;
      bio?: string | null;
      credentials?: string | null;
      philosophy?: string | null;
      profileImage?: string | null;
      disability?: string | null;
      disabilityCause?: string | null;
      country?: string | null;
      address?: string | null;
      notes?: string | null;
      isActive: boolean;
      isOnline: boolean;
    };
  };

  '/api/accounts/{id}': {
    DELETE: (params: { id: string }, body: undefined | never) => void;
    GET: (
      params: { id: string },
      body: undefined | never
    ) => {
      id: string;
      createdAt: string;
      updatedAt: string;
      email: string;
      name: string;
      role: 'USER' | 'PREMIUM_USER' | 'ADMIN' | 'COACH';
      gender?: 'male' | 'female' | 'other';
      age?: number;
      height?: number;
      weight?: number;
      bio?: string | null;
      credentials?: string | null;
      philosophy?: string | null;
      profileImage?: string | null;
      disability?: string | null;
      disabilityCause?: string | null;
      country?: string | null;
      address?: string | null;
      notes?: string | null;
      isActive: boolean;
      isOnline: boolean;
    };
    PATCH: (
      params: { id: string },
      body: {
        name?: string;
        gender?: 'male' | 'female' | 'other';
        age?: number;
        height?: number;
        weight?: number;
        disability?: boolean;
        disabilityCause?: string | null;
        country?: string | null;
        address?: string | null;
        notes?: string | null;
        bio?: string;
        credentials?: string;
        philosophy?: string;
        profileImage?: string;
      }
    ) => {
      id: string;
      createdAt: string;
      updatedAt: string;
      email: string;
      name: string;
      role: 'USER' | 'PREMIUM_USER' | 'ADMIN' | 'COACH';
      gender?: 'male' | 'female' | 'other';
      age?: number;
      height?: number;
      weight?: number;
      bio?: string | null;
      credentials?: string | null;
      philosophy?: string | null;
      profileImage?: string | null;
      disability?: string | null;
      disabilityCause?: string | null;
      country?: string | null;
      address?: string | null;
      notes?: string | null;
      isActive: boolean;
      isOnline: boolean;
    };
  };

  '/api/authentication/login': {
    POST: (
      params: undefined | never,
      body: { email: string; password: string }
    ) => {
      accessToken: string;
      refreshToken: string;
      account: { id: string; email: string; role: 'USER' | 'PREMIUM_USER' | 'ADMIN' | 'COACH' };
    };
  };

  '/api/authentication/logout': {
    POST: (params: undefined | never, body: undefined | never) => { message: string };
  };

  '/api/authentication/refresh': {
    POST: (
      params: undefined | never,
      body: undefined | never
    ) => {
      accessToken: string;
      refreshToken: string;
      account: { id: string; email: string; role: 'USER' | 'PREMIUM_USER' | 'ADMIN' | 'COACH' };
    };
  };

  '/api/authentication/signup': {
    POST: (
      params: undefined | never,
      body: {
        email: string;
        password: string;
        name: string;
        role?: 'USER' | 'PREMIUM_USER' | 'ADMIN' | 'COACH';
      }
    ) => {
      accessToken: string;
      refreshToken: string;
      account: { id: string; email: string; role: 'USER' | 'PREMIUM_USER' | 'ADMIN' | 'COACH' };
    };
  };

  '/api/booking-types': {
    GET: (
      params: undefined | never,
      body: undefined | never
    ) => {
      id: string;
      createdAt: string;
      updatedAt: string;
      name: string;
      description?: string | null;
      basePrice: number;
      isActive: boolean;
      coachId: string;
    }[];
    POST: (
      params: undefined | never,
      body: { name: string; description?: string; basePrice: number; isActive?: boolean }
    ) => {
      id: string;
      createdAt: string;
      updatedAt: string;
      name: string;
      description?: string | null;
      basePrice: number;
      isActive: boolean;
      coachId: string;
    };
  };

  '/api/booking-types/coach/{coachId}': {
    GET: (
      params: { coachId: string },
      body: undefined | never
    ) => {
      id: string;
      createdAt: string;
      updatedAt: string;
      name: string;
      description?: string | null;
      basePrice: number;
      isActive: boolean;
      coachId: string;
    }[];
  };

  '/api/booking-types/{id}': {
    DELETE: (params: { id: string }, body: undefined | never) => void;
    GET: (
      params: { id: string },
      body: undefined | never
    ) => {
      id: string;
      createdAt: string;
      updatedAt: string;
      name: string;
      description?: string | null;
      basePrice: number;
      isActive: boolean;
      coachId: string;
    };
    PATCH: (
      params: { id: string },
      body: { name?: string; description?: string; basePrice?: number; isActive?: boolean }
    ) => {
      id: string;
      createdAt: string;
      updatedAt: string;
      name: string;
      description?: string | null;
      basePrice: number;
      isActive: boolean;
      coachId: string;
    };
    PUT: (
      params: { id: string },
      body: { name?: string; description?: string; basePrice?: number; isActive?: boolean }
    ) => {
      id: string;
      createdAt: string;
      updatedAt: string;
      name: string;
      description?: string | null;
      basePrice: number;
      isActive: boolean;
      coachId: string;
    };
  };

  '/api/calendar/event': {
    POST: (
      params: undefined | never,
      body: { sessionId: string }
    ) => { eventId: string; summary: string; start: string; end: string; attendees: string[] };
  };

  '/api/calendar/event/{eventId}': {
    DELETE: (params: { eventId: string }, body: undefined | never) => void;
  };

  '/api/discounts': {
    POST: (
      params: undefined | never,
      body: { code: string; amount: number; expiry: string; maxUsage: number; isActive: boolean }
    ) => {
      id: string;
      createdAt: string;
      updatedAt: string;
      code: string;
      amount: number;
      expiry: string;
      useCount: number;
      maxUsage: number;
      isActive: boolean;
      coachId: string;
      coach?: { id: string; name: string; email: string };
    };
  };

  '/api/discounts/coach': {
    GET: (
      params: undefined | never,
      body: undefined | never
    ) => {
      id: string;
      createdAt: string;
      updatedAt: string;
      code: string;
      amount: number;
      expiry: string;
      useCount: number;
      maxUsage: number;
      isActive: boolean;
      coachId: string;
      coach?: { id: string; name: string; email: string };
    }[];
  };

  '/api/discounts/validate': {
    POST: (params: undefined | never, body: { code: string }) => string | null;
  };

  '/api/discounts/{code}': {
    DELETE: (params: { code: string }, body: undefined | never) => void;
    PUT: (
      params: { code: string },
      body: { amount?: number; expiry?: string; maxUsage?: number; isActive?: boolean }
    ) => {
      id: string;
      createdAt: string;
      updatedAt: string;
      code: string;
      amount: number;
      expiry: string;
      useCount: number;
      maxUsage: number;
      isActive: boolean;
      coachId: string;
      coach?: { id: string; name: string; email: string };
    };
  };

  '/api/health': {
    GET: (
      params: undefined | never,
      body: undefined | never
    ) => {
      status: 'ok' | 'error';
      timestamp: string;
      uptime: number;
      memory: string | null;
      version: string;
      environment: string;
      database: string;
    };
  };

  '/api/health/liveness': {
    GET: (
      params: undefined | never,
      body: undefined | never
    ) => { status: 'ok' | 'error'; timestamp: string };
  };

  '/api/health/readiness': {
    GET: (
      params: undefined | never,
      body: undefined | never
    ) => { status: 'ok' | 'error'; timestamp: string };
  };

  '/api/messages': {
    GET: (
      params: { sessionId?: string; conversationWith?: string },
      body: undefined | never
    ) => {
      id: string;
      createdAt: string;
      updatedAt: string;
      content: string;
      sentAt: string;
      senderId: string;
      receiverId: string;
      sessionId?: string | null;
      senderType: 'USER' | 'PREMIUM_USER' | 'ADMIN' | 'COACH';
      receiverType: 'USER' | 'PREMIUM_USER' | 'ADMIN' | 'COACH';
      sender?: string | null;
      receiver?: string | null;
    }[];
    POST: (
      params: undefined | never,
      body: { content: string; receiverId: string; sessionId?: string }
    ) => {
      id: string;
      createdAt: string;
      updatedAt: string;
      content: string;
      sentAt: string;
      senderId: string;
      receiverId: string;
      sessionId?: string | null;
      senderType: 'USER' | 'PREMIUM_USER' | 'ADMIN' | 'COACH';
      receiverType: 'USER' | 'PREMIUM_USER' | 'ADMIN' | 'COACH';
      sender?: string | null;
      receiver?: string | null;
    };
  };

  '/api/messages/conversation/{userId}': {
    GET: (
      params: { userId: string },
      body: undefined | never
    ) => {
      id: string;
      createdAt: string;
      updatedAt: string;
      content: string;
      sentAt: string;
      senderId: string;
      receiverId: string;
      sessionId?: string | null;
      senderType: 'USER' | 'PREMIUM_USER' | 'ADMIN' | 'COACH';
      receiverType: 'USER' | 'PREMIUM_USER' | 'ADMIN' | 'COACH';
      sender?: string | null;
      receiver?: string | null;
    }[];
  };

  '/api/messages/session/{sessionId}': {
    GET: (
      params: { sessionId?: string; conversationWith?: string },
      body: undefined | never
    ) => {
      id: string;
      createdAt: string;
      updatedAt: string;
      content: string;
      sentAt: string;
      senderId: string;
      receiverId: string;
      sessionId?: string | null;
      senderType: 'USER' | 'PREMIUM_USER' | 'ADMIN' | 'COACH';
      receiverType: 'USER' | 'PREMIUM_USER' | 'ADMIN' | 'COACH';
      sender?: string | null;
      receiver?: string | null;
    }[];
  };

  '/api/messages/{id}': {
    GET: (
      params: { id: string },
      body: undefined | never
    ) => {
      id: string;
      createdAt: string;
      updatedAt: string;
      content: string;
      sentAt: string;
      senderId: string;
      receiverId: string;
      sessionId?: string | null;
      senderType: 'USER' | 'PREMIUM_USER' | 'ADMIN' | 'COACH';
      receiverType: 'USER' | 'PREMIUM_USER' | 'ADMIN' | 'COACH';
      sender?: string | null;
      receiver?: string | null;
    };
  };

  '/api/notifications/confirm': {
    POST: (
      params: undefined | never,
      body: { sessionId: string }
    ) => { success: boolean; errors?: string[]; message_ids?: string[] };
  };

  '/api/notifications/email': {
    POST: (
      params: undefined | never,
      body: { to: string; subject: string; text?: string; html?: string }
    ) => { success: boolean; errors?: string[]; message_ids?: string[] };
  };

  '/api/payments/capture-order': {
    POST: (
      params: undefined | never,
      body: { orderId: string; sessionId: string }
    ) => { success: boolean; paymentId: string; captureId: string };
  };

  '/api/payments/create-order': {
    POST: (
      params: undefined | never,
      body: { sessionId: string; amount: number }
    ) => { orderId: string; approvalUrl: string };
  };

  '/api/sessions': {
    GET: (
      params: { status?: string; startDate?: string; endDate?: string },
      body: undefined | never
    ) => {
      data?: {
        id: string;
        createdAt: string;
        updatedAt: string;
        dateTime: string;
        durationMin: number;
        price: number;
        isPaid: boolean;
        status: string;
        notes?: string | null;
        paymentId?: string | null;
        discountCode?: string | null;
        calendarEventId?: string | null;
        userId: string;
        coachId: string;
        bookingTypeId: string;
        timeSlotId: string;
        discountId?: string | null;
        user?: string | null;
        coach?: string | null;
        bookingType?: string | null;
        timeSlot?: string | null;
        discount?: string | null;
      }[];
      meta?: {
        page?: number;
        limit?: number;
        total?: number;
        totalPages?: number;
        hasNext?: boolean;
        hasPrev?: boolean;
      };
    };
    POST: (
      params: undefined | never,
      body: { bookingTypeId: string; timeSlotId: string; discountCode?: string; notes?: string }
    ) => {
      id: string;
      createdAt: string;
      updatedAt: string;
      dateTime: string;
      durationMin: number;
      price: number;
      isPaid: boolean;
      status: string;
      notes?: string | null;
      paymentId?: string | null;
      discountCode?: string | null;
      calendarEventId?: string | null;
      userId: string;
      coachId: string;
      bookingTypeId: string;
      timeSlotId: string;
      discountId?: string | null;
      user?: string | null;
      coach?: string | null;
      bookingType?: string | null;
      timeSlot?: string | null;
      discount?: string | null;
    };
  };

  '/api/sessions/{id}': {
    GET: (
      params: { id: string },
      body: undefined | never
    ) => {
      id: string;
      createdAt: string;
      updatedAt: string;
      dateTime: string;
      durationMin: number;
      price: number;
      isPaid: boolean;
      status: string;
      notes?: string | null;
      paymentId?: string | null;
      discountCode?: string | null;
      calendarEventId?: string | null;
      userId: string;
      coachId: string;
      bookingTypeId: string;
      timeSlotId: string;
      discountId?: string | null;
      user?: string | null;
      coach?: string | null;
      bookingType?: string | null;
      timeSlot?: string | null;
      discount?: string | null;
    };
    PATCH: (
      params: { id: string },
      body: {
        notes?: string;
        status?: string;
        paymentId?: string;
        calendarEventId?: string;
        isPaid?: boolean;
      }
    ) => {
      id: string;
      createdAt: string;
      updatedAt: string;
      dateTime: string;
      durationMin: number;
      price: number;
      isPaid: boolean;
      status: string;
      notes?: string | null;
      paymentId?: string | null;
      discountCode?: string | null;
      calendarEventId?: string | null;
      userId: string;
      coachId: string;
      bookingTypeId: string;
      timeSlotId: string;
      discountId?: string | null;
      user?: string | null;
      coach?: string | null;
      bookingType?: string | null;
      timeSlot?: string | null;
      discount?: string | null;
    };
    PUT: (
      params: { id: string },
      body: {
        notes?: string;
        status?: string;
        paymentId?: string;
        calendarEventId?: string;
        isPaid?: boolean;
      }
    ) => {
      id: string;
      createdAt: string;
      updatedAt: string;
      dateTime: string;
      durationMin: number;
      price: number;
      isPaid: boolean;
      status: string;
      notes?: string | null;
      paymentId?: string | null;
      discountCode?: string | null;
      calendarEventId?: string | null;
      userId: string;
      coachId: string;
      bookingTypeId: string;
      timeSlotId: string;
      discountId?: string | null;
      user?: string | null;
      coach?: string | null;
      bookingType?: string | null;
      timeSlot?: string | null;
      discount?: string | null;
    };
  };

  '/api/sessions/{id}/cancel': {
    PUT: (
      params: { id: string },
      body: undefined | never
    ) => {
      id: string;
      createdAt: string;
      updatedAt: string;
      dateTime: string;
      durationMin: number;
      price: number;
      isPaid: boolean;
      status: string;
      notes?: string | null;
      paymentId?: string | null;
      discountCode?: string | null;
      calendarEventId?: string | null;
      userId: string;
      coachId: string;
      bookingTypeId: string;
      timeSlotId: string;
      discountId?: string | null;
      user?: string | null;
      coach?: string | null;
      bookingType?: string | null;
      timeSlot?: string | null;
      discount?: string | null;
    };
  };

  '/api/time-slots': {
    GET: (
      params: { startDate?: string; endDate?: string; coachId?: string },
      body: undefined | never
    ) => {
      id: string;
      createdAt: string;
      updatedAt: string;
      coachId: string;
      dateTime: string;
      durationMin: number;
      isAvailable: boolean;
      coach?: { id: string; name: string; email: string };
    }[];
    POST: (
      params: undefined | never,
      body: { dateTime: string; durationMin: number; isAvailable: boolean }
    ) => {
      id: string;
      createdAt: string;
      updatedAt: string;
      coachId: string;
      dateTime: string;
      durationMin: number;
      isAvailable: boolean;
      coach?: { id: string; name: string; email: string };
    };
  };

  '/api/time-slots/coach/{coachId}': {
    GET: (
      params: { coachId?: string; startDate?: string; endDate?: string },
      body: undefined | never
    ) => {
      id: string;
      createdAt: string;
      updatedAt: string;
      coachId: string;
      dateTime: string;
      durationMin: number;
      isAvailable: boolean;
      coach?: { id: string; name: string; email: string };
    }[];
  };

  '/api/time-slots/{id}': {
    DELETE: (params: { id: string }, body: undefined | never) => void;
    GET: (
      params: { id: string },
      body: undefined | never
    ) => {
      id: string;
      createdAt: string;
      updatedAt: string;
      coachId: string;
      dateTime: string;
      durationMin: number;
      isAvailable: boolean;
      coach?: { id: string; name: string; email: string };
    };
    PATCH: (
      params: { id: string },
      body: { dateTime?: string | null; durationMin?: number; isAvailable?: boolean }
    ) => {
      id: string;
      createdAt: string;
      updatedAt: string;
      coachId: string;
      dateTime: string;
      durationMin: number;
      isAvailable: boolean;
      coach?: { id: string; name: string; email: string };
    };
  };
}

/**
 * Utility types are exported from @routes-helpers
 * Import them using: import { ExtractPaths, ExtractMethods, ... } from '@routes-helpers';
 */
