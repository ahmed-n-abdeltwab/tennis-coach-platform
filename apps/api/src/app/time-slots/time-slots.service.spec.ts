import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ServiceTest } from '@test-utils';

import { PrismaService } from '../prisma/prisma.service';

import { TimeSlotsService } from './time-slots.service';

interface TimeSlotMocks {
  PrismaService: {
    timeSlot: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
}

describe('TimeSlotsService', () => {
  let test: ServiceTest<TimeSlotsService, TimeSlotMocks>;

  beforeEach(async () => {
    test = new ServiceTest({
      service: TimeSlotsService,
      providers: [
        {
          provide: PrismaService,
          useValue: {
            timeSlot: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('findTimeSlotInternal behavior', () => {
    describe('throwIfNotFound option', () => {
      it('should throw NotFoundException when throwIfNotFound=true and no results (via findOne)', async () => {
        test.mocks.PrismaService.timeSlot.findFirst.mockResolvedValue(null);

        await expect(test.service.findOne('nonexistent-id')).rejects.toThrow(NotFoundException);
        await expect(test.service.findOne('nonexistent-id')).rejects.toThrow('Time slot not found');
      });

      it('should return empty array when throwIfNotFound=false and no results (via findAvailable)', async () => {
        test.mocks.PrismaService.timeSlot.findMany.mockResolvedValue([]);

        const result = await test.service.findAvailable({});

        expect(result).toEqual([]);
      });
    });

    describe('isMany option', () => {
      it('should return array when isMany=true (via findAvailable)', async () => {
        const mockTimeSlots = [
          test.factory.timeSlot.createWithNulls(),
          test.factory.timeSlot.createWithNulls(),
        ];
        test.mocks.PrismaService.timeSlot.findMany.mockResolvedValue(mockTimeSlots);

        const result = await test.service.findAvailable({});

        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(2);
        expect(test.mocks.PrismaService.timeSlot.findMany).toHaveBeenCalled();
      });

      it('should return single object when isMany=false (via findOne)', async () => {
        const mockTimeSlot = test.factory.timeSlot.createWithNulls({ id: 'slot-123' });
        test.mocks.PrismaService.timeSlot.findFirst.mockResolvedValue(mockTimeSlot);

        const result = await test.service.findOne('slot-123');

        expect(Array.isArray(result)).toBe(false);
        expect(result.id).toBe('slot-123');
        expect(test.mocks.PrismaService.timeSlot.findFirst).toHaveBeenCalled();
      });
    });

    describe('include option', () => {
      it('should include coach relation in queries', async () => {
        const mockTimeSlot = test.factory.timeSlot.createWithNulls();
        test.mocks.PrismaService.timeSlot.findFirst.mockResolvedValue(mockTimeSlot);

        await test.service.findOne('slot-123');

        expect(test.mocks.PrismaService.timeSlot.findFirst).toHaveBeenCalledWith({
          where: { id: 'slot-123' },
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
  });

  describe('findAvailable', () => {
    it('should return available time slots with default date filter', async () => {
      const mockTimeSlots = [
        test.factory.timeSlot.createWithNulls({ isAvailable: true }),
        test.factory.timeSlot.createWithNulls({ isAvailable: true }),
      ];
      test.mocks.PrismaService.timeSlot.findMany.mockResolvedValue(mockTimeSlots);

      const result = await test.service.findAvailable({});

      expect(result).toHaveLength(2);
      expect(test.mocks.PrismaService.timeSlot.findMany).toHaveBeenCalledWith({
        where: {
          isAvailable: true,
          coachId: undefined,
          dateTime: {
            gte: expect.any(Date),
            lte: undefined,
          },
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
      const mockTimeSlots = [test.factory.timeSlot.createWithNulls()];
      test.mocks.PrismaService.timeSlot.findMany.mockResolvedValue(mockTimeSlots);

      const result = await test.service.findAvailable({
        startDate: '2024-12-25T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
      });

      expect(result).toHaveLength(1);
      expect(test.mocks.PrismaService.timeSlot.findMany).toHaveBeenCalledWith({
        where: {
          isAvailable: true,
          coachId: undefined,
          dateTime: {
            gte: new Date('2024-12-25T00:00:00Z'),
            lte: new Date('2024-12-31T23:59:59Z'),
          },
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
      const mockTimeSlots = [test.factory.timeSlot.createWithNulls({ coachId: 'coach-123' })];
      test.mocks.PrismaService.timeSlot.findMany.mockResolvedValue(mockTimeSlots);

      const result = await test.service.findAvailable({ coachId: 'coach-123' });

      expect(result).toHaveLength(1);
      expect(test.mocks.PrismaService.timeSlot.findMany).toHaveBeenCalledWith({
        where: {
          isAvailable: true,
          coachId: 'coach-123',
          dateTime: {
            gte: expect.any(Date),
            lte: undefined,
          },
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
      test.mocks.PrismaService.timeSlot.findMany.mockResolvedValue([]);

      const result = await test.service.findAvailable({});

      expect(result).toEqual([]);
    });
  });

  describe('findByCoach', () => {
    it('should return time slots for specific coach', async () => {
      const mockTimeSlots = [
        test.factory.timeSlot.createWithNulls({ coachId: 'coach-123' }),
        test.factory.timeSlot.createWithNulls({ coachId: 'coach-123' }),
      ];
      test.mocks.PrismaService.timeSlot.findMany.mockResolvedValue(mockTimeSlots);

      const result = await test.service.findByCoach('coach-123', {});

      expect(result).toHaveLength(2);
      expect(test.mocks.PrismaService.timeSlot.findMany).toHaveBeenCalledWith({
        where: {
          coachId: 'coach-123',
          dateTime: {
            gte: expect.any(Date),
            lte: undefined,
          },
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

    it('should filter by date range for coach time slots', async () => {
      const mockTimeSlots = [test.factory.timeSlot.createWithNulls({ coachId: 'coach-123' })];
      test.mocks.PrismaService.timeSlot.findMany.mockResolvedValue(mockTimeSlots);

      const result = await test.service.findByCoach('coach-123', {
        startDate: '2024-12-25T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
      });

      expect(result).toHaveLength(1);
      expect(test.mocks.PrismaService.timeSlot.findMany).toHaveBeenCalledWith({
        where: {
          coachId: 'coach-123',
          dateTime: {
            gte: new Date('2024-12-25T00:00:00Z'),
            lte: new Date('2024-12-31T23:59:59Z'),
          },
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

    it('should return empty array when coach has no time slots', async () => {
      test.mocks.PrismaService.timeSlot.findMany.mockResolvedValue([]);

      const result = await test.service.findByCoach('coach-456', {});

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a time slot by ID', async () => {
      const mockTimeSlot = test.factory.timeSlot.createWithNulls({ id: 'slot-123' });
      test.mocks.PrismaService.timeSlot.findFirst.mockResolvedValue(mockTimeSlot);

      const result = await test.service.findOne('slot-123');

      expect(result).toBeDefined();
      expect(result.id).toBe('slot-123');
      expect(test.mocks.PrismaService.timeSlot.findFirst).toHaveBeenCalledWith({
        where: { id: 'slot-123' },
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
      test.mocks.PrismaService.timeSlot.findFirst.mockResolvedValue(null);

      await expect(test.service.findOne('nonexistent-id')).rejects.toThrow(NotFoundException);
      await expect(test.service.findOne('nonexistent-id')).rejects.toThrow('Time slot not found');
    });
  });

  describe('create', () => {
    it('should create a time slot successfully', async () => {
      const createDto = {
        dateTime: '2024-12-25T10:00:00Z',
        durationMin: 60,
        isAvailable: true,
      };
      const mockTimeSlot = test.factory.timeSlot.createWithNulls({
        dateTime: new Date('2024-12-25T10:00:00Z'),
        durationMin: 60,
        isAvailable: true,
        coachId: 'coach-123',
      });
      test.mocks.PrismaService.timeSlot.create.mockResolvedValue(mockTimeSlot);

      const result = await test.service.create(createDto, 'coach-123');

      expect(result).toBeDefined();
      expect(test.mocks.PrismaService.timeSlot.create).toHaveBeenCalledWith({
        data: {
          ...createDto,
          dateTime: new Date('2024-12-25T10:00:00Z'),
          coachId: 'coach-123',
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
      });
    });

    it('should create a time slot with default values', async () => {
      const createDto = {
        dateTime: '2024-12-25T10:00:00Z',
      };
      const mockTimeSlot = test.factory.timeSlot.createWithNulls({
        dateTime: new Date('2024-12-25T10:00:00Z'),
        coachId: 'coach-123',
      });
      test.mocks.PrismaService.timeSlot.create.mockResolvedValue(mockTimeSlot);

      const result = await test.service.create(createDto, 'coach-123');

      expect(result).toBeDefined();
      expect(test.mocks.PrismaService.timeSlot.create).toHaveBeenCalledWith({
        data: {
          ...createDto,
          dateTime: new Date('2024-12-25T10:00:00Z'),
          coachId: 'coach-123',
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
      });
    });
  });

  describe('update', () => {
    it('should update a time slot successfully', async () => {
      const existingTimeSlot = test.factory.timeSlot.createWithNulls({
        id: 'slot-123',
        coachId: 'coach-123',
      });
      const updatedTimeSlot = test.factory.timeSlot.createWithNulls({
        id: 'slot-123',
        coachId: 'coach-123',
        isAvailable: false,
        durationMin: 90,
      });
      test.mocks.PrismaService.timeSlot.findFirst.mockResolvedValue(existingTimeSlot);
      test.mocks.PrismaService.timeSlot.update.mockResolvedValue(updatedTimeSlot);

      const result = await test.service.update(
        'slot-123',
        { dateTime: '2024-12-25T10:00:00Z', isAvailable: false, durationMin: 90 },
        'coach-123'
      );

      expect(result).toBeDefined();
      expect(test.mocks.PrismaService.timeSlot.findFirst).toHaveBeenCalledWith({
        where: { id: 'slot-123' },
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
      expect(test.mocks.PrismaService.timeSlot.update).toHaveBeenCalledWith({
        where: { id: 'slot-123' },
        data: {
          dateTime: new Date('2024-12-25T10:00:00Z'),
          isAvailable: false,
          durationMin: 90,
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
      });
    });

    it('should throw NotFoundException when time slot not found', async () => {
      test.mocks.PrismaService.timeSlot.findFirst.mockResolvedValue(null);

      await expect(
        test.service.update('nonexistent-id', { dateTime: '2024-12-25T10:00:00Z' }, 'coach-123')
      ).rejects.toThrow(NotFoundException);
      await expect(
        test.service.update('nonexistent-id', { dateTime: '2024-12-25T10:00:00Z' }, 'coach-123')
      ).rejects.toThrow('Time slot not found');
      expect(test.mocks.PrismaService.timeSlot.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when coach does not own the time slot', async () => {
      const existingTimeSlot = test.factory.timeSlot.createWithNulls({
        id: 'slot-123',
        coachId: 'other-coach',
      });
      test.mocks.PrismaService.timeSlot.findFirst.mockResolvedValue(existingTimeSlot);

      await expect(
        test.service.update('slot-123', { dateTime: '2024-12-25T10:00:00Z' }, 'coach-123')
      ).rejects.toThrow(ForbiddenException);
      await expect(
        test.service.update('slot-123', { dateTime: '2024-12-25T10:00:00Z' }, 'coach-123')
      ).rejects.toThrow('Not authorized to update this time slot');
      expect(test.mocks.PrismaService.timeSlot.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete a time slot successfully', async () => {
      const existingTimeSlot = test.factory.timeSlot.createWithNulls({
        id: 'slot-123',
        coachId: 'coach-123',
      });
      test.mocks.PrismaService.timeSlot.findFirst.mockResolvedValue(existingTimeSlot);
      test.mocks.PrismaService.timeSlot.delete.mockResolvedValue(existingTimeSlot);

      await test.service.remove('slot-123', 'coach-123');

      expect(test.mocks.PrismaService.timeSlot.findFirst).toHaveBeenCalledWith({
        where: { id: 'slot-123' },
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
      expect(test.mocks.PrismaService.timeSlot.delete).toHaveBeenCalledWith({
        where: { id: 'slot-123' },
      });
    });

    it('should throw NotFoundException when time slot not found', async () => {
      test.mocks.PrismaService.timeSlot.findFirst.mockResolvedValue(null);

      await expect(test.service.remove('nonexistent-id', 'coach-123')).rejects.toThrow(
        NotFoundException
      );
      await expect(test.service.remove('nonexistent-id', 'coach-123')).rejects.toThrow(
        'Time slot not found'
      );
      expect(test.mocks.PrismaService.timeSlot.delete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when coach does not own the time slot', async () => {
      const existingTimeSlot = test.factory.timeSlot.createWithNulls({
        id: 'slot-123',
        coachId: 'other-coach',
      });
      test.mocks.PrismaService.timeSlot.findFirst.mockResolvedValue(existingTimeSlot);

      await expect(test.service.remove('slot-123', 'coach-123')).rejects.toThrow(
        ForbiddenException
      );
      await expect(test.service.remove('slot-123', 'coach-123')).rejects.toThrow(
        'Not authorized to delete this time slot'
      );
      expect(test.mocks.PrismaService.timeSlot.delete).not.toHaveBeenCalled();
    });
  });
});
