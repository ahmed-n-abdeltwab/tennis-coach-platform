import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Message, Role } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { SessionsService } from './../sessions/sessions.service';
import { CreateMessageDto, GetMessagesQuery, MessageResponseDto } from './dto/message.dto';

type MessageWithRelations = Message & {
  sender?: {
    id: string;
    name: string;
    email: string;
  };
  receiver?: {
    id: string;
    name: string;
    email: string;
  };
};

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private sessionsService: SessionsService
  ) {}

  /**
   * Transform Prisma Message to MessageResponseDto
   * Transforms DateTime to ISO string for sentAt
   * Includes sender and receiver relationships if present
   */
  private toResponseDto(message: MessageWithRelations): MessageResponseDto {
    return {
      id: message.id,
      content: message.content,
      sentAt: message.sentAt.toISOString(),
      senderId: message.senderId,
      receiverId: message.receiverId,
      sessionId: message.sessionId ?? undefined,
      senderType: message.senderType,
      receiverType: message.receiverType,
      sender: message.sender,
      receiver: message.receiver,
      createdAt: message.sentAt.toISOString(), // Messages use sentAt as creation time
      updatedAt: message.sentAt.toISOString(), // Messages don't have updatedAt, use sentAt
    } as MessageResponseDto;
  }

  /**
   * Create a new message
   */
  async create(
    createDto: CreateMessageDto,
    userId: string,
    role: Role
  ): Promise<MessageResponseDto> {
    const { content, receiverId, sessionId } = createDto;

    // Verify receiver exists
    const receiver = await this.prisma.account.findUnique({
      where: { id: receiverId },
      select: { id: true, role: true },
    });

    if (!receiver) {
      throw new NotFoundException('Receiver not found');
    }

    // If sessionId is provided, verify session access
    if (sessionId) {
      const session = await this.sessionsService.findOne(sessionId, userId, role);

      if (!session) {
        throw new NotFoundException('Session not found');
      }

      const hasAccess =
        role === Role.USER || role === Role.PREMIUM_USER
          ? session.userId === userId
          : session.coachId === userId;

      if (!hasAccess) {
        throw new ForbiddenException('Not authorized to send messages for this session');
      }
    }

    const message = await this.prisma.message.create({
      data: {
        content,
        sessionId: sessionId ?? null,
        senderId: userId,
        receiverId,
        senderType: role,
        receiverType: receiver.role,
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
    });

    return this.toResponseDto(message);
  }

  /**
   * Find all messages for a user with optional filters
   */
  async findAll(userId: string, query: GetMessagesQuery): Promise<MessageResponseDto[]> {
    const where: any = {
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

    const messages = await this.prisma.message.findMany({
      where,
      orderBy: { sentAt: 'desc' },
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
    });

    return messages.map(message => this.toResponseDto(message));
  }

  /**
   * Find a single message by ID
   */
  async findOne(id: string, userId: string): Promise<MessageResponseDto> {
    const message = await this.prisma.message.findUnique({
      where: { id },
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
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Verify user has access to this message
    if (message.senderId !== userId && message.receiverId !== userId) {
      throw new ForbiddenException('Not authorized to view this message');
    }

    return this.toResponseDto(message);
  }

  /**
   * Find conversation between two users
   */
  async findConversation(userId: string, otherUserId: string): Promise<MessageResponseDto[]> {
    const messages = await this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      },
      orderBy: { sentAt: 'asc' },
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
    });

    return messages.map(message => this.toResponseDto(message));
  }

  /**
   * Find messages by session ID
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

    const hasAccess =
      role === Role.USER || role === Role.PREMIUM_USER
        ? session.userId === userId
        : session.coachId === userId;

    if (!hasAccess) {
      throw new ForbiddenException('Not authorized to view messages for this session');
    }

    const messages = await this.prisma.message.findMany({
      where: { sessionId },
      orderBy: { sentAt: 'desc' },
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
    });

    return messages.map(message => this.toResponseDto(message));
  }
}
