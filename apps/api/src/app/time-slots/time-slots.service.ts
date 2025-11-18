import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { TimeSlot } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

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

    return timeSlots.map(timeSlot => this.toResponseDto(timeSlot));
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

    return timeSlots.map(timeSlot => this.toResponseDto(timeSlot));
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

    return timeSlots.map(timeSlot => this.toResponseDto(timeSlot));
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

    return this.toResponseDto(timeSlot);
  }

  async update(id: string, updateDto: UpdateTimeSlotDto): Promise<TimeSlotResponseDto> {
    const updatedData: any = { ...updateDto };

    // Convert dateTime string to Date if provided
    if (updateDto.dateTime) {
      updatedData.dateTime = new Date(updateDto.dateTime);
    }

    const timeSlot = await this.prisma.timeSlot.update({
      where: { id },
      data: updatedData,
    });

    return this.toResponseDto(timeSlot);
  }

  async create(createDto: CreateTimeSlotDto, coachId: string): Promise<TimeSlotResponseDto> {
    const timeSlot = await this.prisma.timeSlot.create({
      data: {
        ...createDto,
        dateTime: new Date(createDto.dateTime),
        coachId,
      },
    });

    return this.toResponseDto(timeSlot);
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

  private toResponseDto(
    timeSlot: TimeSlot & { coach?: { id: string; name: string; email: string } }
  ): TimeSlotResponseDto {
    return {
      id: timeSlot.id,
      coachId: timeSlot.coachId,
      dateTime: timeSlot.dateTime.toISOString(),
      durationMin: timeSlot.durationMin,
      isAvailable: timeSlot.isAvailable,
      createdAt: timeSlot.createdAt.toISOString(),
      updatedAt: timeSlot.updatedAt.toISOString(),
      coach: timeSlot.coach
        ? {
            id: timeSlot.coach.id,
            name: timeSlot.coach.name,
            email: timeSlot.coach.email,
          }
        : undefined,
    };
  }
}
