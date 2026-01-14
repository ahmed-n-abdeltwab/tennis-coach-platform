/**
 * Conversation Service
 *
 * Provides type-safe conversation operations using the ApiClient.
 * Handles fetching conversations, pinning/unpinning, and conversation management.
 *
 * @example
 * import { conversationService } from './conversation.service';
 *
 * // Get all conversations
 * const conversations = await conversationService.getConversations();
 *
 * // Pin a conversation
 * await conversationService.pinConversation('conv-123');
 */

import { apiClient } from '../../config/api-client';

import { handleApiError } from './error-handler';

// Conversation Types (based on backend DTOs)
export interface ConversationSummary {
  id: string;
  participantIds: string[];
  lastMessageId?: string;
  lastMessageAt?: string;
  isPinned: boolean;
  pinnedAt?: string;
  pinnedBy?: string;
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
  lastMessage?: {
    id: string;
    content: string;
    sentAt: string;
    senderId: string;
    messageType: string;
    sender?: {
      id: string;
      name: string;
    };
    receiver?: {
      id: string;
      name: string;
    };
  };
}

export interface GetConversationsQuery {
  isPinned?: boolean;
}

/**
 * Conversation service for managing chat conversations.
 *
 * All methods throw AppError on failure, which can be caught and displayed to users.
 */
export const conversationService = {
  /**
   * Retrieves all conversations for the current user.
   *
   * @param query - Optional query parameters for filtering
   * @returns Array of conversations
   * @throws AppError if request fails
   *
   * @example
   * // Get all conversations
   * const conversations = await conversationService.getConversations();
   *
   * // Get only pinned conversations
   * const pinned = await conversationService.getConversations({ isPinned: true });
   */
  async getConversations(query?: GetConversationsQuery): Promise<ConversationSummary[]> {
    const response = await apiClient.get('/api/conversations', {
      params: query,
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Retrieves a specific conversation by ID.
   *
   * @param id - The conversation ID
   * @returns The conversation details
   * @throws AppError if conversation not found or request fails
   *
   * @example
   * const conversation = await conversationService.getConversation('conv-123');
   * console.log(`Conversation with ${conversation.participantIds.length} participants`);
   */
  async getConversation(id: string): Promise<ConversationSummary> {
    const response = await apiClient.get('/api/conversations/{id}', {
      params: { id },
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Pins a conversation (coaches only).
   *
   * @param id - The conversation ID to pin
   * @returns The updated conversation
   * @throws AppError if pinning fails
   *
   * @example
   * const pinned = await conversationService.pinConversation('conv-123');
   * console.log(`Conversation pinned at ${pinned.pinnedAt}`);
   */
  async pinConversation(id: string): Promise<ConversationSummary> {
    const response = await apiClient.post('/api/conversations/{id}/pin', {
      params: { id },
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Unpins a conversation (coaches only).
   *
   * @param id - The conversation ID to unpin
   * @returns The updated conversation
   * @throws AppError if unpinning fails
   *
   * @example
   * const unpinned = await conversationService.unpinConversation('conv-123');
   * console.log('Conversation unpinned');
   */
  async unpinConversation(id: string): Promise<ConversationSummary> {
    const response = await apiClient.delete('/api/conversations/{id}/pin', {
      params: { id },
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },

  /**
   * Gets messages for a specific conversation.
   *
   * @param conversationId - The conversation ID
   * @returns Array of messages in the conversation
   * @throws AppError if request fails
   *
   * @example
   * const messages = await conversationService.getConversationMessages('conv-123');
   * console.log(`${messages.length} messages in conversation`);
   */
  async getConversationMessages(conversationId: string): Promise<any[]> {
    const response = await apiClient.get('/api/messages/conversation/{conversationId}', {
      params: { conversationId },
    });

    if (!response.ok) {
      throw handleApiError(response);
    }

    return response.data;
  },
};

export default conversationService;
