import { Role } from '@auth-helpers';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Discount } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

import { CreateSessionDto, GetSessionsQuery, UpdateSessionDto } from './dto/session.dto';

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  async findByUser(userId: string, role: Role, query: GetSessionsQuery) {
    const { status, startDate, endDate } = query;

    const where =
      role === Role.USER || role === Role.PREMIUM_USER ? { userId } : { coachId: userId };

    return this.prisma.session.findMany({
      where: {
        ...where,
        status: status || undefined,
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
      },
      orderBy: { dateTime: 'desc' },
    });
  }

  async findOne(id: string, userId: string, role: Role) {
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

    // Check authorization
    const isAuthorized =
      role === Role.USER || role === Role.PREMIUM_USER
        ? session.userId === userId
        : session.coachId === userId;

    if (!isAuthorized) {
      throw new ForbiddenException('Not authorized to view this session');
    }

    return session;
  }

  async create(createDto: CreateSessionDto, userId: string) {
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
      },
    });

    // Update discount usage
    if (discount) {
      await this.prisma.discount.update({
        where: { code: discount.code },
        data: { useCount: { increment: 1 } },
      });
    }

    return session;
  }

  async update(id: string, updateDto: UpdateSessionDto, userId: string, role: Role) {
    const session = await this.findOne(id, userId, role);

    return this.prisma.session.update({
      where: { id },
      data: updateDto,
    });
  }

  async cancel(id: string, userId: string, role: Role) {
    const session = await this.findOne(id, userId, role);

    if (session.status === 'cancelled') {
      throw new BadRequestException('Session already cancelled');
    }

    if (session.dateTime < new Date()) {
      throw new BadRequestException('Cannot cancel past sessions');
    }

    return this.prisma.session.update({
      where: { id },
      data: { status: 'cancelled' },
    });
  }
}
