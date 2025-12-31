import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TimeSlot } from '@prisma/client';
import { plainToInstance } from 'class-transformer';

import { PrismaService } from '../prisma/prisma.service';

import {
  CreateTimeSlotDto,
  GetTimeSlotsQuery,
  TimeSlotResponseDto,
  UpdateTimeSlotDto,
} from './dto/time-slot.dto';

const TIME_SLOT_INCLUDE = {
  coach: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
};

@Injectable()
export class TimeSlotsService {
  constructor(private prisma: PrismaService) {}

  private async findTimeSlotInternal<T extends Prisma.TimeSlotWhereInput>(
    where: T,
    options: { throwIfNotFound?: boolean; isMany?: boolean } = {}
  ) {
    const { throwIfNotFound = true, isMany = false } = options;

    const result = isMany
      ? await this.prisma.timeSlot.findMany({
          where,
          include: TIME_SLOT_INCLUDE,
          orderBy: { dateTime: 'asc' },
        })
      : await this.prisma.timeSlot.findFirst({
          where,
          include: TIME_SLOT_INCLUDE,
        });

    const isEmpty = isMany ? (result as any[]).length === 0 : result === null;

    if (throwIfNotFound && isEmpty) {
      throw new NotFoundException('Time slot not found');
    }

    return result;
  }

  /** Find time slot by ID - used by other services */
  async findById(id: string): Promise<TimeSlotResponseDto> {
    const timeSlot = (await this.findTimeSlotInternal({ id })) as TimeSlot;
    return plainToInstance(TimeSlotResponseDto, timeSlot);
  }

  /** Mark time slot as unavailable - used by PaymentsService after successful payment */
  async markAsUnavailableInternal(id: string): Promise<void> {
    await this.findTimeSlotInternal({ id }); // Verify exists
    await this.prisma.timeSlot.update({
      where: { id },
      data: { isAvailable: false },
    });
  }

  /** Find available time slot by ID - used by SessionsService for validation */
  async findAvailableById(id: string): Promise<TimeSlotResponseDto | null> {
    const timeSlot = (await this.findTimeSlotInternal(
      { id, isAvailable: true },
      { throwIfNotFound: false }
    )) as TimeSlot | null;
    return timeSlot ? plainToInstance(TimeSlotResponseDto, timeSlot) : null;
  }

  async findAvailable(query: GetTimeSlotsQuery): Promise<TimeSlotResponseDto[]> {
    const { startDate, endDate, coachId } = query;

    const timeSlots = (await this.findTimeSlotInternal(
      {
        isAvailable: true,
        coachId: coachId ?? undefined,
        dateTime: {
          gte: startDate ? new Date(startDate) : new Date(),
          lte: endDate ? new Date(endDate) : undefined,
        },
      },
      { isMany: true, throwIfNotFound: false }
    )) as TimeSlot[];

    return plainToInstance(TimeSlotResponseDto, timeSlots);
  }

  async findByCoach(coachId: string, query: GetTimeSlotsQuery): Promise<TimeSlotResponseDto[]> {
    const { startDate, endDate } = query;

    const timeSlots = (await this.findTimeSlotInternal(
      {
        coachId,
        dateTime: {
          gte: startDate ? new Date(startDate) : new Date(),
          lte: endDate ? new Date(endDate) : undefined,
        },
      },
      { isMany: true, throwIfNotFound: false }
    )) as TimeSlot[];

    return plainToInstance(TimeSlotResponseDto, timeSlots);
  }

  async findOne(id: string): Promise<TimeSlotResponseDto> {
    const timeSlot = (await this.findTimeSlotInternal({ id })) as TimeSlot;
    return plainToInstance(TimeSlotResponseDto, timeSlot);
  }

  async create(createDto: CreateTimeSlotDto, coachId: string): Promise<TimeSlotResponseDto> {
    const timeSlot = await this.prisma.timeSlot.create({
      data: {
        ...createDto,
        dateTime: new Date(createDto.dateTime),
        coachId,
      },
      include: TIME_SLOT_INCLUDE,
    });
    return plainToInstance(TimeSlotResponseDto, timeSlot);
  }

  async update(
    id: string,
    updateDto: UpdateTimeSlotDto,
    coachId: string
  ): Promise<TimeSlotResponseDto> {
    const timeSlot = (await this.findTimeSlotInternal({ id })) as TimeSlot;

    if (timeSlot.coachId !== coachId) {
      throw new ForbiddenException('Not authorized to update this time slot');
    }

    const updated = await this.prisma.timeSlot.update({
      where: { id },
      data: {
        ...updateDto,
        dateTime: updateDto.dateTime ? new Date(updateDto.dateTime) : undefined,
      },
      include: TIME_SLOT_INCLUDE,
    });

    return plainToInstance(TimeSlotResponseDto, updated);
  }

  async remove(id: string, coachId: string): Promise<void> {
    const timeSlot = (await this.findTimeSlotInternal({ id })) as TimeSlot;

    if (timeSlot.coachId !== coachId) {
      throw new ForbiddenException('Not authorized to delete this time slot');
    }

    await this.prisma.timeSlot.delete({ where: { id } });
  }
}
