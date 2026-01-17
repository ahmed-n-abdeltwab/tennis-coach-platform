/**
 * API Client Configuration
 *
 * This module provides a singleton ApiClient instance from @api-sdk
 * configured with environment-based settings for the Tennis Coach Platform.
 *
 * The ApiClient provides type-safe HTTP requests with compile-time validation
 * of paths, methods, request data, and response types based on the Endpoints interface.
 *
 * @example
 * import { apiClient } from '../config/api-client';
 *
 * // Type-safe GET request
 * const response = await apiClient.get('/api/sessions');
 * if (response.ok) {
 *   console.log(response.data); // Typed as Session[]
 * }
 */

import { ApiClient } from '@api-sdk';

import { API_CONFIG } from './api.config';

/**
 * Storage keys for authentication data.
 */
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  ACCOUNT: 'account',
} as const;

/**
 * Headers to disable caching in development mode.
 * This ensures fresh data is always fetched during testing.
 */
const developmentHeaders: Record<string, string> = import.meta.env.DEV
  ? {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    }
  : {};

/**
 * Singleton ApiClient instance configured for the Tennis Coach Platform.
 *
 * Configuration:
 * - baseURL: Read from VITE_API_URL environment variable (defaults to localhost:3333)
 * - timeout: 30 seconds (from API_CONFIG)
 * - withCredentials: true (enables cookie-based authentication)
 * - headers: Cache-disabling headers in development mode
 */
export const apiClient = new ApiClient({
  baseURL: API_CONFIG.baseUrl,
  timeout: API_CONFIG.timeout,
  withCredentials: true,
  headers: developmentHeaders,
});

/**
 * Handle 401 Unauthorized responses by clearing auth state and redirecting to login.
 * This ensures users are logged out when their JWT expires or becomes invalid.
 */
apiClient.onUnauthorizedResponse(() => {
  // Clear auth data from localStorage
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.ACCOUNT);

  // Clear auth token from API client
  apiClient.clearAuthToken();

  // Redirect to login page (only if not already on login page)
  if (!window.location.pathname.includes('/login')) {
    window.location.href = '/login';
  }
});

/**
 * Handle 403 Forbidden responses.
 * This occurs when the user doesn't have permission to access a resource.
 */
apiClient.onForbiddenResponse(path => {
  console.warn(`Access denied to: ${path}`);
  // Could show a toast notification here if a toast system is available
});

/**
 * Handle 404 Not Found responses.
 * This occurs when the requested resource doesn't exist.
 */
apiClient.onNotFoundResponse(path => {
  console.warn(`Resource not found: ${path}`);
  // Could show a toast notification here if a toast system is available
});

/**
 * Handle 5xx Server Error responses.
 * This occurs when there's an internal server error.
 */
apiClient.onServerErrorResponse((status, message) => {
  console.error(`Server error (${status}): ${message}`);
  // Could show a toast notification here if a toast system is available
});

/**
 * Handle network errors (no response received).
 * This occurs when the server is unreachable or there's a connection issue.
 */
apiClient.onNetworkErrorResponse(message => {
  console.error(`Network error: ${message}`);
  // Could show a toast notification here if a toast system is available
});

/**
 * Re-export types from @api-sdk for convenience
 */
export type {
  ApiErrorResponse,
  ApiRequestOptions,
  ApiResponse,
  ApiSuccessResponse,
} from '@api-sdk';
