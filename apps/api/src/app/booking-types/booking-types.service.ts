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
      ? await this.prisma.bookingType.findMany({ where })
      : await this.prisma.bookingType.findFirst({ where }); // findFirst returns Object | null

    // 2. Handle the "Not Found" case
    const isEmpty = isMany ? (result as any[]).length === 0 : result === null;

    if (throwIfNotFound && isEmpty) {
      throw new NotFoundException('Booking Type not found');
    }

    return result;
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
}
