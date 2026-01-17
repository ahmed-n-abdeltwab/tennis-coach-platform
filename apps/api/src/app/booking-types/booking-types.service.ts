import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingType, Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';

import { PrismaService } from '../prisma/prisma.service';

import {
  BookingTypeResponseDto,
  CreateBookingTypeDto,
  GetAllBookingTypeResponseDto,
  UpdateBookingTypeDto,
} from './dto/booking-type.dto';

/**
 * Standard include object for booking type queries.
 * Includes coach relation with selected fields for consistent responses.
 */
const BOOKING_TYPE_INCLUDE = {
  coach: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} as const;

@Injectable()
export class BookingTypesService {
  constructor(private prisma: PrismaService) {}

  private async findBookingTypeInternal<T extends Prisma.BookingTypeWhereInput>(
    where: T,
    options: { throwIfNotFound?: boolean; isMany?: boolean } = {}
  ) {
    const { throwIfNotFound = true, isMany = false } = options;

    // 1. Run the query based on if we expect one or many
    const result = isMany
      ? await this.prisma.bookingType.findMany({
          where,
          include: BOOKING_TYPE_INCLUDE,
          orderBy: { createdAt: 'desc' },
        })
      : await this.prisma.bookingType.findFirst({
          where,
          include: BOOKING_TYPE_INCLUDE,
        });

    // 2. Handle the "Not Found" case
    const isEmpty = isMany ? (result as BookingType[]).length === 0 : result === null;

    if (throwIfNotFound && isEmpty) {
      throw new NotFoundException('Booking Type not found');
    }

    return result;
  }

  /** Find booking type by ID - used by other services (e.g., SessionsService) */
  async findById(id: string): Promise<BookingTypeResponseDto> {
    const bookingType = (await this.findBookingTypeInternal({ id })) as BookingType;
    return plainToInstance(BookingTypeResponseDto, bookingType);
  }

  /** Find active booking type by ID - used by SessionsService for validation */
  async findActiveById(id: string): Promise<BookingTypeResponseDto | null> {
    const bookingType = (await this.findBookingTypeInternal(
      { id, isActive: true },
      { throwIfNotFound: false }
    )) as BookingType | null;
    return bookingType ? plainToInstance(BookingTypeResponseDto, bookingType) : null;
  }

  async findAll(isActive = true): Promise<GetAllBookingTypeResponseDto[]> {
    const bookingTypes = (await this.findBookingTypeInternal(
      { isActive },
      { isMany: true }
    )) as BookingType[];

    return plainToInstance(GetAllBookingTypeResponseDto, bookingTypes);
  }

  async findByCoach(coachId: string, isActive = true): Promise<BookingTypeResponseDto[]> {
    const bookingTypes = (await this.findBookingTypeInternal(
      {
        coachId,
        isActive,
      },
      { isMany: true }
    )) as BookingType[];

    return plainToInstance(BookingTypeResponseDto, bookingTypes);
  }

  async findOne(id: string): Promise<BookingTypeResponseDto> {
    const bookingType = (await this.findBookingTypeInternal({
      id,
    })) as BookingType;

    return plainToInstance(BookingTypeResponseDto, bookingType);
  }

  async create(createDto: CreateBookingTypeDto, coachId: string): Promise<BookingTypeResponseDto> {
    const bookingType = await this.prisma.bookingType.create({
      data: {
        ...createDto,
        coachId,
      },
    });
    return plainToInstance(BookingTypeResponseDto, bookingType);
  }

  async update(
    id: string,
    updateDto: UpdateBookingTypeDto,
    coachId: string
  ): Promise<BookingTypeResponseDto> {
    const bookingType = await this.findOne(id);

    if (bookingType.coachId !== coachId) {
      throw new ForbiddenException('Not authorized to update this booking type');
    }

    const updatedBookingType = await this.prisma.bookingType.update({
      where: { id },
      data: updateDto,
    });

    return plainToInstance(BookingTypeResponseDto, updatedBookingType);
  }

  async remove(id: string, coachId: string): Promise<void> {
    const bookingType = await this.findOne(id);

    if (bookingType.coachId !== coachId) {
      throw new ForbiddenException('Not authorized to delete this booking type');
    }

    // Soft delete by setting isActive to false
    await this.prisma.bookingType.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ============================================================
  // Analytics Methods (Service Layer Pattern)
  // ============================================================

  /**
   * Count all booking types - used by AnalyticsService
   * @param where - Optional Prisma where clause for filtering
   * @returns Count of matching booking types
   */
  async countBookingTypes(where?: Prisma.BookingTypeWhereInput): Promise<number> {
    return this.prisma.bookingType.count({ where });
  }

  /**
   * Find booking types by IDs - used by AnalyticsService for top booking types
   * @param ids - Array of booking type IDs
   * @returns Array of booking types with id, name, and basePrice
   */
  async findByIds(
    ids: string[]
  ): Promise<Array<{ id: string; name: string; basePrice: Prisma.Decimal }>> {
    const bookingTypes = await this.prisma.bookingType.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        basePrice: true,
      },
    });
    return bookingTypes;
  }
}
