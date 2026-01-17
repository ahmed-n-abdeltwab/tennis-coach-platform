import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, Session, SessionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { plainToInstance } from 'class-transformer';

import { BookingTypesService } from '../booking-types/booking-types.service';
import { DiscountsService } from '../discounts/discounts.service';
import { NotificationsService } from '../notifications/notifications.service';
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
    private discountsService: DiscountsService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService
  ) {}

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

    const isEmpty = Array.isArray(result) ? result.length === 0 : result === null;

    if (throwIfNotFound && isEmpty) {
      throw new NotFoundException('Session not found');
    }

    return result;
  }

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

  async findByUser(
    userId: string,
    role: Role,
    query?: GetSessionsQuery
  ): Promise<SessionResponseDto[]> {
    const { status, startDate, endDate } = query ?? {};

    // Determine filter based on role
    const roleFilter = role === Role.USER ? { userId } : { coachId: userId };

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
    const isClientRole = ([Role.USER] as Role[]).includes(role);
    // 2. Logic to determine if the user owns this session
    const isAuthorized = isClientRole ? session.userId === userId : session.coachId === userId;

    // 3. Throw exception ONLY if they are NOT authorized
    if (!isAuthorized) {
      throw new ForbiddenException('Not authorized to access this session');
    }

    return plainToInstance(SessionResponseDto, session);
  }

  /** Maximum number of pending (unpaid) bookings a user can have */
  private static readonly MAX_PENDING_BOOKINGS = 3;

  async create(createDto: CreateSessionDto, userId: string): Promise<SessionResponseDto> {
    const { bookingTypeId, timeSlotId, discountCode, notes } = createDto;

    // 1. Check user's pending bookings limit to prevent abuse
    const pendingBookingsCount = await this.prisma.session.count({
      where: {
        userId,
        isPaid: false,
        status: SessionStatus.SCHEDULED,
      },
    });

    if (pendingBookingsCount >= SessionsService.MAX_PENDING_BOOKINGS) {
      throw new BadRequestException(
        `Maximum pending bookings (${SessionsService.MAX_PENDING_BOOKINGS}) reached. Please complete payment for existing bookings.`
      );
    }

    // 2. Validate Booking Type using BookingTypesService internal method
    const bookingType = await this.bookingTypesService.findActiveById(bookingTypeId);

    if (!bookingType) {
      throw new BadRequestException('Invalid booking type');
    }

    // 3. Validate Time Slot using TimeSlotsService internal method
    const timeSlot = await this.timeSlotsService.findAvailableById(timeSlotId);

    if (!timeSlot) {
      throw new BadRequestException('Time slot not available');
    }

    // 4. Calculate Price & Apply Discount
    let price = new Decimal(bookingType.basePrice);
    let discountId: string | undefined;
    let appliedDiscountCode: string | undefined;

    if (discountCode) {
      // Use DiscountsService internal method to find active discount
      const discount = await this.discountsService.findActiveByCode(discountCode);

      if (discount) {
        price = Decimal.max(0, price.sub(discount.amount));
        discountId = discount.id;
        appliedDiscountCode = discount.code;
      }
    }

    // 5. Create Session
    // For free sessions (price = 0), automatically mark as paid
    const isFreeSession = price.equals(new Decimal(0)) || price.lessThanOrEqualTo(new Decimal(0));

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
        isPaid: isFreeSession, // Free sessions are automatically marked as paid
        status: isFreeSession ? SessionStatus.CONFIRMED : SessionStatus.SCHEDULED,
      },
      include: SESSION_INCLUDE,
    });

    // 6. Mark time slot as unavailable immediately after booking
    await this.timeSlotsService.markAsUnavailableInternal(timeSlotId);

    // 7. Update discount usage if applicable using DiscountsService internal method
    if (appliedDiscountCode) {
      await this.discountsService.incrementUsageInternal(appliedDiscountCode);
    }

    // 8. Send booking confirmation notification
    try {
      await this.notificationsService.sendBookingConfirmationNotification(
        session.id,
        session.userId,
        session.coachId,
        session.dateTime
      );
    } catch (error) {
      // Log error but don't fail the booking
      console.error('Failed to send booking confirmation notification:', error);
    }

    return plainToInstance(SessionResponseDto, session);
  }

  /**
   * Send booking reminders for upcoming sessions
   * This method would typically be called by a scheduled job
   */
  async sendBookingReminders(): Promise<void> {
    // Find sessions that are 24 hours away and haven't been reminded yet
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const startOfDay = new Date(tomorrow);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(tomorrow);
    endOfDay.setHours(23, 59, 59, 999);

    const upcomingSessions = await this.prisma.session.findMany({
      where: {
        dateTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: [SessionStatus.SCHEDULED, SessionStatus.CONFIRMED],
        },
        // Add a field to track if reminder was sent to avoid duplicates
        // reminderSent: false, // This would need to be added to the schema
      },
      include: SESSION_INCLUDE,
    });

    // Send reminders for each session
    for (const session of upcomingSessions) {
      try {
        await this.notificationsService.sendBookingReminder(
          session.id,
          session.userId,
          session.coachId,
          session.dateTime
        );

        // Mark reminder as sent (would need to add this field to schema)
        // await this.prisma.session.update({
        //   where: { id: session.id },
        //   data: { reminderSent: true },
        // });
      } catch (error) {
        console.error(`Failed to send reminder for session ${session.id}:`, error);
      }
    }
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
      role === Role.USER ? session.userId === userId : session.coachId === userId;

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

    // 4. Mark time slot as available again so others can book it
    await this.timeSlotsService.markAsAvailableInternal(session.timeSlotId);

    return plainToInstance(SessionResponseDto, cancelledSession);
  }

  // ============================================================
  // Analytics Methods (Service Layer Pattern)
  // ============================================================

  /**
   * Count sessions with optional filters - used by AnalyticsService
   * @param where - Optional Prisma where clause for filtering
   * @returns Count of matching sessions
   */
  async countSessions(where?: Prisma.SessionWhereInput): Promise<number> {
    return this.prisma.session.count({ where });
  }

  /**
   * Count sessions grouped by status - used by AnalyticsService
   * @param where - Optional Prisma where clause for filtering
   * @returns Array of status counts
   */
  async countByStatus(
    where?: Prisma.SessionWhereInput
  ): Promise<Array<{ status: SessionStatus; count: number }>> {
    const result = await this.prisma.session.groupBy({
      by: ['status'],
      where,
      _count: { status: true },
    });

    return result.map(group => ({
      status: group.status,
      count: group._count.status,
    }));
  }

  /**
   * Get average session duration - used by AnalyticsService
   * @param where - Optional Prisma where clause for filtering
   * @returns Average duration in minutes or null if no sessions
   */
  async getAverageDuration(where?: Prisma.SessionWhereInput): Promise<number | null> {
    const result = await this.prisma.session.aggregate({
      where,
      _avg: { durationMin: true },
    });
    return result._avg?.durationMin ?? null;
  }

  /**
   * Get completed sessions with revenue data - used by AnalyticsService
   * @param where - Optional Prisma where clause for filtering
   * @returns Array of sessions with bookingType and discount for revenue calculation
   */
  async getCompletedSessionsWithRevenue(where?: Prisma.SessionWhereInput): Promise<
    Array<{
      bookingType: { basePrice: Prisma.Decimal };
      discount: { amount: Prisma.Decimal } | null;
    }>
  > {
    const sessions = await this.prisma.session.findMany({
      where: {
        ...where,
        status: SessionStatus.COMPLETED,
      },
      select: {
        bookingType: {
          select: { basePrice: true },
        },
        discount: {
          select: { amount: true },
        },
      },
    });
    return sessions;
  }

  /**
   * Get sessions with time slot data for hourly distribution - used by AnalyticsService
   * @param where - Optional Prisma where clause for filtering
   * @returns Array of sessions with timeSlot dateTime
   */
  async getSessionsWithTimeSlots(
    where?: Prisma.SessionWhereInput
  ): Promise<Array<{ timeSlot: { dateTime: Date } | null }>> {
    const sessions = await this.prisma.session.findMany({
      where,
      select: {
        timeSlot: {
          select: { dateTime: true },
        },
      },
    });
    return sessions;
  }

  /**
   * Get sessions grouped by booking type - used by AnalyticsService
   * @param where - Optional Prisma where clause for filtering
   * @param limit - Maximum number of booking types to return
   * @returns Array of booking type IDs with session counts
   */
  async getSessionCountByBookingType(
    where?: Prisma.SessionWhereInput,
    limit = 5
  ): Promise<Array<{ bookingTypeId: string; count: number }>> {
    const result = await this.prisma.session.groupBy({
      by: ['bookingTypeId'],
      where,
      _count: { bookingTypeId: true },
      orderBy: { _count: { bookingTypeId: 'desc' } },
      take: limit,
    });

    return result.map(group => ({
      bookingTypeId: group.bookingTypeId,
      count: group._count.bookingTypeId,
    }));
  }

  /**
   * Get monthly session data for revenue breakdown - used by AnalyticsService
   * @param where - Optional Prisma where clause for filtering
   * @returns Array of sessions with createdAt, bookingType, and discount
   */
  async getSessionsForMonthlyRevenue(where?: Prisma.SessionWhereInput): Promise<
    Array<{
      createdAt: Date;
      bookingType: { basePrice: Prisma.Decimal };
      discount: { amount: Prisma.Decimal } | null;
    }>
  > {
    const sessions = await this.prisma.session.findMany({
      where,
      select: {
        createdAt: true,
        bookingType: {
          select: { basePrice: true },
        },
        discount: {
          select: { amount: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return sessions;
  }

  /**
   * Get distinct client IDs for a coach - used by AnalyticsService
   * @param coachId - The coach's ID
   * @returns Array of unique user IDs who have sessions with the coach
   */
  async getClientIdsByCoach(coachId: string): Promise<string[]> {
    const sessions = await this.prisma.session.findMany({
      where: { coachId },
      select: { userId: true },
      distinct: ['userId'],
    });
    return sessions.map(session => session.userId);
  }
}
