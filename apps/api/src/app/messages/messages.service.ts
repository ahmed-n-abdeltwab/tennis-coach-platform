import { PrismaService } from '@app/prisma/prisma.service';
import { Role } from '@auth-helpers/common';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AdminRole, UserRole } from '@prisma/client';
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

    const hasAccess = role in UserRole ? session.userId === userId : session.coachId === userId;

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
        senderUser: {
          select: {
            id: true,
            name: true,
          },
        },
        senderCoach: {
          select: {
            id: true,
            name: true,
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

    const hasAccess = role in UserRole ? session.userId === userId : session.coachId === userId;

    if (!hasAccess) {
      throw new ForbiddenException('Not authorized to send messages for this session');
    }

    // Determine receiver
    const receiverUserId = receiverType === Role.USER ? session.userId : null;
    const receiverCoachId = receiverType === Role.COACH ? session.coachId : null;

    return this.prisma.message.create({
      data: {
        content,
        sessionId,
        senderType: role,
        senderUserId: role in UserRole ? userId : null,
        senderCoachId: role in AdminRole ? userId : null,
        receiverType,
        receiverUserId,
        receiverCoachId,
      },
      include: {
        senderUser: {
          select: {
            id: true,
            name: true,
          },
        },
        senderCoach: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }
}
