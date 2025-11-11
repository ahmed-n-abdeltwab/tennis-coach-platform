import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { BookingType } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import {
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

  async findByCoach(coachId: string): Promise<BookingType[]> {
    return this.prisma.bookingType.findMany({
      where: {
        coachId,
        isActive: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(createDto: CreateBookingTypeDto, coachId: string): Promise<BookingType> {
    return this.prisma.bookingType.create({
      data: {
        ...createDto,
        coachId,
      },
    });
  }

  async update(id: string, updateDto: UpdateBookingTypeDto, coachId: string): Promise<BookingType> {
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

    return this.prisma.bookingType.update({
      where: { id },
      data: updateDto,
    });
  }

  async remove(id: string, coachId: string): Promise<BookingType> {
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
    return this.prisma.bookingType.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
