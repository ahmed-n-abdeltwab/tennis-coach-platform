import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ServiceTest } from '@test-utils';

import { PrismaService } from '../prisma/prisma.service';

import { CreateTimeSlotDto, GetTimeSlotsQuery, UpdateTimeSlotDto } from './dto/time-slot.dto';
import { TimeSlotsService } from './time-slots.service';

describe.skip('TimeSlotsService', () => {
  let test: ServiceTest<TimeSlotsService, PrismaService>;

  beforeEach(async () => {
    const mockPrisma = {
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      $transaction: jest.fn(),
      $executeRaw: jest.fn(),
      $queryRaw: jest.fn(),
      timeSlot: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    test = new ServiceTest({
      serviceClass: TimeSlotsService,
      mocks: [{ provide: PrismaService, useValue: mockPrisma }],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('findAvailable', () => {
    it('should return available time slots with default date filter', async () => {
      const query: GetTimeSlotsQuery = {};
      const mockTimeSlots = [
        {
          id: 'slot-1',
          coachId: 'coach-1',
          dateTime: new Date('2024-12-25T10:00:00Z'),
          durationMin: 60,
          isAvailable: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          coach: {
            id: 'coach-1',
            name: 'John Doe',
            email: 'john@example.com',
          },
        },
        {
          id: 'slot-2',
          coachId: 'coach-2',
          dateTime: new Date('2024-12-26T14:00:00Z'),
          durationMin: 60,
          isAvailable: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          coach: {
            id: 'coach-2',
            name: 'Jane Smith',
            email: 'jane@example.com',
          },
        },
      ];

      test.prisma.timeSlot.findMany.mockResolvedValue(mockTimeSlots);

      const result = await test.service.findAvailable(query);

      expect(result).toHaveLength(2);
      expect(test.prisma.timeSlot.findMany).toHaveBeenCalledWith({
        where: {
          isAvailable: true,
          dateTime: {
            gte: expect.any(Date),
            lte: undefined,
          },
          coachId: undefined,
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
    });

    it('should filter by date range when provided', async () => {
      const query: GetTimeSlotsQuery = {
        startDate: '2024-12-25T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
      };
      const mockTimeSlots = [
        {
          id: 'slot-1',
          coachId: 'coach-1',
          dateTime: new Date('2024-12-25T10:00:00Z'),
          durationMin: 60,
          isAvailable: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          coach: {
            id: 'coach-1',
            name: 'John Doe',
            email: 'john@example.com',
          },
        },
      ];

      test.prisma.timeSlot.findMany.mockResolvedValue(mockTimeSlots);

      const result = await test.service.findAvailable(query);

      expect(result).toHaveLength(1);
      expect(test.prisma.timeSlot.findMany).toHaveBeenCalledWith({
        where: {
          isAvailable: true,
          dateTime: {
            gte: new Date('2024-12-25T00:00:00Z'),
            lte: new Date('2024-12-31T23:59:59Z'),
          },
          coachId: undefined,
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
    });

    it('should filter by coachId when provided', async () => {
      const query: GetTimeSlotsQuery = {
        coachId: 'coach-1',
      };
      const mockTimeSlots = [
        {
          id: 'slot-1',
          coachId: 'coach-1',
          dateTime: new Date('2024-12-25T10:00:00Z'),
          durationMin: 60,
          isAvailable: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          coach: {
            id: 'coach-1',
            name: 'John Doe',
            email: 'john@example.com',
          },
        },
      ];

      test.prisma.timeSlot.findMany.mockResolvedValue(mockTimeSlots);

      const result = await test.service.findAvailable(query);

      expect(result).toHaveLength(1);
      expect(test.prisma.timeSlot.findMany).toHaveBeenCalledWith({
        where: {
          isAvailable: true,
          dateTime: {
            gte: expect.any(Date),
            lte: undefined,
          },
          coachId: 'coach-1',
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
    });

    it('should return empty array when no available slots found', async () => {
      const query: GetTimeSlotsQuery = {};
      test.prisma.timeSlot.findMany.mockResolvedValue([]);

      const result = await test.service.findAvailable(query);

      expect(result).toEqual([]);
      expect(test.prisma.timeSlot.findMany).toHaveBeenCalled();
    });
  });

  describe('findByCoach', () => {
    it('should return time slots for specific coach', async () => {
      const coachId = 'coach-1';
      const query: GetTimeSlotsQuery = {};
      const mockTimeSlots = [
        {
          id: 'slot-1',
          coachId: 'coach-1',
          dateTime: new Date('2024-12-25T10:00:00Z'),
          durationMin: 60,
          isAvailable: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'slot-2',
          coachId: 'coach-1',
          dateTime: new Date('2024-12-26T14:00:00Z'),
          durationMin: 60,
          isAvailable: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      test.prisma.timeSlot.findMany.mockResolvedValue(mockTimeSlots);

      const result = await test.service.findByCoach(coachId, query);

      expect(result).toHaveLength(2);
      expect(test.prisma.timeSlot.findMany).toHaveBeenCalledWith({
        where: {
          coachId: 'coach-1',
          dateTime: {
            gte: expect.any(Date),
            lte: undefined,
          },
        },
        orderBy: { dateTime: 'asc' },
      });
    });

    it('should filter by date range for coach time slots', async () => {
      const coachId = 'coach-1';
      const query: GetTimeSlotsQuery = {
        startDate: '2024-12-25T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
      };
      const mockTimeSlots = [
        {
          id: 'slot-1',
          coachId: 'coach-1',
          dateTime: new Date('2024-12-25T10:00:00Z'),
          durationMin: 60,
          isAvailable: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      test.prisma.timeSlot.findMany.mockResolvedValue(mockTimeSlots);

      const result = await test.service.findByCoach(coachId, query);

      expect(result).toHaveLength(1);
      expect(test.prisma.timeSlot.findMany).toHaveBeenCalledWith({
        where: {
          coachId: 'coach-1',
          dateTime: {
            gte: new Date('2024-12-25T00:00:00Z'),
            lte: new Date('2024-12-31T23:59:59Z'),
          },
        },
        orderBy: { dateTime: 'asc' },
      });
    });

    it('should return empty array when coach has no time slots', async () => {
      const coachId = 'coach-1';
      const query: GetTimeSlotsQuery = {};
      test.prisma.timeSlot.findMany.mockResolvedValue([]);

      const result = await test.service.findByCoach(coachId, query);

      expect(result).toEqual([]);
      expect(test.prisma.timeSlot.findMany).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all time slots', async () => {
      const mockTimeSlots = [
        {
          id: 'slot-1',
          coachId: 'coach-1',
          dateTime: new Date('2024-12-25T10:00:00Z'),
          durationMin: 60,
          isAvailable: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          coach: {
            id: 'coach-1',
            name: 'John Doe',
            email: 'john@example.com',
          },
        },
        {
          id: 'slot-2',
          coachId: 'coach-2',
          dateTime: new Date('2024-12-26T14:00:00Z'),
          durationMin: 60,
          isAvailable: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          coach: {
            id: 'coach-2',
            name: 'Jane Smith',
            email: 'jane@example.com',
          },
        },
      ];

      test.prisma.timeSlot.findMany.mockResolvedValue(mockTimeSlots);

      const result = await test.service.findAll();

      expect(result).toHaveLength(2);
      expect(test.prisma.timeSlot.findMany).toHaveBeenCalledWith({
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
    });

    it('should return empty array when no time slots exist', async () => {
      test.prisma.timeSlot.findMany.mockResolvedValue([]);

      const result = await test.service.findAll();

      expect(result).toEqual([]);
      expect(test.prisma.timeSlot.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a time slot by ID', async () => {
      const id = 'slot-1';
      const mockTimeSlot = {
        id: 'slot-1',
        coachId: 'coach-1',
        dateTime: new Date('2024-12-25T10:00:00Z'),
        durationMin: 60,
        isAvailable: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        coach: {
          id: 'coach-1',
          name: 'John Doe',
          email: 'john@example.com',
        },
      };

      test.prisma.timeSlot.findUnique.mockResolvedValue(mockTimeSlot);

      const result = await test.service.findOne(id);

      expect(result).toBeDefined();
      expect(result.id).toBe('slot-1');
      expect(test.prisma.timeSlot.findUnique).toHaveBeenCalledWith({
        where: { id: 'slot-1' },
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
    });

    it('should throw NotFoundException when time slot not found', async () => {
      const id = 'non-existent-id';
      test.prisma.timeSlot.findUnique.mockResolvedValue(null);

      await expect(test.service.findOne(id)).rejects.toThrow(NotFoundException);
      await expect(test.service.findOne(id)).rejects.toThrow(`Time slot with ID ${id} not found`);
      expect(test.prisma.timeSlot.findUnique).toHaveBeenCalledWith({
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
    });
  });

  describe('create', () => {
    it('should create a time slot successfully', async () => {
      const coachId = 'coach-1';
      const createDto: CreateTimeSlotDto = {
        dateTime: '2024-12-25T10:00:00Z',
        durationMin: 60,
        isAvailable: true,
      };
      const mockTimeSlot = {
        id: 'slot-1',
        coachId: 'coach-1',
        dateTime: new Date('2024-12-25T10:00:00Z'),
        durationMin: 60,
        isAvailable: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      test.prisma.timeSlot.create.mockResolvedValue(mockTimeSlot);

      const result = await test.service.create(createDto, coachId);

      expect(result).toBeDefined();
      expect(result.id).toBe('slot-1');
      expect(test.prisma.timeSlot.create).toHaveBeenCalledWith({
        data: {
          dateTime: new Date('2024-12-25T10:00:00Z'),
          durationMin: 60,
          isAvailable: true,
          coachId: 'coach-1',
        },
      });
    });

    it('should create a time slot with default values', async () => {
      const coachId = 'coach-1';
      const createDto: CreateTimeSlotDto = {
        dateTime: '2024-12-25T10:00:00Z',
      };
      const mockTimeSlot = {
        id: 'slot-1',
        coachId: 'coach-1',
        dateTime: new Date('2024-12-25T10:00:00Z'),
        durationMin: 60,
        isAvailable: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      test.prisma.timeSlot.create.mockResolvedValue(mockTimeSlot);

      const result = await test.service.create(createDto, coachId);

      expect(result).toBeDefined();
      expect(test.prisma.timeSlot.create).toHaveBeenCalledWith({
        data: {
          dateTime: new Date('2024-12-25T10:00:00Z'),
          coachId: 'coach-1',
        },
      });
    });
  });

  describe('update', () => {
    it('should update a time slot successfully', async () => {
      const id = 'slot-1';
      const coachId = 'coach-1';
      const updateDto: UpdateTimeSlotDto = {
        isAvailable: false,
        durationMin: 90,
      };
      const existingTimeSlot = {
        id: 'slot-1',
        coachId: 'coach-1',
        dateTime: new Date('2024-12-25T10:00:00Z'),
        durationMin: 60,
        isAvailable: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updatedTimeSlot = {
        ...existingTimeSlot,
        isAvailable: false,
        durationMin: 90,
      };

      test.prisma.timeSlot.findUnique.mockResolvedValue(existingTimeSlot);
      test.prisma.timeSlot.update.mockResolvedValue(updatedTimeSlot);

      const result = await test.service.update(id, updateDto, coachId);

      expect(result).toBeDefined();
      expect(result.isAvailable).toBe(false);
      expect(result.durationMin).toBe(90);
      expect(test.prisma.timeSlot.findUnique).toHaveBeenCalledWith({
        where: { id },
      });
      expect(test.prisma.timeSlot.update).toHaveBeenCalledWith({
        where: { id },
        data: updateDto,
      });
    });

    it('should throw NotFoundException when time slot not found', async () => {
      const id = 'non-existent-id';
      const coachId = 'coach-1';
      const updateDto: UpdateTimeSlotDto = {
        isAvailable: false,
      };

      test.prisma.timeSlot.findUnique.mockResolvedValue(null);

      await expect(test.service.update(id, updateDto, coachId)).rejects.toThrow(NotFoundException);
      await expect(test.service.update(id, updateDto, coachId)).rejects.toThrow(
        'Discount not found'
      );
      expect(test.prisma.timeSlot.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when coach does not own the time slot', async () => {
      const id = 'slot-1';
      const coachId = 'coach-2';
      const updateDto: UpdateTimeSlotDto = {
        isAvailable: false,
      };
      const existingTimeSlot = {
        id: 'slot-1',
        coachId: 'coach-1',
        dateTime: new Date('2024-12-25T10:00:00Z'),
        durationMin: 60,
        isAvailable: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      test.prisma.timeSlot.findUnique.mockResolvedValue(existingTimeSlot);

      await expect(test.service.update(id, updateDto, coachId)).rejects.toThrow(ForbiddenException);
      await expect(test.service.update(id, updateDto, coachId)).rejects.toThrow(
        'Not authorized to update this time slot'
      );
      expect(test.prisma.timeSlot.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete a time slot successfully', async () => {
      const id = 'slot-1';
      const coachId = 'coach-1';
      const existingTimeSlot = {
        id: 'slot-1',
        coachId: 'coach-1',
        dateTime: new Date('2024-12-25T10:00:00Z'),
        durationMin: 60,
        isAvailable: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      test.prisma.timeSlot.findUnique.mockResolvedValue(existingTimeSlot);
      test.prisma.timeSlot.delete.mockResolvedValue(existingTimeSlot);

      await test.service.remove(id, coachId);

      expect(test.prisma.timeSlot.findUnique).toHaveBeenCalledWith({
        where: { id },
      });
      expect(test.prisma.timeSlot.delete).toHaveBeenCalledWith({
        where: { id },
      });
    });

    it('should throw NotFoundException when time slot not found', async () => {
      const id = 'non-existent-id';
      const coachId = 'coach-1';

      test.prisma.timeSlot.findUnique.mockResolvedValue(null);

      await expect(test.service.remove(id, coachId)).rejects.toThrow(NotFoundException);
      await expect(test.service.remove(id, coachId)).rejects.toThrow('Time slot not found');
      expect(test.prisma.timeSlot.delete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when coach does not own the time slot', async () => {
      const id = 'slot-1';
      const coachId = 'coach-2';
      const existingTimeSlot = {
        id: 'slot-1',
        coachId: 'coach-1',
        dateTime: new Date('2024-12-25T10:00:00Z'),
        durationMin: 60,
        isAvailable: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      test.prisma.timeSlot.findUnique.mockResolvedValue(existingTimeSlot);

      await expect(test.service.remove(id, coachId)).rejects.toThrow(ForbiddenException);
      await expect(test.service.remove(id, coachId)).rejects.toThrow(
        'Not authorized to delete this time slot'
      );
      expect(test.prisma.timeSlot.delete).not.toHaveBeenCalled();
    });
  });
});
