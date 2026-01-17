/**
 * Services Index
 *
 * Re-exports all service modules for convenient imports.
 *
 * @example
 * import { authService, sessionService, bookingService } from './services';
 *
 * // Or import specific services
 * import { authService } from './services/auth.service';
 */

// Services
export { accountService } from './account.service';
export {
  analyticsService,
  type CustomServiceStats,
  type DashboardAnalytics,
  type ExportAnalyticsQuery,
  type FinancialAnalytics,
  type GetAnalyticsQuery,
  type PlatformGrowth,
  type SessionMetrics,
  type SystemMetrics,
  type UserStatistics,
} from './analytics.service';
export { authService } from './auth.service';
export { bookingService } from './booking.service';
export { conversationService, type ConversationSummary } from './conversation.service';
export { customServiceService } from './custom-service.service';
export { discountService } from './discount.service';
export { messageService, type MessageFilters } from './message.service';
export {
  notificationService,
  type Notification,
  type NotificationFilters,
} from './notification.service';
export { sessionService, type SessionFilters } from './session.service';
export { socketService } from './socket.service';
export { timeSlotService, type TimeSlotFilters } from './timeslot.service';

// Error handling utilities
export {
  handleApiError,
  isAppError,
  isAuthError,
  isForbiddenError,
  isNetworkError,
  isNotFoundError,
  isServerError,
  isValidationError,
  type AppError,
} from './error-handler';

// Types
export type {
  // Account types
  Account,
  AccountGender,
  AccountList,
  AccountRole,
  AccountUpdateRequest,
  // Booking types
  BookingType,
  BookingTypeCreateRequest,
  BookingTypeList,
  BookingTypeUpdateRequest,
  CreateCustomServiceRequest,
  // Custom service types
  CustomService,
  // Discount types
  Discount,
  DiscountCreateRequest,
  DiscountList,
  DiscountUpdateRequest,
  DiscountValidateRequest,
  DiscountValidation,
  GetCustomServicesQuery,
  LoginRequest,
  // Auth types
  LoginResponse,
  LogoutResponse,
  // Message types
  Message,
  MessageCreateRequest,
  MessageList,
  MessageUserType,
  RefreshResponse,
  SendCustomServiceRequest,
  // Session types
  Session,
  SessionCreateRequest,
  SessionList,
  SessionStatus,
  SessionUpdateRequest,
  SignupRequest,
  SignupResponse,
  // Time slot types
  TimeSlot,
  TimeSlotCreateRequest,
  TimeSlotList,
  TimeSlotUpdateRequest,
  UpdateCustomServiceRequest,
} from './types';

// Constants
export { ACCOUNT_ROLES, SESSION_STATUSES } from './types';
