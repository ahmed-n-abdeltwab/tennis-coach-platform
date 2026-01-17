/**
 * Booking Service
 *
 * Provides type-safe booking type operations using the ApiClient.
 * Handles fetching, creating, updating, and deleting booking types.
 *
 * @example
 * import { bookingService } from './booking.service';
 *
 * // Get all booking types
 * const bookingTypes = await bookingService.getBookingTypes();
 *
 * // Get booking types for a specific coach
 * const coachTypes = await bookingService.getBookingTypesByCoach('coach-123');
 */

import { apiClient } from '../../config/api-client';

import { handleApiError } from './error-handler';
import type {
  BookingType,
  BookingTypeCreateRequest,
  BookingTypeList,
  BookingTypeUpdateRequest,
} from './types';

/**
 * Booking service for managing booking types.
 *
 * All methods throw AppError on failure, which can be caught and displayed to users.
 */
export const bookingService = {
  /**
   * Retrieves all booking types.
   *
   * @returns Array of all booking types
   * @throws AppError if request fails
   *
   * @example
   * const bookingTypes = await bookingService.getBookingTypes();
   * bookingTypes.forEach(bt => {
   *   console.log(`${bt.name}: $${bt.basePrice}`);
   * });
   */
  async getBookingTypes(): Promise<BookingTypeList> {
    const response = await apiClient.get('/api/booking-types');

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Retrieves booking types for a specific coach.
   *
   * @param coachId - The coach's account ID
   * @returns Array of booking types offered by the coach
   * @throws AppError if request fails
   *
   * @example
   * const coachTypes = await bookingService.getBookingTypesByCoach('coach-123');
   * console.log(`Coach offers ${coachTypes.length} services`);
   */
  async getBookingTypesByCoach(coachId: string): Promise<BookingTypeList> {
    const response = await apiClient.get('/api/booking-types/coach/{coachId}', {
      params: { coachId },
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Retrieves a specific booking type by ID.
   *
   * @param id - The booking type ID
   * @returns The booking type details
   * @throws AppError if booking type not found or request fails
   *
   * @example
   * const bookingType = await bookingService.getBookingType('bt-123');
   * console.log(`${bookingType.name}: ${bookingType.description}`);
   */
  async getBookingType(id: string): Promise<BookingType> {
    const response = await apiClient.get('/api/booking-types/{id}', {
      params: { id },
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Creates a new booking type.
   *
   * Only coaches can create booking types.
   *
   * @param data - Booking type creation data
   * @returns The created booking type
   * @throws AppError if creation fails
   *
   * @example
   * const newType = await bookingService.createBookingType({
   *   name: 'Private Lesson',
   *   description: 'One-on-one coaching session',
   *   basePrice: 75
   * });
   */
  async createBookingType(data: BookingTypeCreateRequest): Promise<BookingType> {
    const response = await apiClient.post('/api/booking-types', {
      body: data,
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Updates an existing booking type.
   *
   * @param id - The booking type ID to update
   * @param data - The fields to update
   * @returns The updated booking type
   * @throws AppError if update fails
   *
   * @example
   * const updated = await bookingService.updateBookingType('bt-123', {
   *   basePrice: 80,
   *   description: 'Updated description'
   * });
   */
  async updateBookingType(id: string, data: BookingTypeUpdateRequest): Promise<BookingType> {
    const response = await apiClient.patch('/api/booking-types/{id}', {
      params: { id },
      body: data,
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Deletes a booking type.
   *
   * @param id - The booking type ID to delete
   * @throws AppError if deletion fails
   *
   * @example
   * await bookingService.deleteBookingType('bt-123');
   * console.log('Booking type deleted');
   */
  async deleteBookingType(id: string): Promise<void> {
    const response = await apiClient.delete('/api/booking-types/{id}', {
      params: { id },
    });

    if (!response.ok) {
      throw handleApiError(response);
    }
  },
};

export default bookingService;
