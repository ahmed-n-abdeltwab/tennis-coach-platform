import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { GetMessagesQuery, SendMessageDto } from './dto/message.dto';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  async findBySession(sessionId: string, userId: string, role: Role, query: GetMessagesQuery) {
    // Verify user has access to this session
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

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

    const { page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    return this.prisma.message.findMany({
      where: { sessionId },
      skip,
      take: limit,
      orderBy: { sentAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });
  }

  async create(createDto: SendMessageDto, userId: string, role: Role) {
    const { content, sessionId, receiverType } = createDto;

    // Verify session access
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

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

    // Determine receiver ID based on receiver type
    const receiverId = receiverType === Role.USER ? session.userId : session.coachId;

    return this.prisma.message.create({
      data: {
        content,
        sessionId,
        senderId: userId,
        receiverId,
        senderType: role,
        receiverType,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });
  }
}
