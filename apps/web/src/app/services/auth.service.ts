/**
 * Authentication Service
 *
 * Provides type-safe authentication operations using the ApiClient.
 * Handles login, signup, logout, token refresh, and current account retrieval.
 *
 * @example
 * import { authService } from './auth.service';
 *
 * // Login
 * const response = await authService.login('user@example.com', 'password123');
 *
 * // Get current account
 * const account = await authService.getCurrentAccount();
 */

import { apiClient } from '../../config/api-client';

import { handleApiError } from './error-handler';
import type { Account, LoginResponse, RefreshResponse, SignupResponse } from './types';

/**
 * Authentication service for managing user authentication.
 *
 * All methods throw AppError on failure, which can be caught and displayed to users.
 */
export const authService = {
  /**
   * Authenticates a user with email and password.
   *
   * @param email - User's email address
   * @param password - User's password
   * @returns Login response containing tokens and account info
   * @throws AppError if authentication fails
   *
   * @example
   * try {
   *   const { accessToken, refreshToken, account } = await authService.login(email, password);
   *   apiClient.setAuthToken(accessToken);
   * } catch (error) {
   *   showNotification('error', error.message);
   * }
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await apiClient.post('/api/authentication/login', {
      body: { email, password },
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Registers a new user account.
   * All new registrations are assigned USER role by default.
   *
   * @param email - User's email address
   * @param password - User's password
   * @param name - User's display name
   * @returns Signup response containing tokens and account info
   * @throws AppError if registration fails
   *
   * @example
   * try {
   *   const { accessToken, account } = await authService.signup(
   *     'user@example.com',
   *     'password123',
   *     'John Doe'
   *   );
   * } catch (error) {
   *   showNotification('error', error.message);
   * }
   */
  async signup(email: string, password: string, name: string): Promise<SignupResponse> {
    const response = await apiClient.post('/api/authentication/signup', {
      body: { email, password, name },
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Logs out the current user.
   *
   * Invalidates the current session on the server.
   *
   * @throws AppError if logout fails
   *
   * @example
   * try {
   *   await authService.logout();
   *   apiClient.clearAuthToken();
   * } catch (error) {
   *   // Still clear local state even if server logout fails
   *   apiClient.clearAuthToken();
   * }
   */
  async logout(): Promise<void> {
    const response = await apiClient.post('/api/authentication/logout');

    if (!response.ok) {
      throw handleApiError(response);
    }
  },

  /**
   * Refreshes the authentication tokens.
   *
   * Uses the refresh token (sent via cookie) to obtain new access and refresh tokens.
   *
   * @returns Refresh response containing new tokens and account info
   * @throws AppError if token refresh fails
   *
   * @example
   * try {
   *   const { accessToken, refreshToken, account } = await authService.refreshToken();
   *   apiClient.setAuthToken(accessToken);
   * } catch (error) {
   *   // Refresh failed, redirect to login
   *   navigate('/login');
   * }
   */
  async refreshToken(): Promise<RefreshResponse> {
    const response = await apiClient.post('/api/authentication/refresh');

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Retrieves the current authenticated user's account.
   *
   * @returns The current user's account information
   * @throws AppError if not authenticated or request fails
   *
   * @example
   * try {
   *   const account = await authService.getCurrentAccount();
   *   console.log(`Logged in as ${account.name} (${account.role})`);
   * } catch (error) {
   *   // Not authenticated
   *   navigate('/login');
   * }
   */
  async getCurrentAccount(): Promise<Account> {
    const response = await apiClient.get('/api/accounts/me');

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },
};

export default authService;
