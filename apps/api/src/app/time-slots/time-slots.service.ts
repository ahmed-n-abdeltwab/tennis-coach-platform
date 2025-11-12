import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateTimeSlotDto, GetTimeSlotsQuery, UpdateTimeSlotDto } from './dto/time-slot.dto';

@Injectable()
export class TimeSlotsService {
  constructor(private prisma: PrismaService) {}

  async findAvailable(query: GetTimeSlotsQuery) {
    const { startDate, endDate, coachId } = query;

    return this.prisma.timeSlot.findMany({
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
          },
        },
      },
      orderBy: { dateTime: 'asc' },
    });
  }

  async findByCoach(coachId: string, query: GetTimeSlotsQuery) {
    const { startDate, endDate } = query;

    return this.prisma.timeSlot.findMany({
      where: {
        coachId,
        dateTime: {
          gte: startDate ? new Date(startDate) : new Date(),
          lte: endDate ? new Date(endDate) : undefined,
        },
      },
      orderBy: { dateTime: 'asc' },
    });
  }

  async update(id: string, updateDto: UpdateTimeSlotDto) {
    return this.prisma.timeSlot.update({
      where: { id },
      data: updateDto,
    });
  }

  async create(createDto: CreateTimeSlotDto, coachId: string) {
    return this.prisma.timeSlot.create({
      data: {
        ...createDto,
        dateTime: new Date(createDto.dateTime),
        coachId,
      },
    });
  }

  async remove(id: string, coachId: string) {
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

    return this.prisma.timeSlot.delete({
      where: { id },
    });
  }
}
