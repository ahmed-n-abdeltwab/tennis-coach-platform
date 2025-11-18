import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { BookingType } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import {
  BookingTypeResponseDto,
  CreateBookingTypeDto,
  GetAllBookingTypeResponseDto,
  UpdateBookingTypeDto,
} from './dto/booking-type.dto';

@Injectable()
export class BookingTypesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Transform Prisma BookingType to BookingTypeResponseDto
   * Handles Decimal to string conversion for basePrice
   */
  private toResponseDto(bookingType: BookingType): BookingTypeResponseDto {
    return {
      id: bookingType.id,
      name: bookingType.name,
      description: bookingType.description ?? undefined,
      basePrice: bookingType.basePrice,
      isActive: bookingType.isActive,
      coachId: bookingType.coachId,
      createdAt: bookingType.createdAt.toISOString(),
      updatedAt: bookingType.updatedAt.toISOString(),
    };
  }

  async findAll(): Promise<GetAllBookingTypeResponseDto[]> {
    const data = await this.prisma.bookingType.findMany({
      where: { isActive: true },
      include: {
        coach: {
          select: {
            id: true,
            name: true,
            credentials: true,
          },
        },
      },
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
    return bookingTypes.map(bookingType => this.toResponseDto(bookingType));
  }

  async findOne(id: string): Promise<BookingTypeResponseDto> {
    const bookingType = await this.prisma.bookingType.findUnique({
      where: { id },
    });

    if (!bookingType) {
      throw new NotFoundException('Booking type not found');
    }

    return this.toResponseDto(bookingType);
  }

  async create(createDto: CreateBookingTypeDto, coachId: string): Promise<BookingTypeResponseDto> {
    const bookingType = await this.prisma.bookingType.create({
      data: {
        ...createDto,
        coachId,
      },
    });
    return this.toResponseDto(bookingType);
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

    if (!bookingType) {
      throw new NotFoundException('Booking type not found');
    }

    if (bookingType.coachId !== coachId) {
      throw new ForbiddenException('Not authorized to update this booking type');
    }

    const updatedBookingType = await this.prisma.bookingType.update({
      where: { id },
      data: updateDto,
    });

    return this.toResponseDto(updatedBookingType);
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
