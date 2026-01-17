/**
 * Error Handling Utilities for API Services
 *
 * This module provides utilities for handling API errors in a consistent way
 * across the application. It transforms ApiErrorResponse objects into
 * user-friendly AppError objects.
 *
 * @example
 * import { handleApiError, isAuthError } from './error-handler';
 *
 * try {
 *   const response = await apiClient.get('/api/sessions');
 *   if (!response.ok) {
 *     throw handleApiError(response);
 *   }
 * } catch (error) {
 *   if (isAuthError(error)) {
 *     // Redirect to login
 *   }
 * }
 */

import type { ApiErrorResponse } from '../../config/api-client';

/**
 * Application error interface for consistent error handling.
 * Provides a user-friendly message and additional context.
 */
export interface AppError {
  /** User-friendly error message */
  message: string;
  /** Error code from the server (e.g., 'UNAUTHORIZED', 'NOT_FOUND') */
  code?: string;
  /** HTTP status code */
  statusCode: number;
  /** Original error response for debugging */
  originalError?: ApiErrorResponse;
}

/**
 * HTTP status codes for common error types.
 */
const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  NETWORK_ERROR: 0,
} as const;

/**
 * Transforms an ApiErrorResponse into a user-friendly AppError.
 *
 * Handles various error message formats from the backend:
 * - Single string message
 * - Array of validation messages
 * - Nested error objects
 *
 * @param error - The API error response to transform
 * @returns An AppError object with a user-friendly message
 *
 * @example
 * const response = await apiClient.post('/api/authentication/login', { body: credentials });
 * if (!response.ok) {
 *   const appError = handleApiError(response);
 *   showNotification('error', appError.message);
 * }
 */
export function handleApiError(error: ApiErrorResponse): AppError {
  const { error: apiError, status } = error;

  // Extract message from various error formats
  let message: string;

  if (Array.isArray(apiError.message)) {
    // Validation errors often come as an array
    message = apiError.message.join(', ');
  } else if (typeof apiError.message === 'string') {
    message = apiError.message;
  } else {
    // Fallback for unexpected formats
    message = 'An unexpected error occurred';
  }

  // Provide user-friendly messages for common errors
  if (status === HTTP_STATUS.NETWORK_ERROR) {
    message = 'Unable to connect to the server. Please check your internet connection.';
  } else if (status === HTTP_STATUS.UNAUTHORIZED) {
    message = message || 'Your session has expired. Please log in again.';
  } else if (status === HTTP_STATUS.FORBIDDEN) {
    message = message || 'You do not have permission to perform this action.';
  } else if (status === HTTP_STATUS.NOT_FOUND) {
    message = message || 'The requested resource was not found.';
  } else if (status >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    message = 'A server error occurred. Please try again later.';
  }

  return {
    message,
    code: apiError.error,
    statusCode: status,
    originalError: error,
  };
}

/**
 * Checks if an error is a network error (no response from server).
 *
 * Network errors occur when:
 * - The server is unreachable
 * - The request times out
 * - There's no internet connection
 *
 * @param error - The API error response to check
 * @returns True if the error is a network error
 */
export function isNetworkError(error: ApiErrorResponse): boolean {
  return error.status === HTTP_STATUS.NETWORK_ERROR;
}

/**
 * Checks if an error is an authentication error (401 Unauthorized).
 *
 * Auth errors occur when:
 * - The access token is missing or invalid
 * - The access token has expired
 * - The user is not authenticated
 *
 * @param error - The API error response to check
 * @returns True if the error is an authentication error
 */
export function isAuthError(error: ApiErrorResponse): boolean {
  return error.status === HTTP_STATUS.UNAUTHORIZED;
}

/**
 * Checks if an error is a validation error (400 Bad Request or 422 Unprocessable Entity).
 *
 * Validation errors occur when:
 * - Required fields are missing
 * - Field values are invalid
 * - Business rules are violated
 *
 * @param error - The API error response to check
 * @returns True if the error is a validation error
 */
export function isValidationError(error: ApiErrorResponse): boolean {
  return (
    error.status === HTTP_STATUS.BAD_REQUEST || error.status === HTTP_STATUS.UNPROCESSABLE_ENTITY
  );
}

/**
 * Checks if an error is a forbidden error (403 Forbidden).
 *
 * Forbidden errors occur when:
 * - The user doesn't have the required role
 * - The user doesn't have permission for the resource
 *
 * @param error - The API error response to check
 * @returns True if the error is a forbidden error
 */
export function isForbiddenError(error: ApiErrorResponse): boolean {
  return error.status === HTTP_STATUS.FORBIDDEN;
}

/**
 * Checks if an error is a not found error (404 Not Found).
 *
 * @param error - The API error response to check
 * @returns True if the error is a not found error
 */
export function isNotFoundError(error: ApiErrorResponse): boolean {
  return error.status === HTTP_STATUS.NOT_FOUND;
}

/**
 * Checks if an error is a server error (5xx status codes).
 *
 * @param error - The API error response to check
 * @returns True if the error is a server error
 */
export function isServerError(error: ApiErrorResponse): boolean {
  return error.status >= HTTP_STATUS.INTERNAL_SERVER_ERROR;
}

/**
 * Type guard to check if an unknown error is an AppError.
 *
 * @param error - The error to check
 * @returns True if the error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    'statusCode' in error &&
    typeof (error as AppError).message === 'string' &&
    typeof (error as AppError).statusCode === 'number'
  );
}
