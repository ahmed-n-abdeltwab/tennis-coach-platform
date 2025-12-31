import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, Session, SessionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { plainToInstance } from 'class-transformer';

import { BookingTypesService } from '../booking-types/booking-types.service';
import { DiscountsService } from '../discounts/discounts.service';
import { PrismaService } from '../prisma/prisma.service';
import { TimeSlotsService } from '../time-slots/time-slots.service';

import {
  CreateSessionDto,
  GetSessionsQuery,
  SessionResponseDto,
  UpdateSessionDto,
} from './dto/session.dto';

// Standard include object to reuse across queries
const SESSION_INCLUDE = {
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
};

@Injectable()
export class SessionsService {
  constructor(
    private prisma: PrismaService,
    private bookingTypesService: BookingTypesService,
    private timeSlotsService: TimeSlotsService,
    private discountsService: DiscountsService
  ) {}

  // ═══════════════════════════════════════════════════════════════════════
  // PRIVATE: Internal Find Function
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Internal helper to standardize finding sessions.
   * Handles "Not Found" exceptions and consistent 'include' logic.
   */
  private async findSessionInternal<T extends Prisma.SessionWhereInput>(
    where: T,
    options: { throwIfNotFound?: boolean; isMany?: boolean } = {}
  ) {
    const { throwIfNotFound = true, isMany = false } = options;

    const result = isMany
      ? await this.prisma.session.findMany({
          where,
          include: SESSION_INCLUDE,
          orderBy: { dateTime: 'desc' },
        })
      : await this.prisma.session.findFirst({
          where,
          include: SESSION_INCLUDE,
        });

    const isEmpty = isMany ? (result as any[]).length === 0 : result === null;

    if (throwIfNotFound && isEmpty) {
      throw new NotFoundException('Session not found');
    }

    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // INTERNAL METHODS (for other services - no authorization)
  // ═══════════════════════════════════════════════════════════════════════

  /** Find session by ID - used by other services */
  async findById(id: string): Promise<SessionResponseDto> {
    const session = (await this.findSessionInternal({ id })) as Session;
    return plainToInstance(SessionResponseDto, session);
  }

  /** Find session by calendar event ID - used by CalendarService */
  async findFirstByCalendarId(calendarEventId: string): Promise<SessionResponseDto> {
    const session = (await this.findSessionInternal({
      calendarEventId,
    })) as Session;

    return plainToInstance(SessionResponseDto, session);
  }

  /** Mark session as paid - used by PaymentsService after successful payment */
  async markAsPaidInternal(id: string, paymentId: string): Promise<void> {
    await this.findSessionInternal({ id }); // Verify exists
    await this.prisma.session.update({
      where: { id },
      data: { isPaid: true, paymentId },
    });
  }

  /** Update calendar event ID - used by CalendarService */
  async updateCalendarEventInternal(id: string, calendarEventId: string | null): Promise<void> {
    await this.findSessionInternal({ id }); // Verify exists
    await this.prisma.session.update({
      where: { id },
      data: { calendarEventId: calendarEventId ?? undefined },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CONTROLLER METHODS (with authorization checks)
  // ═══════════════════════════════════════════════════════════════════════

  async findByUser(
    userId: string,
    role: Role,
    query?: GetSessionsQuery
  ): Promise<SessionResponseDto[]> {
    const { status, startDate, endDate } = query ?? {};

    // Determine filter based on role
    const roleFilter =
      role === Role.USER || role === Role.PREMIUM_USER ? { userId } : { coachId: userId };

    const where: Prisma.SessionWhereInput = {
      ...roleFilter,
      status: status ?? undefined,
      dateTime: {
        gte: startDate ? new Date(startDate) : undefined,
        lte: endDate ? new Date(endDate) : undefined,
      },
    };

    const sessions = (await this.findSessionInternal(where, {
      isMany: true,
      throwIfNotFound: false, // Return empty array if no sessions found
    })) as Session[];

    return plainToInstance(SessionResponseDto, sessions);
  }

  async findOne(id: string, userId: string, role: Role): Promise<SessionResponseDto> {
    const session = (await this.findSessionInternal({ id })) as Session;

    // 1. Correct way to check for multiple roles
    const isClientRole = ([Role.USER, Role.PREMIUM_USER] as Role[]).includes(role);
    // 2. Logic to determine if the user owns this session
    const isAuthorized = isClientRole ? session.userId === userId : session.coachId === userId;

    // 3. Throw exception ONLY if they are NOT authorized
    if (!isAuthorized) {
      throw new ForbiddenException('Not authorized to access this session');
    }

    return plainToInstance(SessionResponseDto, session);
  }

  async create(createDto: CreateSessionDto, userId: string): Promise<SessionResponseDto> {
    const { bookingTypeId, timeSlotId, discountCode, notes } = createDto;

    // 1. Validate Booking Type using BookingTypesService internal method
    const bookingType = await this.bookingTypesService.findActiveById(bookingTypeId);

    if (!bookingType) {
      throw new BadRequestException('Invalid booking type');
    }

    // 2. Validate Time Slot using TimeSlotsService internal method
    const timeSlot = await this.timeSlotsService.findAvailableById(timeSlotId);

    if (!timeSlot) {
      throw new BadRequestException('Time slot not available');
    }

    // 3. Calculate Price & Apply Discount
    let price = bookingType.basePrice;
    let discountId: string | undefined;
    let appliedDiscountCode: string | undefined;

    if (discountCode) {
      // Use DiscountsService internal method to find active discount
      const discount = await this.discountsService.findActiveByCode(discountCode);

      if (discount) {
        price = Decimal.max(0, new Decimal(price).sub(discount.amount));
        discountId = discount.id;
        appliedDiscountCode = discount.code;
      }
    }

    // 4. Create Session
    const session = await this.prisma.session.create({
      data: {
        userId,
        coachId: bookingType.coachId,
        bookingTypeId,
        timeSlotId,
        discountId,
        dateTime: timeSlot.dateTime,
        durationMin: timeSlot.durationMin,
        price,
        discountCode,
        notes,
      },
      include: SESSION_INCLUDE,
    });

    // 5. Update discount usage if applicable using DiscountsService internal method
    if (appliedDiscountCode) {
      await this.discountsService.incrementUsageInternal(appliedDiscountCode);
    }

    return plainToInstance(SessionResponseDto, session);
  }

  async update(
    id: string,
    updateDto: UpdateSessionDto,
    userId: string,
    role: Role
  ): Promise<SessionResponseDto> {
    // Ensure session exists and user is authorized
    await this.findOne(id, userId, role);

    const updatedSession = await this.prisma.session.update({
      where: { id },
      data: updateDto,
      include: SESSION_INCLUDE,
    });

    return plainToInstance(SessionResponseDto, updatedSession);
  }

  async cancel(id: string, userId: string, role: Role): Promise<SessionResponseDto> {
    // 1. Fetch session and check auth
    // We fetch the raw Prisma object first to check dates/status
    const session = (await this.findSessionInternal({ id })) as Session;

    const isAuthorized =
      role === Role.USER || role === Role.PREMIUM_USER
        ? session.userId === userId
        : session.coachId === userId;

    if (!isAuthorized) {
      throw new ForbiddenException('Not authorized to cancel this session');
    }

    // 2. Validate cancellation rules
    if (session.status === SessionStatus.CANCELLED) {
      throw new BadRequestException('Session already cancelled');
    }

    if (new Date(session.dateTime) < new Date()) {
      throw new BadRequestException('Cannot cancel past sessions');
    }

    // 3. Perform update
    const cancelledSession = await this.prisma.session.update({
      where: { id },
      data: { status: SessionStatus.CANCELLED },
      include: SESSION_INCLUDE,
    });

    return plainToInstance(SessionResponseDto, cancelledSession);
  }
}
