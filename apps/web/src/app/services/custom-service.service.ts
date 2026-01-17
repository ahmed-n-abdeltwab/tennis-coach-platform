/**
 * Custom Service API Service
 *
 * Provides type-safe custom service operations using the ApiClient.
 * Handles creating, managing, and sending custom services for coaches.
 *
 * @example
 * import { customServiceService } from './custom-service.service';
 *
 * // Create a custom service
 * const service = await customServiceService.createCustomService({
 *   name: 'Personal Training',
 *   description: 'One-on-one session',
 *   basePrice: '99.99',
 *   duration: 60
 * });
 */

import { apiClient } from '../../config/api-client';

import { handleApiError } from './error-handler';

// Custom Service Types (based on backend DTOs)
export interface CustomService {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  description?: string;
  basePrice: number;
  duration: number;
  isTemplate: boolean;
  isPublic: boolean;
  usageCount: number;
  coachId: string;
  prefilledBookingTypeId?: string;
  prefilledDateTime?: string;
  prefilledTimeSlotId?: string;
}

export interface CreateCustomServiceRequest {
  name: string;
  description?: string;
  basePrice: string;
  duration: number;
  isTemplate?: boolean;
  isPublic?: boolean;
  prefilledBookingTypeId?: string;
  prefilledDateTime?: string;
  prefilledTimeSlotId?: string;
}

export interface UpdateCustomServiceRequest {
  name?: string;
  description?: string;
  basePrice?: string;
  duration?: number;
  isTemplate?: boolean;
  isPublic?: boolean;
  prefilledBookingTypeId?: string;
  prefilledDateTime?: string;
  prefilledTimeSlotId?: string;
}

export interface SendCustomServiceRequest {
  userId: string;
  message?: string;
}

export interface GetCustomServicesQuery {
  isTemplate?: boolean;
  isPublic?: boolean;
  coachId?: string;
}

/**
 * Custom service API operations.
 *
 * All methods throw AppError on failure, which can be caught and displayed to users.
 */
export const customServiceService = {
  /**
   * Creates a new custom service.
   *
   * @param data - Custom service creation data
   * @returns The created custom service
   * @throws AppError if creation fails
   *
   * @example
   * const service = await customServiceService.createCustomService({
   *   name: 'Personal Training',
   *   description: 'One-on-one coaching session',
   *   basePrice: '99.99',
   *   duration: 60
   * });
   */
  async createCustomService(data: CreateCustomServiceRequest): Promise<CustomService> {
    const response = await apiClient.post('/api/custom-services', {
      body: data,
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Retrieves all custom services with optional filtering.
   *
   * @param query - Optional query parameters for filtering
   * @returns Array of custom services
   * @throws AppError if request fails
   *
   * @example
   * // Get all custom services
   * const services = await customServiceService.getCustomServices();
   *
   * // Get only templates
   * const templates = await customServiceService.getCustomServices({ isTemplate: true });
   */
  async getCustomServices(query?: GetCustomServicesQuery): Promise<CustomService[]> {
    const response = await apiClient.get('/api/custom-services', {
      params: query,
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Retrieves a specific custom service by ID.
   *
   * @param id - The custom service ID
   * @returns The custom service details
   * @throws AppError if service not found or request fails
   *
   * @example
   * const service = await customServiceService.getCustomService('cs-123');
   * console.log(`${service.name}: ${service.basePrice}`);
   */
  async getCustomService(id: string): Promise<CustomService> {
    const response = await apiClient.get('/api/custom-services/{id}', {
      params: { id },
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Updates an existing custom service.
   *
   * @param id - The custom service ID to update
   * @param data - The fields to update
   * @returns The updated custom service
   * @throws AppError if update fails
   *
   * @example
   * const updated = await customServiceService.updateCustomService('cs-123', {
   *   basePrice: '109.99',
   *   description: 'Updated description'
   * });
   */
  async updateCustomService(id: string, data: UpdateCustomServiceRequest): Promise<CustomService> {
    const response = await apiClient.patch('/api/custom-services/{id}', {
      params: { id },
      body: data,
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Deletes a custom service.
   *
   * @param id - The custom service ID to delete
   * @throws AppError if deletion fails
   *
   * @example
   * await customServiceService.deleteCustomService('cs-123');
   * console.log('Custom service deleted');
   */
  async deleteCustomService(id: string): Promise<void> {
    const response = await apiClient.delete('/api/custom-services/{id}', {
      params: { id },
    });

    if (!response.ok) {
      throw handleApiError(response);
    }
  },

  /**
   * Saves a custom service as a template for reuse.
   *
   * @param id - The custom service ID to save as template
   * @returns The updated custom service with template flag
   * @throws AppError if operation fails
   *
   * @example
   * const template = await customServiceService.saveAsTemplate('cs-123');
   * console.log(`Template created: ${template.name}`);
   */
  async saveAsTemplate(id: string): Promise<CustomService> {
    const response = await apiClient.post('/api/custom-services/{id}/save-as-template', {
      params: { id },
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Sends a custom service to a specific user through chat.
   *
   * @param id - The custom service ID to send
   * @param data - Send request data including user ID and optional message
   * @returns Success response with message
   * @throws AppError if sending fails
   *
   * @example
   * await customServiceService.sendToUser('cs-123', {
   *   userId: 'user-456',
   *   message: 'Check out this custom service I created for you!'
   * });
   */
  async sendToUser(id: string, data: SendCustomServiceRequest): Promise<{ message: string }> {
    const response = await apiClient.post('/api/custom-services/{id}/send-to-user', {
      params: { id },
      body: data,
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },
};

export default customServiceService;
