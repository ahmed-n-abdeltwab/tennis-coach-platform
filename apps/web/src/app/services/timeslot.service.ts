/**
 * Time Slot Service
 *
 * Provides type-safe time slot operations using the ApiClient.
 * Handles fetching, creating, updating, and deleting time slots.
 *
 * @example
 * import { timeSlotService } from './timeslot.service';
 *
 * // Get all time slots
 * const slots = await timeSlotService.getTimeSlots();
 *
 * // Get time slots for a specific coach
 * const coachSlots = await timeSlotService.getTimeSlotsByCoach('coach-123');
 */

import { apiClient } from '../../config/api-client';

import { handleApiError } from './error-handler';
import type { TimeSlot, TimeSlotCreateRequest, TimeSlotList, TimeSlotUpdateRequest } from './types';

/**
 * Filter options for fetching time slots.
 */
export interface TimeSlotFilters {
  /** Filter slots starting from this date (ISO string) */
  startDate?: string;
  /** Filter slots ending before this date (ISO string) */
  endDate?: string;
  /** Filter by coach ID */
  coachId?: string;
}

/**
 * Time slot service for managing coach availability.
 *
 * All methods throw AppError on failure, which can be caught and displayed to users.
 */
export const timeSlotService = {
  /**
   * Retrieves time slots with optional filtering.
   *
   * @param filters - Optional filters for date range and coach
   * @returns Array of time slots matching the filters
   * @throws AppError if request fails
   *
   * @example
   * // Get all available slots
   * const slots = await timeSlotService.getTimeSlots();
   *
   * // Get slots in a date range
   * const upcoming = await timeSlotService.getTimeSlots({
   *   startDate: '2024-01-01',
   *   endDate: '2024-01-31'
   * });
   */
  async getTimeSlots(filters?: TimeSlotFilters): Promise<TimeSlotList> {
    const response = await apiClient.get('/api/time-slots', {
      params: filters,
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Retrieves time slots for a specific coach.
   *
   * @param coachId - The coach's account ID
   * @param filters - Optional filters for date range
   * @returns Array of time slots for the coach
   * @throws AppError if request fails
   *
   * @example
   * const coachSlots = await timeSlotService.getTimeSlotsByCoach('coach-123', {
   *   startDate: '2024-01-01',
   *   endDate: '2024-01-31'
   * });
   */
  async getTimeSlotsByCoach(
    coachId: string,
    filters?: Omit<TimeSlotFilters, 'coachId'>
  ): Promise<TimeSlotList> {
    const response = await apiClient.get('/api/time-slots/coach/{coachId}', {
      params: { coachId, ...filters },
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Retrieves a specific time slot by ID.
   *
   * @param id - The time slot ID
   * @returns The time slot details
   * @throws AppError if time slot not found or request fails
   *
   * @example
   * const slot = await timeSlotService.getTimeSlot('ts-123');
   * console.log(`Slot at ${slot.dateTime}, ${slot.durationMin} minutes`);
   */
  async getTimeSlot(id: string): Promise<TimeSlot> {
    const response = await apiClient.get('/api/time-slots/{id}', {
      params: { id },
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Creates a new time slot.
   *
   * Only coaches can create time slots.
   *
   * @param data - Time slot creation data
   * @returns The created time slot
   * @throws AppError if creation fails
   *
   * @example
   * const newSlot = await timeSlotService.createTimeSlot({
   *   dateTime: '2024-01-15T10:00:00Z',
   *   durationMin: 60,
   *   isAvailable: true
   * });
   */
  async createTimeSlot(data: TimeSlotCreateRequest): Promise<TimeSlot> {
    const response = await apiClient.post('/api/time-slots', {
      body: data,
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Updates an existing time slot.
   *
   * @param id - The time slot ID to update
   * @param data - The fields to update
   * @returns The updated time slot
   * @throws AppError if update fails
   *
   * @example
   * const updated = await timeSlotService.updateTimeSlot('ts-123', {
   *   dateTime: '2024-01-15T11:00:00Z',
   *   durationMin: 90,
   *   isAvailable: true
   * });
   */
  async updateTimeSlot(id: string, data: TimeSlotUpdateRequest): Promise<TimeSlot> {
    const response = await apiClient.patch('/api/time-slots/{id}', {
      params: { id },
      body: data,
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Deletes a time slot.
   *
   * @param id - The time slot ID to delete
   * @throws AppError if deletion fails
   *
   * @example
   * await timeSlotService.deleteTimeSlot('ts-123');
   * console.log('Time slot deleted');
   */
  async deleteTimeSlot(id: string): Promise<void> {
    const response = await apiClient.delete('/api/time-slots/{id}', {
      params: { id },
    });

    if (!response.ok) {
      throw handleApiError(response);
    }
  },
};

export default timeSlotService;
