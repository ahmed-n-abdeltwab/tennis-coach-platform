import {
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Message, MessageType, Prisma, Role } from '@prisma/client';
import { plainToInstance } from 'class-transformer';

import { AccountsService } from '../accounts/accounts.service';
import { ConversationsService } from '../conversations/conversations.service';
import { PrismaService } from '../prisma/prisma.service';

import { SessionsService } from './../sessions/sessions.service';
import {
  CreateMessageDto,
  GetMessagesQuery,
  MarkMessageReadDto,
  MessageResponseDto,
} from './dto/message.dto';

/**
 * Standard include object for message queries.
 * Includes sender and receiver relations with selected fields for consistent responses.
 */
const MESSAGE_INCLUDE = {
  sender: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  receiver: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} as const;

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => SessionsService))
    private sessionsService: SessionsService,
    private accountsService: AccountsService,
    @Inject(forwardRef(() => ConversationsService))
    private conversationsService: ConversationsService
  ) {}

  /**
   * Internal find function that centralizes database queries for messages.
   * @param where - Prisma where clause for filtering messages
   * @param options - Configuration options
   * @param options.throwIfNotFound - Whether to throw NotFoundException when no results (default: true)
   * @param options.isMany - Whether to return multiple results (default: false)
   * @returns Single message, array of messages, or null based on options
   */
  private async findMessageInternal<T extends Prisma.MessageWhereInput>(
    where: T,
    options: { throwIfNotFound?: boolean; isMany?: boolean } = {}
  ): Promise<Message | Message[] | null> {
    const { throwIfNotFound = true, isMany = false } = options;

    const result = isMany
      ? await this.prisma.message.findMany({
          where,
          include: MESSAGE_INCLUDE,
          orderBy: { sentAt: 'desc' },
        })
      : await this.prisma.message.findFirst({
          where,
          include: MESSAGE_INCLUDE,
        });

    const isEmpty = isMany ? (result as unknown[]).length === 0 : result === null;

    if (throwIfNotFound && isEmpty) {
      throw new NotFoundException('Message not found');
    }

    return result;
  }

  /**
   * Find a message by ID - used by other services.
   * Throws NotFoundException if not found.
   * @param id - The message ID to search for
   * @returns The message response DTO
   */
  async findById(id: string): Promise<MessageResponseDto> {
    const message = (await this.findMessageInternal({ id })) as Message;
    return plainToInstance(MessageResponseDto, message);
  }

  /**
   * Find messages by session ID - used by other services.
   * Returns empty array if no messages found (does not throw).
   * @param sessionId - The session ID to search for
   * @returns Array of message response DTOs
   */
  async findBySessionId(sessionId: string): Promise<MessageResponseDto[]> {
    const messages = (await this.findMessageInternal(
      { sessionId },
      { isMany: true, throwIfNotFound: false }
    )) as Message[];

    return plainToInstance(MessageResponseDto, messages);
  }

  // ============================================================
  // Methods for ConversationsService (Service Layer Pattern)
  // ============================================================

  /**
   * Get unread message count for a recipient.
   * Used by ConversationsService to show unread counts.
   * @param recipientId - The recipient user ID
   * @returns Count of unread messages
   */
  async getUnreadCountByRecipient(recipientId: string): Promise<number> {
    return this.prisma.message.count({
      where: {
        receiverId: recipientId,
        isRead: false,
      },
    });
  }

  /**
   * Get messages for a conversation with pagination.
   * Used by ConversationsService.getMessages().
   * @param recipientId - The user requesting messages (for filtering)
   * @param page - Page number (1-based)
   * @param limit - Number of messages per page
   * @returns Array of messages with sender/receiver info
   */
  async getMessagesByRecipient(
    recipientId: string,
    page: number,
    limit: number
  ): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: {
        OR: [{ senderId: recipientId }, { receiverId: recipientId }],
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { sentAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  /**
   * Mark all unread messages as read for a recipient.
   * Used by ConversationsService.markMessagesAsRead().
   * @param recipientId - The recipient user ID
   * @returns Number of messages updated
   */
  async markAllAsReadByRecipient(recipientId: string): Promise<number> {
    const result = await this.prisma.message.updateMany({
      where: {
        receiverId: recipientId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
    return result.count;
  }

  /**
   * Create a new message
   */
  async create(
    createDto: CreateMessageDto,
    userId: string,
    role: Role
  ): Promise<MessageResponseDto> {
    const { content, receiverId, sessionId, messageType, customServiceId } = createDto;

    const finalMessageType = messageType ?? MessageType.TEXT;

    // Verify receiver exists using AccountsService internal method
    const receiver = await this.accountsService.existsById(receiverId);

    if (!receiver) {
      throw new NotFoundException('Receiver not found');
    }

    // If sessionId is provided, verify session access
    if (sessionId) {
      const session = await this.sessionsService.findOne(sessionId, userId, role);

      if (!session) {
        throw new NotFoundException('Session not found');
      }

      const hasAccess = role === Role.USER ? session.userId === userId : session.coachId === userId;

      if (!hasAccess) {
        throw new ForbiddenException('Not authorized to send messages for this session');
      }
    }

    // Get or create conversation between the two users using ConversationsService
    const participantIds = [userId, receiverId].sort();
    const conversation = await this.conversationsService.findOrCreateByParticipants(participantIds);

    const message = await this.prisma.message.create({
      data: {
        content,
        sessionId: sessionId ?? null,
        senderId: userId,
        receiverId,
        senderType: role,
        receiverType: receiver.role,
        messageType: finalMessageType,
        customServiceId: customServiceId ?? null,
        conversationId: conversation.id,
      },
      include: MESSAGE_INCLUDE,
    });

    // Update conversation with last message info using ConversationsService
    await this.conversationsService.updateLastMessage(conversation.id, message.id, message.sentAt);

    return plainToInstance(MessageResponseDto, message);
  }

  /**
   * Find all messages for a user with optional filters.
   * Uses findMessageInternal with isMany option.
   */
  async findAll(userId: string, query: GetMessagesQuery): Promise<MessageResponseDto[]> {
    const where: Prisma.MessageWhereInput = {
      OR: [{ senderId: userId }, { receiverId: userId }],
    };

    // Filter by sessionId if provided
    if (query.sessionId) {
      where.sessionId = query.sessionId;
    }

    // Filter by conversation with specific user if provided
    if (query.conversationWith) {
      where.OR = [
        { senderId: userId, receiverId: query.conversationWith },
        { senderId: query.conversationWith, receiverId: userId },
      ];
    }

    // Filter by conversation ID if provided
    if (query.conversationId) {
      where.conversationId = query.conversationId;
    }

    // Filter by message type if provided
    if (query.messageType) {
      where.messageType = query.messageType;
    }

    const messages = (await this.findMessageInternal(where, {
      isMany: true,
      throwIfNotFound: false,
    })) as Message[];

    return plainToInstance(MessageResponseDto, messages);
  }

  /**
   * Find a single message by ID with authorization check.
   * Uses findById internal method and verifies user access.
   */
  async findOne(id: string, userId: string): Promise<MessageResponseDto> {
    const message = await this.findById(id);

    // Verify user has access to this message
    if (message.senderId !== userId && message.receiverId !== userId) {
      throw new ForbiddenException('Not authorized to view this message');
    }

    return message;
  }

  /**
   * Find conversation between two users.
   * Uses findMessageInternal with custom where clause.
   */
  async findConversation(userId: string, otherUserId: string): Promise<MessageResponseDto[]> {
    const messages = (await this.findMessageInternal(
      {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      },
      { isMany: true, throwIfNotFound: false }
    )) as Message[];

    return plainToInstance(MessageResponseDto, messages);
  }

  /**
   * Find messages by session ID with authorization check.
   * Uses findBySessionId internal method after verifying session access.
   */
  async findBySession(
    sessionId: string,
    userId: string,
    role: Role,
    _query: GetMessagesQuery
  ): Promise<MessageResponseDto[]> {
    // Verify user has access to this session
    const session = await this.sessionsService.findOne(sessionId, userId, role);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const hasAccess = role === Role.USER ? session.userId === userId : session.coachId === userId;

    if (!hasAccess) {
      throw new ForbiddenException('Not authorized to view messages for this session');
    }

    return this.findBySessionId(sessionId);
  }

  /**
   * Mark a message as read
   */
  async markAsRead(
    messageId: string,
    userId: string,
    markReadDto: MarkMessageReadDto
  ): Promise<MessageResponseDto> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: MESSAGE_INCLUDE,
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Only the receiver can mark a message as read
    if (message.receiverId !== userId) {
      throw new ForbiddenException('You can only mark messages sent to you as read');
    }

    const updatedMessage = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        isRead: markReadDto.isRead ?? true,
        readAt: markReadDto.isRead !== false ? new Date() : null,
      },
      include: MESSAGE_INCLUDE,
    });

    return plainToInstance(MessageResponseDto, updatedMessage);
  }

  /**
   * Get messages for a specific conversation
   */
  async getConversationMessages(
    conversationId: string,
    userId: string,
    _role: Role
  ): Promise<MessageResponseDto[]> {
    // Verify user has access to this conversation using ConversationsService
    const hasAccess = await this.conversationsService.existsWithParticipant(conversationId, userId);

    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this conversation');
    }

    const messages = (await this.findMessageInternal(
      { conversationId },
      { isMany: true, throwIfNotFound: false }
    )) as Message[];

    return plainToInstance(MessageResponseDto, messages);
  }

  // ============================================================
  // Analytics Methods (Service Layer Pattern)
  // ============================================================

  /**
   * Count messages with optional filters - used by AnalyticsService
   * @param where - Optional Prisma where clause for filtering
   * @returns Count of matching messages
   */
  async countMessages(where?: Prisma.MessageWhereInput): Promise<number> {
    return this.prisma.message.count({ where });
  }
}
