import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { BaseServiceTest } from '@test-utils';

import { PrismaService } from '../prisma/prisma.service';

import { CreateSessionDto, GetSessionsQuery, UpdateSessionDto } from './dto/session.dto';
import { SessionsService } from './sessions.service';

// Constants
const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 86400000 milliseconds in a day

describe('SessionsService', () => {
  let test: BaseServiceTest<SessionsService, PrismaService>;

  beforeEach(async () => {
    const mockPrisma = {
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      $transaction: jest.fn(),
      $executeRaw: jest.fn(),
      $queryRaw: jest.fn(),
      session: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      bookingType: {
        findUnique: jest.fn(),
      },
      timeSlot: {
        findUnique: jest.fn(),
      },
      discount: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    test = new BaseServiceTest({
      serviceClass: SessionsService,
      mocks: [{ provide: PrismaService, useValue: mockPrisma }],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('findByUser', () => {
    it('should return sessions for a user', async () => {
      const userId = 'user-123';
      const mockSessions = [
        {
          id: 'session-1',
          userId,
          coachId: 'coach-1',
          bookingTypeId: 'booking-1',
          timeSlotId: 'slot-1',
          dateTime: new Date('2024-11-10T10:00:00Z'),
          durationMin: 60,
          price: new Decimal(99.99),
          isPaid: false,
          status: 'scheduled',
          notes: null,
          paymentId: null,
          discountCode: null,
          calendarEventId: null,
          discountId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: { id: userId, name: 'User Name', email: 'user@example.com' },
          coach: { id: 'coach-1', name: 'Coach Name', email: 'coach@example.com' },
          bookingType: {
            id: 'booking-1',
            name: 'Session Type',
            description: 'Description',
            basePrice: new Decimal(100),
          },
          timeSlot: {
            id: 'slot-1',
            dateTime: new Date('2024-11-10T10:00:00Z'),
            durationMin: 60,
            isAvailable: true,
          },
          discount: null,
        },
      ];

      test.prisma.session.findMany.mockResolvedValue(mockSessions);

      const result = await test.service.findByUser(userId, Role.USER);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'session-1',
        userId,
        status: 'scheduled',
      });
      expect(test.prisma.session.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          status: undefined,
          dateTime: {
            gte: undefined,
            lte: undefined,
          },
        },
        include: expect.any(Object),
        orderBy: { dateTime: 'desc' },
      });
    });

    it('should return sessions for a coach', async () => {
      const coachId = 'coach-123';
      const mockSessions = [
        {
          id: 'session-1',
          userId: 'user-1',
          coachId,
          bookingTypeId: 'booking-1',
          timeSlotId: 'slot-1',
          dateTime: new Date('2024-11-10T10:00:00Z'),
          durationMin: 60,
          price: new Decimal(99.99),
          isPaid: false,
          status: 'scheduled',
          notes: null,
          paymentId: null,
          discountCode: null,
          calendarEventId: null,
          discountId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: { id: 'user-1', name: 'User Name', email: 'user@example.com' },
          coach: { id: coachId, name: 'Coach Name', email: 'coach@example.com' },
          bookingType: {
            id: 'booking-1',
            name: 'Session Type',
            description: 'Description',
            basePrice: new Decimal(100),
          },
          timeSlot: {
            id: 'slot-1',
            dateTime: new Date('2024-11-10T10:00:00Z'),
            durationMin: 60,
            isAvailable: true,
          },
          discount: null,
        },
      ];

      test.prisma.session.findMany.mockResolvedValue(mockSessions);

      const result = await test.service.findByUser(coachId, Role.COACH);

      expect(result).toHaveLength(1);
      expect(test.prisma.session.findMany).toHaveBeenCalledWith({
        where: {
          coachId,
          status: undefined,
          dateTime: {
            gte: undefined,
            lte: undefined,
          },
        },
        include: expect.any(Object),
        orderBy: { dateTime: 'desc' },
      });
    });

    it('should filter sessions by query parameters', async () => {
      const userId = 'user-123';
      const query: GetSessionsQuery = {
        status: 'completed',
        startDate: '2024-11-01',
        endDate: '2024-11-30',
      };

      test.prisma.session.findMany.mockResolvedValue([]);

      await test.service.findByUser(userId, Role.USER, query);

      expect(test.prisma.session.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          status: 'completed',
          dateTime: {
            gte: new Date('2024-11-01'),
            lte: new Date('2024-11-30'),
          },
        },
        include: expect.any(Object),
        orderBy: { dateTime: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a session for authorized user', async () => {
      const sessionId = 'session-123';
      const userId = 'user-123';
      const mockSession = {
        id: sessionId,
        userId,
        coachId: 'coach-1',
        bookingTypeId: 'booking-1',
        timeSlotId: 'slot-1',
        dateTime: new Date('2024-11-10T10:00:00Z'),
        durationMin: 60,
        price: new Decimal(99.99),
        isPaid: false,
        status: 'scheduled',
        notes: null,
        paymentId: null,
        discountCode: null,
        calendarEventId: null,
        discountId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: userId, name: 'User Name', email: 'user@example.com' },
        coach: { id: 'coach-1', name: 'Coach Name', email: 'coach@example.com' },
        bookingType: {
          id: 'booking-1',
          name: 'Session Type',
          description: 'Description',
          basePrice: new Decimal(100),
        },
        timeSlot: {
          id: 'slot-1',
          dateTime: new Date('2024-11-10T10:00:00Z'),
          durationMin: 60,
          isAvailable: true,
        },
        discount: null,
      };

      test.prisma.session.findUnique.mockResolvedValue(mockSession);

      const result = await test.service.findOne(sessionId, userId, Role.USER);

      expect(result).toMatchObject({
        id: sessionId,
        userId,
      });
      expect(test.prisma.session.findUnique).toHaveBeenCalledWith({
        where: { id: sessionId },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when session not found', async () => {
      test.prisma.session.findUnique.mockResolvedValue(null);

      await expect(test.service.findOne('non-existent', 'user-123', Role.USER)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException when user not authorized', async () => {
      const mockSession = {
        id: 'session-123',
        userId: 'other-user',
        coachId: 'coach-1',
        bookingTypeId: 'booking-1',
        timeSlotId: 'slot-1',
        dateTime: new Date(),
        durationMin: 60,
        price: new Decimal(99.99),
        isPaid: false,
        status: 'scheduled',
        notes: null,
        paymentId: null,
        discountCode: null,
        calendarEventId: null,
        discountId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 'other-user', name: 'Other User', email: 'other@example.com' },
        coach: { id: 'coach-1', name: 'Coach Name', email: 'coach@example.com' },
        bookingType: {
          id: 'booking-1',
          name: 'Session Type',
          description: 'Description',
          basePrice: new Decimal(100),
        },
        timeSlot: {
          id: 'slot-1',
          dateTime: new Date(),
          durationMin: 60,
          isAvailable: true,
        },
        discount: null,
      };

      test.prisma.session.findUnique.mockResolvedValue(mockSession);

      await expect(test.service.findOne('session-123', 'user-123', Role.USER)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('create', () => {
    it('should create a session successfully', async () => {
      const userId = 'user-123';
      const createDto: CreateSessionDto = {
        bookingTypeId: 'booking-1',
        timeSlotId: 'slot-1',
        notes: 'Test notes',
      };

      const mockBookingType = {
        id: 'booking-1',
        name: 'Session Type',
        description: 'Description',
        basePrice: new Decimal(100),
        isActive: true,
        coachId: 'coach-1',
        durationMin: 60,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockTimeSlot = {
        id: 'slot-1',
        dateTime: new Date('2024-11-10T10:00:00Z'),
        durationMin: 60,
        isAvailable: true,
        coachId: 'coach-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCreatedSession = {
        id: 'session-123',
        userId,
        coachId: 'coach-1',
        bookingTypeId: 'booking-1',
        timeSlotId: 'slot-1',
        dateTime: mockTimeSlot.dateTime,
        durationMin: 60,
        price: new Decimal(100),
        isPaid: false,
        status: 'scheduled',
        notes: 'Test notes',
        paymentId: null,
        discountCode: null,
        calendarEventId: null,
        discountId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: userId, name: 'User Name', email: 'user@example.com' },
        coach: { id: 'coach-1', name: 'Coach Name', email: 'coach@example.com' },
        bookingType: mockBookingType,
        timeSlot: mockTimeSlot,
        discount: null,
      };

      test.prisma.bookingType.findUnique.mockResolvedValue(mockBookingType);
      test.prisma.timeSlot.findUnique.mockResolvedValue(mockTimeSlot);
      test.prisma.session.create.mockResolvedValue(mockCreatedSession);

      const result = await test.service.create(createDto, userId);

      expect(result).toMatchObject({
        id: 'session-123',
        userId,
        price: new Decimal(100),
      });
      expect(test.prisma.bookingType.findUnique).toHaveBeenCalledWith({
        where: { id: createDto.bookingTypeId },
      });
      expect(test.prisma.timeSlot.findUnique).toHaveBeenCalledWith({
        where: { id: createDto.timeSlotId },
      });
      expect(test.prisma.session.create).toHaveBeenCalledTimes(1);
    });

    it('should create a session with discount', async () => {
      const userId = 'user-123';
      const createDto: CreateSessionDto = {
        bookingTypeId: 'booking-1',
        timeSlotId: 'slot-1',
        discountCode: 'SAVE20',
      };

      const mockBookingType = {
        id: 'booking-1',
        name: 'Session Type',
        description: 'Description',
        basePrice: new Decimal(100),
        isActive: true,
        coachId: 'coach-1',
        durationMin: 60,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockTimeSlot = {
        id: 'slot-1',
        dateTime: new Date('2024-11-10T10:00:00Z'),
        durationMin: 60,
        isAvailable: true,
        coachId: 'coach-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockDiscount = {
        code: 'SAVE20',
        amount: new Decimal(20),
        isActive: true,
        expiry: new Date('2025-12-31'),
        useCount: 0,
        maxUses: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCreatedSession = {
        id: 'session-123',
        userId,
        coachId: 'coach-1',
        bookingTypeId: 'booking-1',
        timeSlotId: 'slot-1',
        dateTime: mockTimeSlot.dateTime,
        durationMin: 60,
        price: new Decimal(80),
        isPaid: false,
        status: 'scheduled',
        notes: null,
        paymentId: null,
        discountCode: 'SAVE20',
        calendarEventId: null,
        discountId: 'SAVE20',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: userId, name: 'User Name', email: 'user@example.com' },
        coach: { id: 'coach-1', name: 'Coach Name', email: 'coach@example.com' },
        bookingType: mockBookingType,
        timeSlot: mockTimeSlot,
        discount: mockDiscount,
      };

      test.prisma.bookingType.findUnique.mockResolvedValue(mockBookingType);
      test.prisma.timeSlot.findUnique.mockResolvedValue(mockTimeSlot);
      test.prisma.discount.findFirst.mockResolvedValue(mockDiscount);
      test.prisma.session.create.mockResolvedValue(mockCreatedSession);
      test.prisma.discount.update.mockResolvedValue(mockDiscount);

      const result = await test.service.create(createDto, userId);

      expect(result.price).toEqual(new Decimal(80));
      expect(test.prisma.discount.update).toHaveBeenCalledWith({
        where: { code: 'SAVE20' },
        data: { useCount: { increment: 1 } },
      });
    });

    it('should throw BadRequestException when booking type is inactive', async () => {
      const createDto: CreateSessionDto = {
        bookingTypeId: 'booking-1',
        timeSlotId: 'slot-1',
      };

      const mockBookingType = {
        id: 'booking-1',
        isActive: false,
        basePrice: new Decimal(100),
      };

      test.prisma.bookingType.findUnique.mockResolvedValue(mockBookingType);

      await expect(test.service.create(createDto, 'user-123')).rejects.toThrow(BadRequestException);
      expect(test.prisma.session.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when time slot is not available', async () => {
      const createDto: CreateSessionDto = {
        bookingTypeId: 'booking-1',
        timeSlotId: 'slot-1',
      };

      const mockBookingType = {
        id: 'booking-1',
        isActive: true,
        basePrice: new Decimal(100),
      };

      const mockTimeSlot = {
        id: 'slot-1',
        isAvailable: false,
      };

      test.prisma.bookingType.findUnique.mockResolvedValue(mockBookingType);
      test.prisma.timeSlot.findUnique.mockResolvedValue(mockTimeSlot);

      await expect(test.service.create(createDto, 'user-123')).rejects.toThrow(BadRequestException);
      expect(test.prisma.session.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a session successfully', async () => {
      const sessionId = 'session-123';
      const userId = 'user-123';
      const updateDto: UpdateSessionDto = {
        notes: 'Updated notes',
      };

      const mockSession = {
        id: sessionId,
        userId,
        coachId: 'coach-1',
        bookingTypeId: 'booking-1',
        timeSlotId: 'slot-1',
        dateTime: new Date('2024-11-10T10:00:00Z'),
        durationMin: 60,
        price: new Decimal(99.99),
        isPaid: false,
        status: 'scheduled',
        notes: null,
        paymentId: null,
        discountCode: null,
        calendarEventId: null,
        discountId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: userId, name: 'User Name', email: 'user@example.com' },
        coach: { id: 'coach-1', name: 'Coach Name', email: 'coach@example.com' },
        bookingType: {
          id: 'booking-1',
          name: 'Session Type',
          description: 'Description',
          basePrice: new Decimal(100),
        },
        timeSlot: {
          id: 'slot-1',
          dateTime: new Date('2024-11-10T10:00:00Z'),
          durationMin: 60,
          isAvailable: true,
        },
        discount: null,
      };

      const mockUpdatedSession = {
        ...mockSession,
        notes: 'Updated notes',
      };

      test.prisma.session.findUnique.mockResolvedValue(mockSession);
      test.prisma.session.update.mockResolvedValue(mockUpdatedSession);

      const result = await test.service.update(sessionId, updateDto, userId, Role.USER);

      expect(result.notes).toBe('Updated notes');
      expect(test.prisma.session.update).toHaveBeenCalledWith({
        where: { id: sessionId },
        data: updateDto,
        include: expect.any(Object),
      });
    });
  });

  describe('cancel', () => {
    it('should cancel a session successfully', async () => {
      const sessionId = 'session-123';
      const userId = 'user-123';

      const mockCancelledSession = {
        id: sessionId,
        userId,
        coachId: 'coach-1',
        bookingTypeId: 'booking-1',
        timeSlotId: 'slot-1',
        dateTime: new Date(Date.now() + ONE_DAY_MS),
        durationMin: 60,
        price: new Decimal(99.99),
        isPaid: false,
        status: 'cancelled',
        notes: null,
        paymentId: null,
        discountCode: null,
        calendarEventId: null,
        discountId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: userId, name: 'User Name', email: 'user@example.com' },
        coach: { id: 'coach-1', name: 'Coach Name', email: 'coach@example.com' },
        bookingType: {
          id: 'booking-1',
          name: 'Session Type',
          description: 'Description',
          basePrice: new Decimal(100),
        },
        timeSlot: {
          id: 'slot-1',
          dateTime: new Date(Date.now() + ONE_DAY_MS),
          durationMin: 60,
          isAvailable: true,
        },
        discount: null,
      };

      test.prisma.session.findUnique.mockResolvedValue({
        ...mockCancelledSession,
        status: 'scheduled',
      });
      test.prisma.session.update.mockResolvedValue(mockCancelledSession);

      const result = await test.service.cancel(sessionId, userId, Role.USER);

      expect(result.status).toBe('cancelled');
      expect(test.prisma.session.update).toHaveBeenCalledWith({
        where: { id: sessionId },
        data: { status: 'cancelled' },
        include: expect.any(Object),
      });
    });

    it('should throw BadRequestException when session already cancelled', async () => {
      const sessionId = 'session-123';
      const userId = 'user-123';

      const mockSession = {
        id: sessionId,
        userId,
        dateTime: new Date(Date.now() + ONE_DAY_MS).toISOString(),
        status: 'cancelled',
      };

      test.prisma.session.findUnique.mockResolvedValue({
        ...mockSession,
        coachId: 'coach-1',
        bookingTypeId: 'booking-1',
        timeSlotId: 'slot-1',
        durationMin: 60,
        price: new Decimal(99.99),
        isPaid: false,
        notes: null,
        paymentId: null,
        discountCode: null,
        calendarEventId: null,
        discountId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: userId, name: 'User Name', email: 'user@example.com' },
        coach: { id: 'coach-1', name: 'Coach Name', email: 'coach@example.com' },
        bookingType: {
          id: 'booking-1',
          name: 'Session Type',
          description: 'Description',
          basePrice: new Decimal(100),
        },
        timeSlot: {
          id: 'slot-1',
          dateTime: new Date(Date.now() + ONE_DAY_MS),
          durationMin: 60,
          isAvailable: true,
        },
        discount: null,
      });

      await expect(test.service.cancel(sessionId, userId, Role.USER)).rejects.toThrow(
        BadRequestException
      );
      expect(test.prisma.session.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when cancelling past session', async () => {
      const sessionId = 'session-123';
      const userId = 'user-123';

      const mockSession = {
        id: sessionId,
        userId,
        dateTime: new Date(Date.now() - ONE_DAY_MS).toISOString(),
        status: 'scheduled',
      };

      test.prisma.session.findUnique.mockResolvedValue({
        ...mockSession,
        coachId: 'coach-1',
        bookingTypeId: 'booking-1',
        timeSlotId: 'slot-1',
        durationMin: 60,
        price: new Decimal(99.99),

        isPaid: false,
        notes: null,
        paymentId: null,
        discountCode: null,
        calendarEventId: null,
        discountId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: userId, name: 'User Name', email: 'user@example.com' },
        coach: { id: 'coach-1', name: 'Coach Name', email: 'coach@example.com' },
        bookingType: {
          id: 'booking-1',
          name: 'Session Type',
          description: 'Description',
          basePrice: new Decimal(100),
        },
        timeSlot: {
          id: 'slot-1',
          dateTime: new Date(Date.now() - ONE_DAY_MS),
          durationMin: 60,
          isAvailable: true,
        },
        discount: null,
      });

      await expect(test.service.cancel(sessionId, userId, Role.USER)).rejects.toThrow(
        BadRequestException
      );
      expect(test.prisma.session.update).not.toHaveBeenCalled();
    });
  });

  describe('findFirst', () => {
    it('should return session by calendar event id', async () => {
      const calendarEventId = 'calendar-event-123';
      const mockSession = {
        id: 'session-123',
        calendarEventId,
        userId: 'user-123',
        coachId: 'coach-1',
        bookingTypeId: 'booking-1',
        timeSlotId: 'slot-1',
        dateTime: new Date(),
        durationMin: 60,
        price: new Decimal(99.99),
        isPaid: false,
        status: 'scheduled',
        notes: null,
        paymentId: null,
        discountCode: null,
        discountId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      test.prisma.session.findFirst.mockResolvedValue(mockSession);

      const result = await test.service.findFirst(calendarEventId);

      expect(result).toMatchObject({
        id: 'session-123',
        calendarEventId,
      });
      expect(test.prisma.session.findFirst).toHaveBeenCalledWith({
        where: { calendarEventId },
      });
    });

    it('should throw BadRequestException when session not found', async () => {
      test.prisma.session.findFirst.mockResolvedValue(null);

      await expect(test.service.findFirst('non-existent')).rejects.toThrow(BadRequestException);
    });
  });
});
