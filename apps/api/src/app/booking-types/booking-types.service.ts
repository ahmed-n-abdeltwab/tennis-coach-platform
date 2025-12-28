import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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

  async findAll(): Promise<GetAllBookingTypeResponseDto[]> {
    const data = await this.prisma.bookingType.findMany({
      where: { isActive: true },
    });
    return plainToInstance(GetAllBookingTypeResponseDto, data);
  }

  async findByCoach(coachId: string): Promise<BookingTypeResponseDto[]> {
    const bookingTypes = await this.prisma.bookingType.findMany({
      where: {
        coachId,
        isActive: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    return plainToInstance(BookingTypeResponseDto, bookingTypes);
  }

  async findOne(id: string): Promise<BookingTypeResponseDto> {
    const bookingType = await this.prisma.bookingType.findUnique({
      where: { id },
    });

    if (!bookingType) {
      throw new NotFoundException('Booking type not found');
    }

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
    // Verify ownership
    const bookingType = await this.prisma.bookingType.findUnique({
      where: { id },
    });

    if (!bookingType?.isActive) {
      throw new NotFoundException('Booking type not found');
    }

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
    // Verify ownership
    const bookingType = await this.prisma.bookingType.findUnique({
      where: { id },
    });

    if (!bookingType) {
      throw new NotFoundException('Booking type not found');
    }

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
