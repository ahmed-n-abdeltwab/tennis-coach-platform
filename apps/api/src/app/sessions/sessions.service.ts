import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Discount, Role, Session } from '@prisma/client';
import type { Decimal } from '@prisma/client/runtime/client';

import { PrismaService } from '../prisma/prisma.service';

import {
  CreateSessionDto,
  GetSessionsQuery,
  SessionResponseDto,
  UpdateSessionDto,
} from './dto/session.dto';

type SessionWithRelations = Session & {
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
  coach?: {
    id: string;
    name: string;
    email: string;
  } | null;
  bookingType?: {
    id: string;
    name: string;
    description?: string | null;
    basePrice: Decimal;
  } | null;
  timeSlot?: {
    id: string;
    dateTime: Date | string;
    durationMin: number;
    isAvailable: boolean;
  } | null;
  discount?: {
    id: string;
    code: string;
    amount: Decimal;
  } | null;
};
@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Transform Prisma Session model to SessionResponseDto
   * Handles Decimal to string conversion and DateTime to ISO string
   */
  private toResponseDto(session: SessionWithRelations): SessionResponseDto {
    return {
      id: session.id,
      dateTime:
        session.dateTime instanceof Date ? session.dateTime.toISOString() : session.dateTime,
      durationMin: session.durationMin,
      price: session.price,
      isPaid: session.isPaid,
      status: session.status,
      notes: session.notes,
      paymentId: session.paymentId,
      discountCode: session.discountCode,
      calendarEventId: session.calendarEventId,
      userId: session.userId,
      coachId: session.coachId,
      bookingTypeId: session.bookingTypeId,
      timeSlotId: session.timeSlotId,
      discountId: session.discountId,
      createdAt:
        session.createdAt instanceof Date ? session.createdAt.toISOString() : session.createdAt,
      updatedAt:
        session.updatedAt instanceof Date ? session.updatedAt.toISOString() : session.updatedAt,
      // Transform relationships if present
      user: session.user
        ? {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
          }
        : undefined,
      coach: session.coach
        ? {
            id: session.coach.id,
            name: session.coach.name,
            email: session.coach.email,
          }
        : undefined,
      bookingType: session.bookingType
        ? {
            id: session.bookingType.id,
            name: session.bookingType.name,
            description: session.bookingType.description,
            basePrice: session.bookingType.basePrice.toString(),
          }
        : undefined,
      timeSlot: session.timeSlot
        ? {
            id: session.timeSlot.id,
            dateTime:
              session.timeSlot.dateTime instanceof Date
                ? session.timeSlot.dateTime.toISOString()
                : session.timeSlot.dateTime,
            durationMin: session.timeSlot.durationMin,
            isAvailable: session.timeSlot.isAvailable,
          }
        : undefined,
      discount: session.discount
        ? {
            id: session.discount.id,
            code: session.discount.code,
            amount: session.discount.amount.toString(),
          }
        : undefined,
    };
  }

  async findByUser(
    userId: string,
    role: Role,
    query?: GetSessionsQuery
  ): Promise<SessionResponseDto[]> {
    let status, startDate, endDate;
    if (query) {
      status = query.status;
      startDate = query.startDate;
      endDate = query.endDate;
    }

    const where =
      role === Role.USER || role === Role.PREMIUM_USER ? { userId } : { coachId: userId };

    const sessions = await this.prisma.session.findMany({
      where: {
        ...where,
        status: status ?? undefined,
        dateTime: {
          gte: startDate ? new Date(startDate) : undefined,
          lte: endDate ? new Date(endDate) : undefined,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        coach: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        bookingType: true,
        timeSlot: true,
        discount: true,
      },
      orderBy: { dateTime: 'desc' },
    });

    return sessions.map(session => this.toResponseDto(session));
  }

  async findUnique(id: string) {
    return this.prisma.session.findUnique({
      where: { id },
      include: {
        user: true,
        coach: true,
        bookingType: true,
      },
    });
  }

  async findOne(id: string, userId: string, role: Role): Promise<SessionResponseDto> {
    const session = await this.prisma.session.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        coach: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        bookingType: true,
        timeSlot: true,
        discount: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Check Authorization
    const isAuthorized =
      role === Role.USER || role === Role.PREMIUM_USER
        ? session.userId === userId
        : session.coachId === userId;

    if (!isAuthorized) {
      throw new ForbiddenException('Not authorized to view this session');
    }

    return this.toResponseDto(session);
  }
  async findFirst(id: string) {
    const session = await this.prisma.session.findFirst({
      where: { calendarEventId: id },
    });

    if (!session) {
      throw new BadRequestException('Session not found');
    }

    return session;
  }

  async create(createDto: CreateSessionDto, userId: string): Promise<SessionResponseDto> {
    const { bookingTypeId, timeSlotId, discountCode, notes } = createDto;

    // Get booking type
    const bookingType = await this.prisma.bookingType.findUnique({
      where: { id: bookingTypeId },
    });

    if (!bookingType?.isActive) {
      throw new BadRequestException('Invalid booking type');
    }

    // Get time slot
    const timeSlot = await this.prisma.timeSlot.findUnique({
      where: { id: timeSlotId },
    });

    if (!timeSlot?.isAvailable) {
      throw new BadRequestException('Time slot not available');
    }

    // Calculate price
    let price = Number(bookingType.basePrice);
    let discount: Discount | null = null;

    if (discountCode) {
      discount = await this.prisma.discount.findFirst({
        where: {
          code: discountCode,
          isActive: true,
          expiry: { gte: new Date() },
        },
      });

      if (discount) {
        price = Math.max(0, price - Number(discount.amount));
      }
    }

    // Create session
    const session = await this.prisma.session.create({
      data: {
        userId,
        coachId: bookingType.coachId,
        bookingTypeId,
        timeSlotId,
        discountId: discount?.code,
        dateTime: timeSlot.dateTime,
        durationMin: timeSlot.durationMin,
        price,
        discountCode,
        notes,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        coach: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        bookingType: true,
        timeSlot: true,
        discount: true,
      },
    });

    // Update discount usage
    if (discount) {
      await this.prisma.discount.update({
        where: { code: discount.code },
        data: { useCount: { increment: 1 } },
      });
    }

    return this.toResponseDto(session);
  }

  async update(
    id: string,
    updateDto: UpdateSessionDto,
    userId: string,
    role: Role
  ): Promise<SessionResponseDto> {
    const session = await this.findOne(id, userId, role);

    if (!session) {
      throw new BadRequestException('Session not found');
    }

    const updatedSession = await this.prisma.session.update({
      where: { id },
      data: updateDto,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        coach: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        bookingType: true,
        timeSlot: true,
        discount: true,
      },
    });

    return this.toResponseDto(updatedSession);
  }

  async cancel(id: string, userId: string, role: Role): Promise<SessionResponseDto> {
    const session = await this.findOne(id, userId, role);

    if (session.status === 'cancelled') {
      throw new BadRequestException('Session already cancelled');
    }

    if (new Date(session.dateTime) < new Date()) {
      throw new BadRequestException('Cannot cancel past sessions');
    }

    const cancelledSession = await this.prisma.session.update({
      where: { id },
      data: { status: 'cancelled' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        coach: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        bookingType: true,
        timeSlot: true,
        discount: true,
      },
    });

    return this.toResponseDto(cancelledSession);
  }
}
