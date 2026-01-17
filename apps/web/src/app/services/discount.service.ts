/**
 * Discount Service
 *
 * Provides type-safe discount operations using the ApiClient.
 * Handles fetching, creating, updating, deleting, and validating discount codes.
 *
 * @example
 * import { discountService } from './discount.service';
 *
 * // Get all discounts
 * const discounts = await discountService.getDiscounts();
 *
 * // Validate a discount code
 * const validation = await discountService.validateDiscount('SAVE10');
 */

import { apiClient } from '../../config/api-client';

import { handleApiError } from './error-handler';
import type {
  Discount,
  DiscountCreateRequest,
  DiscountList,
  DiscountUpdateRequest,
  DiscountValidation,
} from './types';

/**
 * Discount service for managing discount codes.
 *
 * All methods throw AppError on failure, which can be caught and displayed to users.
 */
export const discountService = {
  /**
   * Retrieves all discounts for the current coach.
   *
   * @returns Array of discount codes
   * @throws AppError if request fails
   *
   * @example
   * const discounts = await discountService.getDiscounts();
   * discounts.forEach(d => {
   *   console.log(`${d.code}: ${d.amount}% off`);
   * });
   */
  async getDiscounts(): Promise<DiscountList> {
    const response = await apiClient.get('/api/discounts');

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Creates a new discount code.
   *
   * Only coaches can create discount codes.
   *
   * @param data - Discount creation data
   * @returns The created discount
   * @throws AppError if creation fails
   *
   * @example
   * const newDiscount = await discountService.createDiscount({
   *   code: 'SUMMER2024',
   *   amount: 15,
   *   expiry: '2024-08-31T23:59:59Z',
   *   maxUsage: 100,
   *   isActive: true
   * });
   */
  async createDiscount(data: DiscountCreateRequest): Promise<Discount> {
    const response = await apiClient.post('/api/discounts', {
      body: data,
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Updates an existing discount code.
   *
   * @param code - The discount code to update
   * @param data - The fields to update
   * @returns The updated discount
   * @throws AppError if update fails
   *
   * @example
   * const updated = await discountService.updateDiscount('SUMMER2024', {
   *   amount: 20,
   *   isActive: false
   * });
   */
  async updateDiscount(code: string, data: DiscountUpdateRequest): Promise<Discount> {
    const response = await apiClient.put('/api/discounts/{code}', {
      params: { code },
      body: data,
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Deletes a discount code.
   *
   * @param code - The discount code to delete
   * @throws AppError if deletion fails
   *
   * @example
   * await discountService.deleteDiscount('SUMMER2024');
   * console.log('Discount deleted');
   */
  async deleteDiscount(code: string): Promise<void> {
    const response = await apiClient.delete('/api/discounts/{code}', {
      params: { code },
    });

    if (!response.ok) {
      throw handleApiError(response);
    }
  },

  /**
   * Validates a discount code.
   *
   * Checks if the code is valid, not expired, and has remaining uses.
   *
   * @param code - The discount code to validate
   * @returns Validation result with code, amount, and validity status
   * @throws AppError if validation request fails
   *
   * @example
   * const validation = await discountService.validateDiscount('SAVE10');
   * if (validation.isValid) {
   *   console.log(`Discount valid: ${validation.amount}% off`);
   * } else {
   *   console.log('Invalid or expired discount code');
   * }
   */
  async validateDiscount(code: string): Promise<DiscountValidation> {
    const response = await apiClient.post('/api/discounts/validate', {
      body: { code },
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },
};

export default discountService;
