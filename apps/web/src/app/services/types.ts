/**
 * Shared TypeScript Types for API Services
 *
 * This module extracts and re-exports types from the auto-generated Endpoints interface
 * in @contracts. These types provide compile-time type safety for all API interactions.
 *
 * Types are derived directly from the Endpoints interface to ensure they stay in sync
 * with the backend API contract.
 *
 * @example
 * import { Account, Session, BookingType } from './types';
 *
 * const account: Account = await authService.getCurrentAccount();
 * const sessions: Session[] = await sessionService.getSessions();
 */

import type { Endpoints } from '@contracts';

// ============================================================================
// Type Extraction Utilities
// ============================================================================

/**
 * Extracts the response type from an Endpoints path and method.
 * This utility type unwraps the function return type from the Endpoints interface.
 */
type EndpointResponse<
  Path extends keyof Endpoints,
  Method extends keyof Endpoints[Path],
> = Endpoints[Path][Method] extends (params: infer _P, body: infer _B) => infer R ? R : never;

/**
 * Extracts the request body type from an Endpoints path and method.
 */
type EndpointRequestBody<
  Path extends keyof Endpoints,
  Method extends keyof Endpoints[Path],
> = Endpoints[Path][Method] extends (params: infer _P, body: infer B) => infer _R ? B : never;

// ============================================================================
// Account Types
// ============================================================================

/**
 * Account entity representing a user in the syst
cludes profile information and role-based access control.
 */
export type Account = EndpointResponse<'/api/accounts/me', 'GET'>;

/**
 * Account role enum values.
 * - USER: Standard user with basic access
 * - ADMIN: Administrator with full system access
 * - COACH: Coach with ability to manage sessions, time slots, and booking types
 */
export type AccountRole = Account['role'];

/**
 * Account gender options.
 */
export type AccountGender = NonNullable<Account['gender']>;

/**
 * Account list response type.
 */
export type AccountList = EndpointResponse<'/api/accounts', 'GET'>;

/**
 * Account update request body type.
 */
export type AccountUpdateRequest = EndpointRequestBody<'/api/accounts/{id}', 'PATCH'>;

/**
 * Account role update request body type.
 */
export type AccountRoleUpdateRequest = EndpointRequestBody<'/api/accounts/{id}/role', 'PATCH'>;

// ============================================================================
// Authentication Types
// ============================================================================

/**
 * Login response containing tokens and account info.
 */
export type LoginResponse = EndpointResponse<'/api/authentication/login', 'POST'>;

/**
 * Signup response containing tokens and account info.
 */
export type SignupResponse = EndpointResponse<'/api/authentication/signup', 'POST'>;

/**
 * Token refresh response.
 */
export type RefreshResponse = EndpointResponse<'/api/authentication/refresh', 'POST'>;

/**
 * Auth account type - the minimal account info returned from auth endpoints.
 * This is a subset of the full Account type.
 */
export type AuthAccount = LoginResponse['account'];

/**
 * Logout response.
 */
export type LogoutResponse = EndpointResponse<'/api/authentication/logout', 'POST'>;

/**
 * Login request body type.
 */
export type LoginRequest = EndpointRequestBody<'/api/authentication/login', 'POST'>;

/**
 * Signup request body type.
 */
export type SignupRequest = EndpointRequestBody<'/api/authentication/signup', 'POST'>;

// ============================================================================
// Session Types
// ============================================================================

/**
 * Session entity representing a coaching session booking.
 * Includes booking details, payment status, and related entities.
 */
export type Session = EndpointResponse<'/api/sessions', 'GET'>[number];

/**
 * Session status enum values.
 * - SCHEDULED: Session is booked but not yet confirmed
 * - CONFIRMED: Session is confirmed by both parties
 * - COMPLETED: Session has been completed
 * - CANCELLED: Session was cancelled
 * - NO_SHOW: User did not attend the session
 */
export type SessionStatus = NonNullable<Session['status']>;

/**
 * Session list response type.
 */
export type SessionList = EndpointResponse<'/api/sessions', 'GET'>;

/**
 * Session create request body type.
 */
export type SessionCreateRequest = EndpointRequestBody<'/api/sessions', 'POST'>;

/**
 * Session update request body type.
 */
export type SessionUpdateRequest = EndpointRequestBody<'/api/sessions/{id}', 'PATCH'>;

// ============================================================================
// Booking Type Types
// ============================================================================

/**
 * BookingType entity representing a type of coaching service.
 * Includes pricing and coach association.
 */
export type BookingType = EndpointResponse<'/api/booking-types', 'GET'>[number];

/**
 * Booking type list response type.
 */
export type BookingTypeList = EndpointResponse<'/api/booking-types', 'GET'>;

/**
 * Booking type create request body type.
 */
export type BookingTypeCreateRequest = EndpointRequestBody<'/api/booking-types', 'POST'>;

/**
 * Booking type update request body type.
 */
export type BookingTypeUpdateRequest = EndpointRequestBody<'/api/booking-types/{id}', 'PATCH'>;

// ============================================================================
// Time Slot Types
// ============================================================================

/**
 * TimeSlot entity representing an available time slot for booking.
 * Includes availability status and coach association.
 */
export type TimeSlot = EndpointResponse<'/api/time-slots', 'GET'>[number];

/**
 * Time slot list response type.
 */
export type TimeSlotList = EndpointResponse<'/api/time-slots', 'GET'>;

/**
 * Time slot create request body type.
 */
export type TimeSlotCreateRequest = EndpointRequestBody<'/api/time-slots', 'POST'>;

/**
 * Time slot update request body type.
 */
export type TimeSlotUpdateRequest = EndpointRequestBody<'/api/time-slots/{id}', 'PATCH'>;

// ============================================================================
// Message Types
// ============================================================================

/**
 * Message entity representing a chat message between users.
 * Includes sender/receiver info and optional session association.
 */
export type Message = EndpointResponse<'/api/messages', 'GET'>[number];

/**
 * Message sender/receiver type (same as AccountRole).
 */
export type MessageUserType = Message['senderType'];

/**
 * Message list response type.
 */
export type MessageList = EndpointResponse<'/api/messages', 'GET'>;

/**
 * Message create request body type.
 */
export type MessageCreateRequest = EndpointRequestBody<'/api/messages', 'POST'>;

// ============================================================================
// Discount Types
// ============================================================================

/**
 * Discount entity representing a discount code.
 * Includes usage tracking and coach association.
 */
export type Discount = EndpointResponse<'/api/discounts', 'GET'>[number];

/**
 * Discount validation response type.
 */
export type DiscountValidation = EndpointResponse<'/api/discounts/validate', 'POST'>;

/**
 * Discount list response type.
 */
export type DiscountList = EndpointResponse<'/api/discounts', 'GET'>;

/**
 * Discount create request body type.
 */
export type DiscountCreateRequest = EndpointRequestBody<'/api/discounts', 'POST'>;

/**
 * Discount update request body type.
 */
export type DiscountUpdateRequest = EndpointRequestBody<'/api/discounts/{code}', 'PUT'>;

/**
 * Discount validation request body type.
 */
export type DiscountValidateRequest = EndpointRequestBody<'/api/discounts/validate', 'POST'>;

// ============================================================================
// Custom Service Types (Re-export from custom-service.service)
// ============================================================================

export type {
  CreateCustomServiceRequest,
  CustomService,
  GetCustomServicesQuery,
  SendCustomServiceRequest,
  UpdateCustomServiceRequest,
} from './custom-service.service';

/**
 * Account role constants for type-safe role checks.
 */
export const ACCOUNT_ROLES = {
  USER: 'USER',
  ADMIN: 'ADMIN',
  COACH: 'COACH',
} as const;

/**
 * Session status constants for type-safe status checks.
 */
export const SESSION_STATUSES = {
  SCHEDULED: 'SCHEDULED',
  CONFIRMED: 'CONFIRMED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
} as const;
