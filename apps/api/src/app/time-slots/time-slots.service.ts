import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { plainToInstance } from 'class-transformer';
import {
  CreateTimeSlotDto,
  GetTimeSlotsQuery,
  TimeSlotResponseDto,
  UpdateTimeSlotDto,
} from './dto/time-slot.dto';

@Injectable()
export class TimeSlotsService {
  constructor(private prisma: PrismaService) {}

  async findAvailable(query: GetTimeSlotsQuery): Promise<TimeSlotResponseDto[]> {
    const { startDate, endDate, coachId } = query;

    const timeSlots = await this.prisma.timeSlot.findMany({
      where: {
        isAvailable: true,
        dateTime: {
          gte: startDate ? new Date(startDate) : new Date(),
          lte: endDate ? new Date(endDate) : undefined,
        },
        coachId: coachId || undefined,
      },
      include: {
        coach: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { dateTime: 'asc' },
    });
    return plainToInstance(TimeSlotResponseDto, timeSlots);
  }

  async findByCoach(coachId: string, query: GetTimeSlotsQuery): Promise<TimeSlotResponseDto[]> {
    const { startDate, endDate } = query;

    const timeSlots = await this.prisma.timeSlot.findMany({
      where: {
        coachId,
        dateTime: {
          gte: startDate ? new Date(startDate) : new Date(),
          lte: endDate ? new Date(endDate) : undefined,
        },
      },
      orderBy: { dateTime: 'asc' },
    });
    return plainToInstance(TimeSlotResponseDto, timeSlots);
  }

  async findAll(): Promise<TimeSlotResponseDto[]> {
    const timeSlots = await this.prisma.timeSlot.findMany({
      include: {
        coach: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { dateTime: 'asc' },
    });
    return plainToInstance(TimeSlotResponseDto, timeSlots);
  }

  async findOne(id: string): Promise<TimeSlotResponseDto> {
    const timeSlot = await this.prisma.timeSlot.findUnique({
      where: { id },
      include: {
        coach: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!timeSlot) {
      throw new NotFoundException(`Time slot with ID ${id} not found`);
    }
    return plainToInstance(TimeSlotResponseDto, timeSlot);
  }

  async update(
    id: string,
    updateDto: UpdateTimeSlotDto,
    coachId: string
  ): Promise<TimeSlotResponseDto> {
    const timeSlot = await this.prisma.timeSlot.findUnique({
      where: { id },
    });

    if (!timeSlot) {
      throw new NotFoundException('Discount not found');
    }

    if (timeSlot.coachId !== coachId) {
      throw new ForbiddenException('Not authorized to update this time slot');
    }

    const updatedTimeSlot = await this.prisma.timeSlot.update({
      where: { id },
      data: updateDto,
    });
    return plainToInstance(TimeSlotResponseDto, updatedTimeSlot);
  }

  async create(createDto: CreateTimeSlotDto, coachId: string): Promise<TimeSlotResponseDto> {
    const timeSlot = await this.prisma.timeSlot.create({
      data: {
        ...createDto,
        dateTime: new Date(createDto.dateTime),
        coachId,
      },
    });
    return plainToInstance(TimeSlotResponseDto, timeSlot);
  }

  async remove(id: string, coachId: string): Promise<void> {
    // Verify ownership
    const timeSlot = await this.prisma.timeSlot.findUnique({
      where: { id },
    });

    if (!timeSlot) {
      throw new NotFoundException('Time slot not found');
    }

    if (timeSlot.coachId !== coachId) {
      throw new ForbiddenException('Not authorized to delete this time slot');
    }

    await this.prisma.timeSlot.delete({
      where: { id },
    });
  }
}
