/**
 * Account Service
 *
 * Provides type-safe account operations using the ApiClient.
 * Handles fetching, updating, and filtering accounts.
 *
 * @example
 * import { accountService } from './account.service';
 *
 * // Get all coaches
 * const coaches = await accountService.getCoaches();
 *
 * // Get specific account
 * const account = await accountService.getAccount('account-id');
 */

import { apiClient } from '../../config/api-client';

import { handleApiError } from './error-handler';
import type { Account, AccountList, AccountRoleUpdateRequest, AccountUpdateRequest } from './types';

/**
 * Account service for managing user accounts.
 *
 * All methods throw AppError on failure, which can be caught and displayed to users.
 */
export const accountService = {
  /**
   * Retrieves all accounts.
   *
   * @returns Array of all accounts
   * @throws AppError if request fails
   *
   * @example
   * const accounts = await accountService.getAccounts();
   * console.log(`Found ${accounts.length} accounts`);
   */
  async getAccounts(): Promise<AccountList> {
    const response = await apiClient.get('/api/accounts');

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Retrieves a specific account by ID.
   *
   * @param id - The account ID
   * @returns The account information
   * @throws AppError if account not found or request fails
   *
   * @example
   * const account = await accountService.getAccount('coach-123');
   * console.log(`Coach: ${account.name}`);
   */
  async getAccount(id: string): Promise<Account> {
    const response = await apiClient.get('/api/accounts/{id}', {
      params: { id },
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Updates an account's information.
   *
   * @param id - The account ID to update
   * @param data - The fields to update
   * @returns The updated account
   * @throws AppError if update fails
   *
   * @example
   * const updated = await accountService.updateAccount('account-123', {
   *   name: 'New Name',
   *   bio: 'Updated bio'
   * });
   */
  async updateAccount(id: string, data: AccountUpdateRequest): Promise<Account> {
    const response = await apiClient.patch('/api/accounts/{id}', {
      params: { id },
      body: data,
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Retrieves all accounts with the COACH role.
   *
   * Uses the public /api/accounts/coaches endpoint that doesn't require authentication.
   *
   * @returns Array of coach accounts
   * @throws AppError if request fails
   *
   * @example
   * const coaches = await accountService.getCoaches();
   * coaches.forEach(coach => {
   *   console.log(`${coach.name} - ${coach.credentials}`);
   * });
   */
  async getCoaches(): Promise<AccountList> {
    const response = await apiClient.get('/api/accounts/coaches');

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Retrieves a specific coach by ID (public endpoint).
   *
   * @param id - The coach ID
   * @returns The coach account information
   * @throws AppError if coach not found or request fails
   *
   * @example
   * const coach = await accountService.getCoach('coach-123');
   * console.log(`Coach: ${coach.name}`);
   */
  async getCoach(id: string): Promise<Account> {
    const response = await apiClient.get('/api/accounts/coaches/{id}', {
      params: { id },
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Updates an account's role (admin only).
   *
   * @param id - The account ID to update
   * @param data - The role update data
   * @returns The updated account
   * @throws AppError if update fails
   *
   * @example
   * const updated = await accountService.updateRole('account-123', {
   *   role: 'COACH'
   * });
   */
  async updateRole(id: string, data: AccountRoleUpdateRequest): Promise<Account> {
    const response = await apiClient.patch('/api/accounts/{id}/role', {
      params: { id },
      body: data,
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Changes the current user's password.
   *
   * @param data - The password change data
   * @returns Success message
   * @throws AppError if password change fails
   *
   * @example
   * await accountService.changePassword({
   *   currentPassword: 'oldPassword123',
   *   newPassword: 'newPassword456!'
   * });
   */
  async changePassword(data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ message: string }> {
    const response = await apiClient.post('/api/authentication/change-password', {
      body: data,
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Checks profile completeness for an account.
   *
   * @param id - The account ID to check
   * @returns Profile completeness information
   * @throws AppError if request fails
   *
   * @example
   * const completeness = await accountService.getProfileCompleteness('account-123');
   * if (!completeness.isComplete) {
   *   console.log('Missing fields:', completeness.missingFields);
   * }
   */
  async getProfileCompleteness(id: string): Promise<{
    isComplete: boolean;
    completionPercentage: number;
    missingFields: string[];
    requiredFields: string[];
    roleSpecificFields?: string[];
  }> {
    const response = await apiClient.get('/api/accounts/{id}/profile/completeness', {
      params: { id },
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Bulk update account profile fields.
   *
   * @param id - The account ID to update
   * @param data - The fields to update
   * @returns The updated account
   * @throws AppError if update fails
   *
   * @example
   * const updated = await accountService.bulkUpdateProfile('account-123', {
   *   name: 'New Name',
   *   address: 'New Address',
   *   country: 'New Country'
   * });
   */
  async bulkUpdateProfile(
    id: string,
    data: {
      name?: string;
      email?: string;
      gender?: 'male' | 'female' | 'other';
      age?: number;
      height?: number;
      weight?: number;
      country?: string;
      address?: string;
      bio?: string;
      credentials?: string;
      philosophy?: string;
      disability?: boolean;
      disabilityCause?: string;
      notes?: string;
    }
  ): Promise<Account> {
    const response = await apiClient.patch('/api/accounts/{id}/profile/bulk-update', {
      params: { id },
      body: data,
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Uploads a profile image for an account.
   *
   * @param id - The account ID
   * @param imageUrl - The image URL to set
   * @returns The updated account
   * @throws AppError if upload fails
   *
   * @example
   * const updated = await accountService.uploadProfileImage('account-123', 'https://example.com/image.jpg');
   */
  async uploadProfileImage(id: string, imageUrl: string): Promise<Account> {
    const response = await apiClient.post('/api/accounts/{id}/profile/upload-image', {
      params: { id },
      body: { imageUrl },
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },
};

export default accountService;
