import {
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Conversation, Message, Prisma, Role } from '@prisma/client';
import { plainToInstance } from 'class-transformer';

import { MessagesService } from '../messages/messages.service';
import { PrismaService } from '../prisma/prisma.service';

import { ConversationResponseDto, GetConversationsQuery } from './dto/conversation.dto';

/**
 * Standard include object for conversation queries.
 * Includes last message and participant information for consistent responses.
 */
const CONVERSATION_INCLUDE = {
  lastMessage: {
    select: {
      id: true,
      content: true,
      sentAt: true,
      senderId: true,
      messageType: true,
    },
  },
  _count: {
    select: {
      messages: true,
    },
  },
} as const;

/**
 * Service responsible for managing chat conversations.
 * Provides conversation listing, pinning/unpinning, message retrieval,
 * and read status management for the enhanced chat system.
 */
@Injectable()
export class ConversationsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => MessagesService))
    private messagesService: MessagesService
  ) {}

  /**
   * Internal find function that centralizes database queries for conversations.
   * @param where - Prisma where clause for filtering conversations
   * @param options - Configuration options
   * @param options.throwIfNotFound - Whether to throw NotFoundException when no results (default: true)
   * @param options.isMany - Whether to return multiple results (default: false)
   * @returns Promise resolving to conversation(s) or null
   */
  private async findConversationInternal<T extends Prisma.ConversationWhereInput>(
    where: T,
    options: { throwIfNotFound?: boolean; isMany?: boolean } = {}
  ) {
    const { throwIfNotFound = true, isMany = false } = options;

    // Run the query based on if we expect one or many
    const result = isMany
      ? await this.prisma.conversation.findMany({
          where,
          include: CONVERSATION_INCLUDE,
          orderBy: [{ isPinned: 'desc' }, { pinnedAt: 'desc' }, { lastMessageAt: 'desc' }],
        })
      : await this.prisma.conversation.findFirst({
          where,
          include: CONVERSATION_INCLUDE,
        });

    // Handle the "Not Found" case
    const isEmpty = Array.isArray(result) ? result.length === 0 : result === null;

    if (throwIfNotFound && isEmpty) {
      throw new NotFoundException('Conversation not found');
    }

    return result;
  }

  /**
   * Find all conversations for a user with optional filtering.
   * Conversations are sorted by pinned status, then by most recent message.
   * Includes unread message count for each conversation.
   * @param query - Query parameters for filtering (isPinned)
   * @param userId - The ID of the user requesting conversations
   * @param userRole - The role of the user (admins can see all conversations)
   * @returns Array of conversation response DTOs with unread counts
   */
  async findAll(
    query: GetConversationsQuery,
    userId: string,
    userRole: Role
  ): Promise<ConversationResponseDto[]> {
    const where: Prisma.ConversationWhereInput = {
      participantIds: {
        has: userId, // User must be a participant in the conversation
      },
    };

    if (query.isPinned !== undefined) {
      where.isPinned = query.isPinned;
    }

    // Apply role-based filtering - admins can see all conversations
    if (userRole !== Role.ADMIN) {
      // Non-admin users can only see conversations they participate in
      where.participantIds = {
        has: userId,
      };
    }

    const conversations = (await this.findConversationInternal(where, {
      isMany: true,
      throwIfNotFound: false,
    })) as Conversation[];

    // Add unread count for each conversation using MessagesService
    const conversationsWithUnread = await Promise.all(
      conversations.map(async conversation => {
        const unreadCount = await this.messagesService.getUnreadCountByRecipient(userId);

        return {
          ...conversation,
          unreadCount,
        };
      })
    );

    return plainToInstance(ConversationResponseDto, conversationsWithUnread);
  }

  /**
   * Find a single conversation by ID with access control.
   * Includes unread message count for the requesting user.
   * @param id - The conversation ID
   * @param userId - The ID of the user requesting the conversation
   * @param userRole - The role of the user (admins can access any conversation)
   * @returns The conversation response DTO with unread count
   * @throws NotFoundException if conversation not found
   * @throws ForbiddenException if user is not a participant
   */
  async findOne(id: string, userId: string, userRole: Role): Promise<ConversationResponseDto> {
    const conversation = (await this.findConversationInternal({ id })) as Conversation;

    // Check if user is a participant in the conversation (admins can access any conversation)
    if (userRole !== Role.ADMIN && !conversation.participantIds.includes(userId)) {
      throw new ForbiddenException('Access denied to this conversation');
    }

    // Get unread count for this conversation using MessagesService
    const unreadCount = await this.messagesService.getUnreadCountByRecipient(userId);

    const conversationWithUnread = {
      ...conversation,
      unreadCount,
    };

    return plainToInstance(ConversationResponseDto, conversationWithUnread);
  }

  /**
   * Pin a conversation for priority display.
   * Pinned conversations appear at the top of the conversation list.
   * Only coaches and admins can pin conversations.
   * @param id - The conversation ID to pin
   * @param userId - The ID of the user pinning the conversation
   * @param userRole - The role of the user (must be COACH or ADMIN)
   * @returns The updated conversation response DTO
   * @throws NotFoundException if conversation not found
   * @throws ForbiddenException if user is not a participant or lacks permission
   */
  async pin(id: string, userId: string, userRole: Role): Promise<ConversationResponseDto> {
    const conversation = (await this.findConversationInternal({ id })) as Conversation;

    // Check if user is a participant in the conversation
    if (!conversation.participantIds.includes(userId)) {
      throw new ForbiddenException('Access denied to this conversation');
    }

    // Only coaches can pin conversations
    if (userRole !== Role.COACH && userRole !== Role.ADMIN) {
      throw new ForbiddenException('Only coaches can pin conversations');
    }

    const updatedConversation = await this.prisma.conversation.update({
      where: { id },
      data: {
        isPinned: true,
        pinnedAt: new Date(),
        pinnedBy: userId,
      },
      include: CONVERSATION_INCLUDE,
    });

    return plainToInstance(ConversationResponseDto, updatedConversation);
  }

  /**
   * Unpin a previously pinned conversation.
   * Removes the conversation from the pinned section.
   * Only coaches and admins can unpin conversations.
   * @param id - The conversation ID to unpin
   * @param userId - The ID of the user unpinning the conversation
   * @param userRole - The role of the user (must be COACH or ADMIN)
   * @returns The updated conversation response DTO
   * @throws NotFoundException if conversation not found
   * @throws ForbiddenException if user is not a participant or lacks permission
   */
  async unpin(id: string, userId: string, userRole: Role): Promise<ConversationResponseDto> {
    const conversation = (await this.findConversationInternal({ id })) as Conversation;

    // Check if user is a participant in the conversation
    if (!conversation.participantIds.includes(userId)) {
      throw new ForbiddenException('Access denied to this conversation');
    }

    // Only coaches can unpin conversations
    if (userRole !== Role.COACH && userRole !== Role.ADMIN) {
      throw new ForbiddenException('Only coaches can unpin conversations');
    }

    const updatedConversation = await this.prisma.conversation.update({
      where: { id },
      data: {
        isPinned: false,
        pinnedAt: null,
        pinnedBy: null,
      },
      include: CONVERSATION_INCLUDE,
    });

    return plainToInstance(ConversationResponseDto, updatedConversation);
  }

  /**
   * Get paginated messages for a conversation.
   * Verifies user has access to the conversation before returning messages.
   * @param conversationId - The conversation ID
   * @param userId - The ID of the user requesting messages
   * @param userRole - The role of the user (admins can access any conversation)
   * @param page - Page number for pagination (default: 1)
   * @param limit - Number of messages per page (default: 50)
   * @returns Array of messages with sender/receiver information
   * @throws NotFoundException if conversation not found
   * @throws ForbiddenException if user is not a participant
   */
  async getMessages(
    conversationId: string,
    userId: string,
    userRole: Role,
    page = 1,
    limit = 50
  ): Promise<Message[]> {
    const conversation = (await this.findConversationInternal({
      id: conversationId,
    })) as Conversation;

    // Check if user is a participant in the conversation (admins can access any conversation)
    if (userRole !== Role.ADMIN && !conversation.participantIds.includes(userId)) {
      throw new ForbiddenException('Access denied to this conversation');
    }

    // Use MessagesService to get messages
    return this.messagesService.getMessagesByRecipient(userId, page, limit);
  }

  /**
   * Mark all messages in a conversation as read for the user.
   * Updates the isRead and readAt fields for unread messages.
   * @param conversationId - The conversation ID
   * @param userId - The ID of the user marking messages as read
   * @param userRole - The role of the user (admins can access any conversation)
   * @returns Object containing the count of updated messages
   * @throws NotFoundException if conversation not found
   * @throws ForbiddenException if user is not a participant
   */
  async markMessagesAsRead(
    conversationId: string,
    userId: string,
    userRole: Role
  ): Promise<{ updatedCount: number }> {
    const conversation = (await this.findConversationInternal({
      id: conversationId,
    })) as Conversation;

    // Check if user is a participant in the conversation (admins can access any conversation)
    if (userRole !== Role.ADMIN && !conversation.participantIds.includes(userId)) {
      throw new ForbiddenException('Access denied to this conversation');
    }

    // Use MessagesService to mark messages as read
    const updatedCount = await this.messagesService.markAllAsReadByRecipient(userId);

    return { updatedCount };
  }

  // ============================================================
  // Methods for MessagesService (Service Layer Pattern)
  // ============================================================

  /**
   * Find or create a conversation by participant IDs.
   * Used by MessagesService when creating messages.
   * @param participantIds - Sorted array of participant IDs
   * @returns The existing or newly created conversation
   */
  async findOrCreateByParticipants(participantIds: string[]): Promise<Conversation> {
    const existing = await this.prisma.conversation.findFirst({
      where: {
        participantIds: {
          equals: participantIds,
        },
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.conversation.create({
      data: {
        participantIds,
      },
    });
  }

  /**
   * Update the last message reference for a conversation.
   * Used by MessagesService after creating a message.
   * @param conversationId - The conversation ID
   * @param messageId - The new last message ID
   * @param sentAt - The timestamp of the message
   */
  async updateLastMessage(conversationId: string, messageId: string, sentAt: Date): Promise<void> {
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageId: messageId,
        lastMessageAt: sentAt,
      },
    });
  }

  /**
   * Check if a conversation exists and includes a specific participant.
   * Used by MessagesService for access control.
   * @param conversationId - The conversation ID
   * @param userId - The user ID to check
   * @returns True if conversation exists and user is a participant
   */
  async existsWithParticipant(conversationId: string, userId: string): Promise<boolean> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { participantIds: true },
    });

    if (!conversation) {
      return false;
    }

    return conversation.participantIds.includes(userId);
  }
}
