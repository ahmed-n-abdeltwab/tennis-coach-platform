/**
 * Message Service
 *
 * Provides type-safe message operations using the ApiClient.
 * Handles fetching messages, conversations, and sending new messages.
 *
 * @example
 * import { messageService } from './message.service';
 *
 * // Get all messages
 * const messages = await messageService.getMessages();
 *
 * // Get conversation with a specific user
 * const conversation = await messageService.getConversation('user-123');
 */

import { apiClient } from '../../config/api-client';

import { handleApiError } from './error-handler';
import type { Message, MessageCreateRequest, MessageList } from './types';

/**
 * Filter options for fetching messages.
 */
export interface MessageFilters {
  /** Filter by session ID */
  sessionId?: string;
  /** Filter by conversation partner ID */
  conversationWith?: string;
}

/**
 * Message service for managing chat messages.
 *
 * All methods throw AppError on failure, which can be caught and displayed to users.
 */
export const messageService = {
  /**
   * Retrieves messages with optional filtering.
   *
   * @param filters - Optional filters for session or conversation
   * @returns Array of messages matching the filters
   * @throws AppError if request fails
   *
   * @example
   * // Get all messages
   * const messages = await messageService.getMessages();
   *
   * // Get messages for a specific session
   * const sessionMessages = await messageService.getMessages({
   *   sessionId: 'session-123'
   * });
   */
  async getMessages(filters?: MessageFilters): Promise<MessageList> {
    const response = await apiClient.get('/api/messages', {
      params: filters,
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Retrieves all messages in a conversation with a specific user.
   *
   * @param userId - The conversation partner's user ID
   * @returns Array of messages in the conversation
   * @throws AppError if request fails
   *
   * @example
   * const conversation = await messageService.getConversation('user-123');
   * conversation.forEach(msg => {
   *   console.log(`${msg.sender?.name}: ${msg.content}`);
   * });
   */
  async getConversation(userId: string): Promise<MessageList> {
    const response = await apiClient.get('/api/messages/conversation/with-user/{userId}', {
      params: { userId },
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Retrieves all messages for a specific session.
   *
   * @param sessionId - The session ID
   * @returns Array of messages for the session
   * @throws AppError if request fails
   *
   * @example
   * const sessionMessages = await messageService.getSessionMessages('session-123');
   * console.log(`${sessionMessages.length} messages in this session`);
   */
  async getSessionMessages(sessionId: string): Promise<MessageList> {
    const response = await apiClient.get('/api/messages/session/{sessionId}', {
      params: { sessionId },
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Retrieves a specific message by ID.
   *
   * @param id - The message ID
   * @returns The message details
   * @throws AppError if message not found or request fails
   *
   * @example
   * const message = await messageService.getMessage('msg-123');
   * console.log(`From ${message.sender?.name}: ${message.content}`);
   */
  async getMessage(id: string): Promise<Message> {
    const response = await apiClient.get('/api/messages/{id}', {
      params: { id },
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Sends a new message.
   *
   * @param data - Message creation data including content and receiver
   * @returns The created message
   * @throws AppError if sending fails
   *
   * @example
   * const message = await messageService.sendMessage({
   *   content: 'Hello! Looking forward to our session.',
   *   receiverId: 'coach-123',
   *   sessionId: 'session-456' // optional
   * });
   */
  async sendMessage(data: MessageCreateRequest): Promise<Message> {
    const response = await apiClient.post('/api/messages', {
      body: data,
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Sends a booking request message.
   *
   * @param coachId - The coach's user ID
   * @param bookingTypeId - The booking type being requested
   * @param message - Custom message from the user (optional)
   * @returns The created booking request message
   * @throws AppError if sending fails
   *
   * @example
   * const bookingRequest = await messageService.sendBookingRequest(
   *   'coach-123',
   *   'booking-type-456',
   *   'I would like to book a session for next week.'
   * );
   */
  async sendBookingRequest(
    coachId: string,
    bookingTypeId: string,
    message?: string
  ): Promise<Message> {
    const response = await apiClient.post('/api/messages/booking-request', {
      body: {
        coachId,
        bookingTypeId,
        message,
      },
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },
};

export default messageService;
