/**
 * Session Service
 *
 * Provides type-safe session operations using the ApiClient.
 * Handles fetching, creating, updating, and cancelling coaching sessions.
 *
 * @example
 * import { sessionService } from './session.service';
 *
 * // Get all sessions
 * const sessions = await sessionService.getSessions();
 *
 * // Create a new session
 * const session = await sessionService.createSession({
 *   bookingTypeId: 'bt-123',
 *   timeSlotId: 'ts-456'
 * });
 */

import { apiClient } from '../../config/api-client';

import { handleApiError } from './error-handler';
import type {
  Session,
  SessionCreateRequest,
  SessionList,
  SessionStatus,
  SessionUpdateRequest,
} from './types';

/**
 * Filter options for fetching sessions.
 */
export interface SessionFilters {
  /** Filter by session status */
  status?: SessionStatus;
  /** Filter sessions starting from this date (ISO string) */
  startDate?: string;
  /** Filter sessions ending before this date (ISO string) */
  endDate?: string;
}

/**
 * Session service for managing coaching sessions.
 *
 * All methods throw AppError on failure, which can be caught and displayed to users.
 */
export const sessionService = {
  /**
   * Retrieves sessions with optional filtering.
   *
   * @param filters - Optional filters for status and date range
   * @returns Array of sessions matching the filters
   * @throws AppError if request fails
   *
   * @example
   * // Get all scheduled sessions
   * const scheduled = await sessionService.getSessions({ status: 'SCHEDULED' });
   *
   * // Get sessions in a date range
   * const upcoming = await sessionService.getSessions({
   *   startDate: '2024-01-01',
   *   endDate: '2024-01-31'
   * });
   */
  async getSessions(filters?: SessionFilters): Promise<SessionList> {
    const response = await apiClient.get('/api/sessions', {
      params: filters,
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Retrieves a specific session by ID.
   *
   * @param id - The session ID
   * @returns The session details
   * @throws AppError if session not found or request fails
   *
   * @example
   * const session = await sessionService.getSession('session-123');
   * console.log(`Session with ${session.bookingType.name}`);
   */
  async getSession(id: string): Promise<Session> {
    const response = await apiClient.get('/api/sessions/{id}', {
      params: { id },
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Creates a new coaching session.
   *
   * @param data - Session creation data including booking type and time slot
   * @returns The created session
   * @throws AppError if creation fails
   *
   * @example
   * const session = await sessionService.createSession({
   *   bookingTypeId: 'bt-123',
   *   timeSlotId: 'ts-456',
   *   discountCode: 'SAVE10',
   *   notes: 'First session'
   * });
   */
  async createSession(data: SessionCreateRequest): Promise<Session> {
    const response = await apiClient.post('/api/sessions', {
      body: data,
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Updates an existing session.
   *
   * @param id - The session ID to update
   * @param data - The fields to update (currently only notes)
   * @returns The updated session
   * @throws AppError if update fails
   *
   * @example
   * const updated = await sessionService.updateSession('session-123', {
   *   notes: 'Updated notes for the session'
   * });
   */
  async updateSession(id: string, data: SessionUpdateRequest): Promise<Session> {
    const response = await apiClient.patch('/api/sessions/{id}', {
      params: { id },
      body: data,
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Cancels a scheduled session.
   *
   * @param id - The session ID to cancel
   * @returns The cancelled session with updated status
   * @throws AppError if cancellation fails
   *
   * @example
   * const cancelled = await sessionService.cancelSession('session-123');
   * console.log(`Session status: ${cancelled.status}`); // 'CANCELLED'
   */
  async cancelSession(id: string): Promise<Session> {
    const response = await apiClient.put('/api/sessions/{id}/cancel', {
      params: { id },
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },
};

export default sessionService;
