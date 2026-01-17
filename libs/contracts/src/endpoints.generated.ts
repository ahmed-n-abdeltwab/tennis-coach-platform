/**
 * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 * Generated from Swagger metadata by: nx run contracts:generate
 * 
 * Generation Options:
 * - Inline DTOs: true
 * - Generate Utility Types: true
 * - Generate Schemas: false
 */

export interface Endpoints {
  "/api/accounts": {
    GET: (params: undefined | never, body: undefined | never) => { id: string; createdAt: string; updatedAt: string; email: string; name: string; role: "USER" | "COACH" | "ADMIN"; gender?: "male" | "female" | "other"; age?: number; height?: number; weight?: number; bio?: string; credentials?: string; philosophy?: string; profileImage?: string; disability?: boolean; disabilityCause?: string; country?: string; address?: string; notes?: string; isActive: boolean; isOnline: boolean }[];
  };

  "/api/accounts/coaches": {
    GET: (params: undefined | never, body: undefined | never) => { id: string; createdAt: string; updatedAt: string; email: string; name: string; role: "USER" | "COACH" | "ADMIN"; gender?: "male" | "female" | "other"; age?: number; height?: number; weight?: number; bio?: string; credentials?: string; philosophy?: string; profileImage?: string; disability?: boolean; disabilityCause?: string; country?: string; address?: string; notes?: string; isActive: boolean; isOnline: boolean }[];
  };

  "/api/accounts/coaches/{id}": {
    GET: (params: { id: string }, body: undefined | never) => { id: string; createdAt: string; updatedAt: string; email: string; name: string; role: "USER" | "COACH" | "ADMIN"; gender?: "male" | "female" | "other"; age?: number; height?: number; weight?: number; bio?: string; credentials?: string; philosophy?: string; profileImage?: string; disability?: boolean; disabilityCause?: string; country?: string; address?: string; notes?: string; isActive: boolean; isOnline: boolean };
  };

  "/api/accounts/me": {
    GET: (params: undefined | never, body: undefined | never) => { id: string; createdAt: string; updatedAt: string; email: string; name: string; role: "USER" | "COACH" | "ADMIN"; gender?: "male" | "female" | "other"; age?: number; height?: number; weight?: number; bio?: string; credentials?: string; philosophy?: string; profileImage?: string; disability?: boolean; disabilityCause?: string; country?: string; address?: string; notes?: string; isActive: boolean; isOnline: boolean };
  };

  "/api/accounts/role/{role}/fields": {
    GET: (params: undefined | never, body: undefined | never) => { requiredFields: string[]; optionalFields: string[]; roleSpecificFields: string[] };
  };

  "/api/accounts/{id}": {
    DELETE: (params: { id: string }, body: undefined | never) => void;
    GET: (params: { id: string }, body: undefined | never) => { id: string; createdAt: string; updatedAt: string; email: string; name: string; role: "USER" | "COACH" | "ADMIN"; gender?: "male" | "female" | "other"; age?: number; height?: number; weight?: number; bio?: string; credentials?: string; philosophy?: string; profileImage?: string; disability?: boolean; disabilityCause?: string; country?: string; address?: string; notes?: string; isActive: boolean; isOnline: boolean };
    PATCH: (params: { id: string }, body: { name?: string; gender?: "male" | "female" | "other"; age?: number; height?: number; weight?: number; disability?: boolean; disabilityCause?: string; country?: string; address?: string; notes?: string; bio?: string; credentials?: string; philosophy?: string; profileImage?: string }) => { id: string; createdAt: string; updatedAt: string; email: string; name: string; role: "USER" | "COACH" | "ADMIN"; gender?: "male" | "female" | "other"; age?: number; height?: number; weight?: number; bio?: string; credentials?: string; philosophy?: string; profileImage?: string; disability?: boolean; disabilityCause?: string; country?: string; address?: string; notes?: string; isActive: boolean; isOnline: boolean };
  };

  "/api/accounts/{id}/profile/bulk-update": {
    PATCH: (params: { id: string }, body: { name?: string; email?: string; gender?: "male" | "female" | "other"; age?: number; height?: number; weight?: number; country?: string; address?: string; bio?: string; credentials?: string; philosophy?: string; disability?: boolean; disabilityCause?: string; notes?: string }) => { id: string; createdAt: string; updatedAt: string; email: string; name: string; role: "USER" | "COACH" | "ADMIN"; gender?: "male" | "female" | "other"; age?: number; height?: number; weight?: number; bio?: string; credentials?: string; philosophy?: string; profileImage?: string; disability?: boolean; disabilityCause?: string; country?: string; address?: string; notes?: string; isActive: boolean; isOnline: boolean };
  };

  "/api/accounts/{id}/profile/completeness": {
    GET: (params: { id: string }, body: undefined | never) => { isComplete: boolean; completionPercentage: number; missingFields: string[]; requiredFields: string[]; roleSpecificFields?: string[] };
  };

  "/api/accounts/{id}/profile/upload-image": {
    POST: (params: { id: string }, body: { imageUrl: string }) => { id: string; createdAt: string; updatedAt: string; email: string; name: string; role: "USER" | "COACH" | "ADMIN"; gender?: "male" | "female" | "other"; age?: number; height?: number; weight?: number; bio?: string; credentials?: string; philosophy?: string; profileImage?: string; disability?: boolean; disabilityCause?: string; country?: string; address?: string; notes?: string; isActive: boolean; isOnline: boolean };
  };

  "/api/accounts/{id}/profile/validate": {
    POST: (params: { id: string }, body: undefined | never) => { isValid: boolean; errors: string[]; warnings: string[]; role: "USER" | "COACH" | "ADMIN" };
  };

  "/api/accounts/{id}/role": {
    PATCH: (params: { id: string }, body: { role: "USER" | "COACH" | "ADMIN" }) => { id: string; createdAt: string; updatedAt: string; email: string; name: string; role: "USER" | "COACH" | "ADMIN"; gender?: "male" | "female" | "other"; age?: number; height?: number; weight?: number; bio?: string; credentials?: string; philosophy?: string; profileImage?: string; disability?: boolean; disabilityCause?: string; country?: string; address?: string; notes?: string; isActive: boolean; isOnline: boolean };
  };

  "/api/analytics/custom-services": {
    GET: (params: undefined | never, body: undefined | never) => { totalCustomServices: number; templatesCreated: number; publicServices: number; totalUsage: number };
  };

  "/api/analytics/dashboard": {
    GET: (params: { timeRange?: "last_7_days" | "last_30_days" | "last_90_days" | "last_year" | "custom"; startDate?: string; endDate?: string }, body: undefined | never) => { userStatistics: { totalUsers: number; activeUsers: number; onlineUsers: number; newUsersThisPeriod: number; usersByRole: string | null }; financialAnalytics: { totalRevenue: number; revenueThisPeriod: number; averageSessionPrice: number; totalSessions: number; paidSessions: number; pendingSessions: number; revenueByMonth: { month?: string; revenue?: number; sessionCount?: number }[]; topBookingTypes: { name?: string; bookingCount?: number; revenue?: number }[] }; sessionMetrics: { totalSessions: number; completedSessions: number; cancelledSessions: number; noShowSessions: number; averageDuration: number; sessionsByStatus: string | null; sessionsByTimeSlot: { hour?: number; sessionCount?: number }[] }; customServiceStats?: { totalCustomServices: number; templatesCreated: number; publicServices: number; totalUsage: number }; systemMetrics?: { totalCoaches: number; activeCoaches: number; totalBookingTypes: number; totalTimeSlots: number; totalDiscounts: number; messageCount: number }; platformGrowth?: { userGrowthRate: number; revenueGrowthRate: number; sessionGrowthRate: number } };
  };

  "/api/analytics/export": {
    GET: (params: { timeRange?: "last_7_days" | "last_30_days" | "last_90_days" | "last_year" | "custom"; startDate?: string; endDate?: string; format: "csv" | "json" | "pdf"; reportType?: string }, body: undefined | never) => { data: string; filename: string; contentType: string };
  };

  "/api/analytics/growth": {
    GET: (params: { timeRange?: "last_7_days" | "last_30_days" | "last_90_days" | "last_year" | "custom"; startDate?: string; endDate?: string }, body: undefined | never) => { userGrowthRate: number; revenueGrowthRate: number; sessionGrowthRate: number };
  };

  "/api/analytics/realtime": {
    GET: (params: undefined | never, body: undefined | never) => { onlineUsers: number; activeSessions: number; todayRevenue: number };
  };

  "/api/analytics/revenue": {
    GET: (params: { timeRange?: "last_7_days" | "last_30_days" | "last_90_days" | "last_year" | "custom"; startDate?: string; endDate?: string }, body: undefined | never) => { totalRevenue: number; revenueThisPeriod: number; averageSessionPrice: number; totalSessions: number; paidSessions: number; pendingSessions: number; revenueByMonth: { month?: string; revenue?: number; sessionCount?: number }[]; topBookingTypes: { name?: string; bookingCount?: number; revenue?: number }[] };
  };

  "/api/analytics/sessions": {
    GET: (params: { timeRange?: "last_7_days" | "last_30_days" | "last_90_days" | "last_year" | "custom"; startDate?: string; endDate?: string }, body: undefined | never) => { totalSessions: number; completedSessions: number; cancelledSessions: number; noShowSessions: number; averageDuration: number; sessionsByStatus: string | null; sessionsByTimeSlot: { hour?: number; sessionCount?: number }[] };
  };

  "/api/analytics/system": {
    GET: (params: undefined | never, body: undefined | never) => { totalCoaches: number; activeCoaches: number; totalBookingTypes: number; totalTimeSlots: number; totalDiscounts: number; messageCount: number };
  };

  "/api/analytics/users": {
    GET: (params: { timeRange?: "last_7_days" | "last_30_days" | "last_90_days" | "last_year" | "custom"; startDate?: string; endDate?: string }, body: undefined | never) => { totalUsers: number; activeUsers: number; onlineUsers: number; newUsersThisPeriod: number; usersByRole: string | null };
  };

  "/api/authentication/change-password": {
    POST: (params: undefined | never, body: { currentPassword: string; newPassword: string }) => { message: string };
  };

  "/api/authentication/forgot-password": {
    POST: (params: undefined | never, body: { email: string }) => { message: string };
  };

  "/api/authentication/login": {
    POST: (params: undefined | never, body: { email: string; password: string }) => { accessToken: string; refreshToken: string; account: { id: string; email: string; role: "USER" | "COACH" | "ADMIN" } };
  };

  "/api/authentication/logout": {
    POST: (params: undefined | never, body: undefined | never) => { message: string };
  };

  "/api/authentication/refresh": {
    POST: (params: undefined | never, body: undefined | never) => { accessToken: string; refreshToken: string; account: { id: string; email: string; role: "USER" | "COACH" | "ADMIN" } };
  };

  "/api/authentication/reset-password": {
    POST: (params: undefined | never, body: { token: string; newPassword: string }) => { message: string };
  };

  "/api/authentication/signup": {
    POST: (params: undefined | never, body: { email: string; password: string; name: string; role?: "USER" | "COACH" | "ADMIN" }) => { accessToken: string; refreshToken: string; account: { id: string; email: string; role: "USER" | "COACH" | "ADMIN" } };
  };

  "/api/booking-types": {
    GET: (params: undefined | never, body: undefined | never) => { id: string; createdAt: string; updatedAt: string; name: string; description?: string; basePrice: number; isActive: boolean; coachId: string; coach: { id: string; name: string; email: string } }[];
    POST: (params: undefined | never, body: { name: string; description?: string; basePrice: string }) => { id: string; createdAt: string; updatedAt: string; name: string; description?: string; basePrice: number; isActive: boolean; coachId: string; coach: { id: string; name: string; email: string } };
  };

  "/api/booking-types/coach/{coachId}": {
    GET: (params: { coachId: string }, body: undefined | never) => { id: string; createdAt: string; updatedAt: string; name: string; description?: string; basePrice: number; isActive: boolean; coachId: string; coach: { id: string; name: string; email: string } }[];
  };

  "/api/booking-types/{id}": {
    DELETE: (params: { id: string }, body: undefined | never) => void;
    GET: (params: { id: string }, body: undefined | never) => { id: string; createdAt: string; updatedAt: string; name: string; description?: string; basePrice: number; isActive: boolean; coachId: string; coach: { id: string; name: string; email: string } };
    PATCH: (params: { id: string }, body: { name?: string; description?: string; basePrice?: string; isActive?: boolean }) => { id: string; createdAt: string; updatedAt: string; name: string; description?: string; basePrice: number; isActive: boolean; coachId: string; coach: { id: string; name: string; email: string } };
    PUT: (params: { id: string }, body: { name?: string; description?: string; basePrice?: string; isActive?: boolean }) => { id: string; createdAt: string; updatedAt: string; name: string; description?: string; basePrice: number; isActive: boolean; coachId: string; coach: { id: string; name: string; email: string } };
  };

  "/api/calendar/event": {
    POST: (params: undefined | never, body: { sessionId: string }) => { eventId: string; summary: string; start?: string; end?: string; attendees?: string[] };
  };

  "/api/calendar/event/{eventId}": {
    DELETE: (params: { eventId: string }, body: undefined | never) => void;
  };

  "/api/conversations": {
    GET: (params: { isPinned?: boolean; limit?: number; offset?: number }, body: undefined | never) => { id: string; createdAt: string; updatedAt: string; participantIds: string[]; lastMessageId?: string; lastMessageAt?: string; isPinned: boolean; pinnedAt?: string; pinnedBy?: string; lastMessage?: { id: string; content: string; sentAt: string; senderId: string; messageType: "TEXT" | "CUSTOM_SERVICE" | "BOOKING_REQUEST"; sender?: { id: string; email: string; role: "USER" | "COACH" | "ADMIN" }; receiver?: { id: string; email: string; role: "USER" | "COACH" | "ADMIN" } }; unreadCount?: number }[];
  };

  "/api/conversations/{id}": {
    GET: (params: { id: string }, body: undefined | never) => { id: string; createdAt: string; updatedAt: string; participantIds: string[]; lastMessageId?: string; lastMessageAt?: string; isPinned: boolean; pinnedAt?: string; pinnedBy?: string; lastMessage?: { id: string; content: string; sentAt: string; senderId: string; messageType: "TEXT" | "CUSTOM_SERVICE" | "BOOKING_REQUEST"; sender?: { id: string; email: string; role: "USER" | "COACH" | "ADMIN" }; receiver?: { id: string; email: string; role: "USER" | "COACH" | "ADMIN" } }; unreadCount?: number };
  };

  "/api/conversations/{id}/pin": {
    DELETE: (params: { id: string }, body: undefined | never) => { id: string; createdAt: string; updatedAt: string; participantIds: string[]; lastMessageId?: string; lastMessageAt?: string; isPinned: boolean; pinnedAt?: string; pinnedBy?: string; lastMessage?: { id: string; content: string; sentAt: string; senderId: string; messageType: "TEXT" | "CUSTOM_SERVICE" | "BOOKING_REQUEST"; sender?: { id: string; email: string; role: "USER" | "COACH" | "ADMIN" }; receiver?: { id: string; email: string; role: "USER" | "COACH" | "ADMIN" } }; unreadCount?: number };
    POST: (params: { id: string }, body: undefined | never) => { id: string; createdAt: string; updatedAt: string; participantIds: string[]; lastMessageId?: string; lastMessageAt?: string; isPinned: boolean; pinnedAt?: string; pinnedBy?: string; lastMessage?: { id: string; content: string; sentAt: string; senderId: string; messageType: "TEXT" | "CUSTOM_SERVICE" | "BOOKING_REQUEST"; sender?: { id: string; email: string; role: "USER" | "COACH" | "ADMIN" }; receiver?: { id: string; email: string; role: "USER" | "COACH" | "ADMIN" } }; unreadCount?: number };
  };

  "/api/custom-services": {
    GET: (params: { isTemplate?: boolean; isPublic?: boolean; coachId?: string }, body: undefined | never) => { id: string; createdAt: string; updatedAt: string; name: string; description?: string; basePrice: number; duration: number; isTemplate: boolean; isPublic: boolean; usageCount: number; coachId: string; prefilledBookingTypeId?: string; prefilledDateTime?: string; prefilledTimeSlotId?: string }[];
    POST: (params: undefined | never, body: { name: string; description?: string; basePrice: string; duration: number; isTemplate?: boolean; isPublic?: boolean; prefilledBookingTypeId?: string; prefilledDateTime?: string; prefilledTimeSlotId?: string }) => { id: string; createdAt: string; updatedAt: string; name: string; description?: string; basePrice: number; duration: number; isTemplate: boolean; isPublic: boolean; usageCount: number; coachId: string; prefilledBookingTypeId?: string; prefilledDateTime?: string; prefilledTimeSlotId?: string };
  };

  "/api/custom-services/{id}": {
    DELETE: (params: { id: string }, body: undefined | never) => void;
    GET: (params: { id: string }, body: undefined | never) => { id: string; createdAt: string; updatedAt: string; name: string; description?: string; basePrice: number; duration: number; isTemplate: boolean; isPublic: boolean; usageCount: number; coachId: string; prefilledBookingTypeId?: string; prefilledDateTime?: string; prefilledTimeSlotId?: string };
    PATCH: (params: { id: string }, body: { name?: string; description?: string; basePrice?: string; duration?: number; isTemplate?: boolean; isPublic?: boolean; prefilledBookingTypeId?: string; prefilledDateTime?: string; prefilledTimeSlotId?: string }) => { id: string; createdAt: string; updatedAt: string; name: string; description?: string; basePrice: number; duration: number; isTemplate: boolean; isPublic: boolean; usageCount: number; coachId: string; prefilledBookingTypeId?: string; prefilledDateTime?: string; prefilledTimeSlotId?: string };
  };

  "/api/custom-services/{id}/save-as-template": {
    POST: (params: { id: string }, body: undefined | never) => { id: string; createdAt: string; updatedAt: string; name: string; description?: string; basePrice: number; duration: number; isTemplate: boolean; isPublic: boolean; usageCount: number; coachId: string; prefilledBookingTypeId?: string; prefilledDateTime?: string; prefilledTimeSlotId?: string };
  };

  "/api/custom-services/{id}/send-to-user": {
    POST: (params: { id: string }, body: { userId: string; message?: string }) => { message: string };
  };

  "/api/discounts": {
    GET: (params: undefined | never, body: undefined | never) => { id: string; createdAt: string; updatedAt: string; code: string; amount: number; expiry: string; useCount: number; maxUsage: number; isActive: boolean; coachId: string; coach?: { id: string; name: string; email: string } }[];
    POST: (params: undefined | never, body: { code: string; amount: string; expiry: string; maxUsage?: number; isActive?: boolean }) => { id: string; createdAt: string; updatedAt: string; code: string; amount: number; expiry: string; useCount: number; maxUsage: number; isActive: boolean; coachId: string; coach?: { id: string; name: string; email: string } };
  };

  "/api/discounts/validate": {
    POST: (params: undefined | never, body: { code: string }) => { code: string; amount: number; isValid: boolean };
  };

  "/api/discounts/{code}": {
    DELETE: (params: { code: string }, body: undefined | never) => void;
    PUT: (params: { code: string }, body: { amount?: string; expiry?: string; maxUsage?: number; isActive?: boolean }) => { id: string; createdAt: string; updatedAt: string; code: string; amount: number; expiry: string; useCount: number; maxUsage: number; isActive: boolean; coachId: string; coach?: { id: string; name: string; email: string } };
  };

  "/api/health": {
    GET: (params: undefined | never, body: undefined | never) => { status: "ok" | "error"; timestamp: string; uptime: number; memory: { rss: number; heapTotal: number; heapUsed: number; external: number; arrayBuffers: number }; version: string; environment: string; database: string };
  };

  "/api/health/liveness": {
    GET: (params: undefined | never, body: undefined | never) => { status: "ok" | "error"; timestamp: string };
  };

  "/api/health/readiness": {
    GET: (params: undefined | never, body: undefined | never) => { status: "ok" | "error"; timestamp: string };
  };

  "/api/messages": {
    GET: (params: { sessionId?: string; conversationWith?: string; conversationId?: string; messageType?: "TEXT" | "CUSTOM_SERVICE" | "BOOKING_REQUEST" }, body: undefined | never) => { id: string; createdAt: string; updatedAt: string; content: string; sentAt: string; senderId: string; receiverId: string; sessionId?: string; senderType: "USER" | "COACH" | "ADMIN"; receiverType: "USER" | "COACH" | "ADMIN"; messageType: "TEXT" | "CUSTOM_SERVICE" | "BOOKING_REQUEST"; customServiceId?: string; conversationId?: string; isRead: boolean; readAt?: string; sender?: { id: string; name: string; email: string }; receiver?: { id: string; name: string; email: string } }[];
    POST: (params: undefined | never, body: { content: string; receiverId: string; sessionId?: string; messageType?: "TEXT" | "CUSTOM_SERVICE" | "BOOKING_REQUEST"; customServiceId?: string }) => { id: string; createdAt: string; updatedAt: string; content: string; sentAt: string; senderId: string; receiverId: string; sessionId?: string; senderType: "USER" | "COACH" | "ADMIN"; receiverType: "USER" | "COACH" | "ADMIN"; messageType: "TEXT" | "CUSTOM_SERVICE" | "BOOKING_REQUEST"; customServiceId?: string; conversationId?: string; isRead: boolean; readAt?: string; sender?: { id: string; name: string; email: string }; receiver?: { id: string; name: string; email: string } };
  };

  "/api/messages/booking-request": {
    POST: (params: undefined | never, body: { bookingTypeId: string; coachId: string; message?: string }) => { id: string; createdAt: string; updatedAt: string; content: string; sentAt: string; senderId: string; receiverId: string; sessionId?: string; senderType: "USER" | "COACH" | "ADMIN"; receiverType: "USER" | "COACH" | "ADMIN"; messageType: "TEXT" | "CUSTOM_SERVICE" | "BOOKING_REQUEST"; customServiceId?: string; conversationId?: string; isRead: boolean; readAt?: string; sender?: { id: string; name: string; email: string }; receiver?: { id: string; name: string; email: string } };
  };

  "/api/messages/conversation/with-user/{userId}": {
    GET: (params: { userId: string }, body: undefined | never) => { id: string; createdAt: string; updatedAt: string; content: string; sentAt: string; senderId: string; receiverId: string; sessionId?: string; senderType: "USER" | "COACH" | "ADMIN"; receiverType: "USER" | "COACH" | "ADMIN"; messageType: "TEXT" | "CUSTOM_SERVICE" | "BOOKING_REQUEST"; customServiceId?: string; conversationId?: string; isRead: boolean; readAt?: string; sender?: { id: string; name: string; email: string }; receiver?: { id: string; name: string; email: string } }[];
  };

  "/api/messages/conversation/{conversationId}": {
    GET: (params: { conversationId: string }, body: undefined | never) => { id: string; createdAt: string; updatedAt: string; content: string; sentAt: string; senderId: string; receiverId: string; sessionId?: string; senderType: "USER" | "COACH" | "ADMIN"; receiverType: "USER" | "COACH" | "ADMIN"; messageType: "TEXT" | "CUSTOM_SERVICE" | "BOOKING_REQUEST"; customServiceId?: string; conversationId?: string; isRead: boolean; readAt?: string; sender?: { id: string; name: string; email: string }; receiver?: { id: string; name: string; email: string } }[];
  };

  "/api/messages/session/{sessionId}": {
    GET: (params: { sessionId?: string; conversationWith?: string; conversationId?: string; messageType?: "TEXT" | "CUSTOM_SERVICE" | "BOOKING_REQUEST" }, body: undefined | never) => { id: string; createdAt: string; updatedAt: string; content: string; sentAt: string; senderId: string; receiverId: string; sessionId?: string; senderType: "USER" | "COACH" | "ADMIN"; receiverType: "USER" | "COACH" | "ADMIN"; messageType: "TEXT" | "CUSTOM_SERVICE" | "BOOKING_REQUEST"; customServiceId?: string; conversationId?: string; isRead: boolean; readAt?: string; sender?: { id: string; name: string; email: string }; receiver?: { id: string; name: string; email: string } }[];
  };

  "/api/messages/{id}": {
    GET: (params: { id: string }, body: undefined | never) => { id: string; createdAt: string; updatedAt: string; content: string; sentAt: string; senderId: string; receiverId: string; sessionId?: string; senderType: "USER" | "COACH" | "ADMIN"; receiverType: "USER" | "COACH" | "ADMIN"; messageType: "TEXT" | "CUSTOM_SERVICE" | "BOOKING_REQUEST"; customServiceId?: string; conversationId?: string; isRead: boolean; readAt?: string; sender?: { id: string; name: string; email: string }; receiver?: { id: string; name: string; email: string } };
  };

  "/api/messages/{id}/read": {
    PATCH: (params: { id: string }, body: { isRead?: boolean }) => { id: string; createdAt: string; updatedAt: string; content: string; sentAt: string; senderId: string; receiverId: string; sessionId?: string; senderType: "USER" | "COACH" | "ADMIN"; receiverType: "USER" | "COACH" | "ADMIN"; messageType: "TEXT" | "CUSTOM_SERVICE" | "BOOKING_REQUEST"; customServiceId?: string; conversationId?: string; isRead: boolean; readAt?: string; sender?: { id: string; name: string; email: string }; receiver?: { id: string; name: string; email: string } };
  };

  "/api/monitoring/database/metrics": {
    GET: (params: undefined | never, body: undefined | never) => { totalQueries: number; slowQueries: number; errorQueries: number; averageQueryTime: number; queryTimesByOperation: string | null; slowQueriesByOperation: string | null };
  };

  "/api/monitoring/health": {
    GET: (params: undefined | never, body: undefined | never) => { apm: boolean; database: boolean; metrics: boolean; timestamp: string };
  };

  "/api/monitoring/performance/summary": {
    GET: (params: undefined | never, body: undefined | never) => { database: { totalQueries: number; averageQueryTime: number; slowQueryPercentage: number; errorRate: number }; system: { totalCoaches: number; activeCoaches: number; totalBookingTypes: number; totalTimeSlots: number; totalDiscounts: number; messageCount: number }; timestamp: string };
  };

  "/api/notifications": {
    GET: (params: { limit?: number; offset?: number; unreadOnly?: boolean; type?: "CUSTOM_SERVICE" | "BOOKING_REMINDER" | "BOOKING_CONFIRMATION" | "ROLE_CHANGE" | "SYSTEM_ANNOUNCEMENT" | "MESSAGE_RECEIVED" }, body: undefined | never) => { notifications: { id: string; type: "CUSTOM_SERVICE" | "BOOKING_REMINDER" | "BOOKING_CONFIRMATION" | "ROLE_CHANGE" | "SYSTEM_ANNOUNCEMENT" | "MESSAGE_RECEIVED"; title: string; message: string; recipientId: string; senderId?: string | null; priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"; channels: "IN_APP" | "EMAIL" | "WEBSOCKET"[]; metadata: string | null; isRead: boolean; readAt?: string | null; scheduledFor?: string | null; sentAt?: string | null; createdAt: string; updatedAt: string }[]; total: number; limit: number; offset: number };
  };

  "/api/notifications/announcement": {
    POST: (params: undefined | never, body: { title: string; message: string; targetRoles?: "USER" | "COACH" | "ADMIN"[]; priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT" }) => { message: string };
  };

  "/api/notifications/confirm": {
    POST: (params: undefined | never, body: { sessionId: string }) => { message: string };
  };

  "/api/notifications/email": {
    POST: (params: undefined | never, body: { to: string; subject: string; text?: string; html?: string }) => { success: boolean; errors?: string[]; message_ids?: string[] };
  };

  "/api/notifications/mark-all-read": {
    PATCH: (params: undefined | never, body: undefined | never) => { markedCount: number };
  };

  "/api/notifications/test-custom-service": {
    POST: (params: undefined | never, body: { recipientId: string; serviceName: string; message?: string }) => { message: string };
  };

  "/api/notifications/unread-count": {
    GET: (params: undefined | never, body: undefined | never) => { count: number };
  };

  "/api/notifications/{id}": {
    DELETE: (params: { id: string }, body: undefined | never) => { message: string };
  };

  "/api/notifications/{id}/read": {
    PATCH: (params: { id: string }, body: undefined | never) => { id: string; type: "CUSTOM_SERVICE" | "BOOKING_REMINDER" | "BOOKING_CONFIRMATION" | "ROLE_CHANGE" | "SYSTEM_ANNOUNCEMENT" | "MESSAGE_RECEIVED"; title: string; message: string; recipientId: string; senderId?: string | null; priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"; channels: "IN_APP" | "EMAIL" | "WEBSOCKET"[]; metadata: string | null; isRead: boolean; readAt?: string | null; scheduledFor?: string | null; sentAt?: string | null; createdAt: string; updatedAt: string };
  };

  "/api/payments/capture-order": {
    POST: (params: undefined | never, body: { orderId: string; sessionId: string }) => { success: boolean; paymentId: string; captureId: string };
  };

  "/api/payments/create-order": {
    POST: (params: undefined | never, body: { sessionId: string; amount: string }) => { orderId: string; approvalUrl?: string };
  };

  "/api/payments/my-payments": {
    GET: (params: undefined | never, body: undefined | never) => { id: string; userId: string; amount: string | null; currency: string; status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED"; paypalOrderId?: string; paypalCaptureId?: string; createdAt: string; updatedAt: string };
  };

  "/api/payments/user/{userId}": {
    GET: (params: { userId: string }, body: undefined | never) => { id: string; userId: string; amount: string | null; currency: string; status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED"; paypalOrderId?: string; paypalCaptureId?: string; createdAt: string; updatedAt: string };
  };

  "/api/payments/{id}": {
    GET: (params: { id: string }, body: undefined | never) => { id: string; userId: string; amount: string | null; currency: string; status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED"; paypalOrderId?: string; paypalCaptureId?: string; createdAt: string; updatedAt: string };
  };

  "/api/payments/{id}/status": {
    PATCH: (params: { id: string }, body: { status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED" }) => { id: string; userId: string; amount: string | null; currency: string; status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED"; paypalOrderId?: string; paypalCaptureId?: string; createdAt: string; updatedAt: string };
  };

  "/api/sessions": {
    GET: (params: { status?: "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW"; startDate?: string; endDate?: string }, body: undefined | never) => { id: string; dateTime: string; durationMin: number; price: number; isPaid: boolean; status?: "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW"; notes?: string; paymentId?: string; discountCode?: string; calendarEventId?: string; createdAt: string; updatedAt: string; userId: string; coachId: string; bookingTypeId: string; timeSlotId: string; discountId?: string; user: { id: string; name: string; email: string }; coach: { id: string; name: string; email: string }; bookingType: { id: string; createdAt: string; updatedAt: string; name: string; description?: string; basePrice: number; isActive: boolean; coachId: string; coach: { id: string; name: string; email: string } }; timeSlot: { id: string; dateTime: string; durationMin: number; isAvailable: boolean; coachId: string; coach: { id: string; name: string; email: string }; createdAt: string; updatedAt: string }; discount?: { id: string; createdAt: string; updatedAt: string; code: string; amount: number; expiry: string; useCount: number; maxUsage: number; isActive: boolean; coachId: string; coach?: { id: string; name: string; email: string } } }[];
    POST: (params: undefined | never, body: { bookingTypeId: string; timeSlotId: string; discountCode?: string; notes?: string }) => { id: string; dateTime: string; durationMin: number; price: number; isPaid: boolean; status?: "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW"; notes?: string; paymentId?: string; discountCode?: string; calendarEventId?: string; createdAt: string; updatedAt: string; userId: string; coachId: string; bookingTypeId: string; timeSlotId: string; discountId?: string; user: { id: string; name: string; email: string }; coach: { id: string; name: string; email: string }; bookingType: { id: string; createdAt: string; updatedAt: string; name: string; description?: string; basePrice: number; isActive: boolean; coachId: string; coach: { id: string; name: string; email: string } }; timeSlot: { id: string; dateTime: string; durationMin: number; isAvailable: boolean; coachId: string; coach: { id: string; name: string; email: string }; createdAt: string; updatedAt: string }; discount?: { id: string; createdAt: string; updatedAt: string; code: string; amount: number; expiry: string; useCount: number; maxUsage: number; isActive: boolean; coachId: string; coach?: { id: string; name: string; email: string } } };
  };

  "/api/sessions/{id}": {
    GET: (params: { id: string }, body: undefined | never) => { id: string; dateTime: string; durationMin: number; price: number; isPaid: boolean; status?: "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW"; notes?: string; paymentId?: string; discountCode?: string; calendarEventId?: string; createdAt: string; updatedAt: string; userId: string; coachId: string; bookingTypeId: string; timeSlotId: string; discountId?: string; user: { id: string; name: string; email: string }; coach: { id: string; name: string; email: string }; bookingType: { id: string; createdAt: string; updatedAt: string; name: string; description?: string; basePrice: number; isActive: boolean; coachId: string; coach: { id: string; name: string; email: string } }; timeSlot: { id: string; dateTime: string; durationMin: number; isAvailable: boolean; coachId: string; coach: { id: string; name: string; email: string }; createdAt: string; updatedAt: string }; discount?: { id: string; createdAt: string; updatedAt: string; code: string; amount: number; expiry: string; useCount: number; maxUsage: number; isActive: boolean; coachId: string; coach?: { id: string; name: string; email: string } } };
    PATCH: (params: { id: string }, body: { notes?: string }) => { id: string; dateTime: string; durationMin: number; price: number; isPaid: boolean; status?: "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW"; notes?: string; paymentId?: string; discountCode?: string; calendarEventId?: string; createdAt: string; updatedAt: string; userId: string; coachId: string; bookingTypeId: string; timeSlotId: string; discountId?: string; user: { id: string; name: string; email: string }; coach: { id: string; name: string; email: string }; bookingType: { id: string; createdAt: string; updatedAt: string; name: string; description?: string; basePrice: number; isActive: boolean; coachId: string; coach: { id: string; name: string; email: string } }; timeSlot: { id: string; dateTime: string; durationMin: number; isAvailable: boolean; coachId: string; coach: { id: string; name: string; email: string }; createdAt: string; updatedAt: string }; discount?: { id: string; createdAt: string; updatedAt: string; code: string; amount: number; expiry: string; useCount: number; maxUsage: number; isActive: boolean; coachId: string; coach?: { id: string; name: string; email: string } } };
    PUT: (params: { id: string }, body: { notes?: string }) => { id: string; dateTime: string; durationMin: number; price: number; isPaid: boolean; status?: "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW"; notes?: string; paymentId?: string; discountCode?: string; calendarEventId?: string; createdAt: string; updatedAt: string; userId: string; coachId: string; bookingTypeId: string; timeSlotId: string; discountId?: string; user: { id: string; name: string; email: string }; coach: { id: string; name: string; email: string }; bookingType: { id: string; createdAt: string; updatedAt: string; name: string; description?: string; basePrice: number; isActive: boolean; coachId: string; coach: { id: string; name: string; email: string } }; timeSlot: { id: string; dateTime: string; durationMin: number; isAvailable: boolean; coachId: string; coach: { id: string; name: string; email: string }; createdAt: string; updatedAt: string }; discount?: { id: string; createdAt: string; updatedAt: string; code: string; amount: number; expiry: string; useCount: number; maxUsage: number; isActive: boolean; coachId: string; coach?: { id: string; name: string; email: string } } };
  };

  "/api/sessions/{id}/cancel": {
    PUT: (params: { id: string }, body: undefined | never) => { id: string; dateTime: string; durationMin: number; price: number; isPaid: boolean; status?: "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW"; notes?: string; paymentId?: string; discountCode?: string; calendarEventId?: string; createdAt: string; updatedAt: string; userId: string; coachId: string; bookingTypeId: string; timeSlotId: string; discountId?: string; user: { id: string; name: string; email: string }; coach: { id: string; name: string; email: string }; bookingType: { id: string; createdAt: string; updatedAt: string; name: string; description?: string; basePrice: number; isActive: boolean; coachId: string; coach: { id: string; name: string; email: string } }; timeSlot: { id: string; dateTime: string; durationMin: number; isAvailable: boolean; coachId: string; coach: { id: string; name: string; email: string }; createdAt: string; updatedAt: string }; discount?: { id: string; createdAt: string; updatedAt: string; code: string; amount: number; expiry: string; useCount: number; maxUsage: number; isActive: boolean; coachId: string; coach?: { id: string; name: string; email: string } } };
  };

  "/api/time-slots": {
    GET: (params: { startDate?: string; endDate?: string; coachId?: string }, body: undefined | never) => { id: string; dateTime: string; durationMin: number; isAvailable: boolean; coachId: string; coach: { id: string; name: string; email: string }; createdAt: string; updatedAt: string }[];
    POST: (params: undefined | never, body: { dateTime: string; durationMin: number; isAvailable: boolean }) => { id: string; dateTime: string; durationMin: number; isAvailable: boolean; coachId: string; coach: { id: string; name: string; email: string }; createdAt: string; updatedAt: string };
  };

  "/api/time-slots/coach/{coachId}": {
    GET: (params: { coachId?: string; startDate?: string; endDate?: string }, body: undefined | never) => { id: string; dateTime: string; durationMin: number; isAvailable: boolean; coachId: string; coach: { id: string; name: string; email: string }; createdAt: string; updatedAt: string }[];
  };

  "/api/time-slots/{id}": {
    DELETE: (params: { id: string }, body: undefined | never) => void;
    GET: (params: { id: string }, body: undefined | never) => { id: string; dateTime: string; durationMin: number; isAvailable: boolean; coachId: string; coach: { id: string; name: string; email: string }; createdAt: string; updatedAt: string };
    PATCH: (params: { id: string }, body: { dateTime: string; durationMin: number; isAvailable: boolean }) => { id: string; dateTime: string; durationMin: number; isAvailable: boolean; coachId: string; coach: { id: string; name: string; email: string }; createdAt: string; updatedAt: string };
  };
}

/**
 * Utility types are exported from @api-sdk
 * Import them using: import { ExtractPaths, ExtractMethods, ... } from '@api-sdk';
 */
