import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role, SessionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { DeepMocked, ServiceTest } from '@test-utils';

import { BookingTypesService } from '../booking-types/booking-types.service';
import { DiscountsService } from '../discounts/discounts.service';
import { PrismaService } from '../prisma/prisma.service';
import { TimeSlotsService } from '../time-slots/time-slots.service';

import { SessionsService } from './sessions.service';

/**
 * Typed mocks interface for SessionsService tests.
 * Provides IntelliSense support for all mocked dependencies.
 */
interface SessionMocks {
  PrismaService: {
    session: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  BookingTypesService: DeepMocked<BookingTypesService>;
  TimeSlotsService: DeepMocked<TimeSlotsService>;
  DiscountsService: DeepMocked<DiscountsService>;
}

// Constants
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

describe('SessionsService', () => {
  let test: ServiceTest<SessionsService, SessionMocks>;

  beforeEach(async () => {
    test = new ServiceTest({
      service: SessionsService,
      providers: [
        {
          provide: PrismaService,
          useValue: {
            session: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: BookingTypesService,
          useValue: {
            findActiveById: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: TimeSlotsService,
          useValue: {
            findAvailableById: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: DiscountsService,
          useValue: {
            findActiveByCode: jest.fn(),
            incrementUsageInternal: jest.fn(),
          },
        },
      ],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('findSessionInternal behavior', () => {
    describe('throwIfNotFound option', () => {
      it('should throw NotFoundException when throwIfNotFound=true and no results (via findOne)', async () => {
        test.mocks.PrismaService.session.findFirst.mockResolvedValue(null);

        await expect(test.service.findOne('non-existent', 'user-123', Role.USER)).rejects.toThrow(
          NotFoundException
        );
        await expect(test.service.findOne('non-existent', 'user-123', Role.USER)).rejects.toThrow(
          'Session not found'
        );
      });

      it('should return empty array when throwIfNotFound=false and no results (via findByUser)', async () => {
        test.mocks.PrismaService.session.findMany.mockResolvedValue([]);

        const result = await test.service.findByUser('user-123', Role.USER);

        expect(result).toEqual([]);
      });
    });

    describe('isMany option', () => {
      it('should return array when isMany=true (via findByUser)', async () => {
        const mockSessions = [
          test.factory.session.createWithNulls({ userId: 'user-123' }),
          test.factory.session.createWithNulls({ userId: 'user-123' }),
        ];
        test.mocks.PrismaService.session.findMany.mockResolvedValue(mockSessions);

        const result = await test.service.findByUser('user-123', Role.USER);

        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(2);
        expect(test.mocks.PrismaService.session.findMany).toHaveBeenCalled();
      });

      it('should return single object when isMany=false (via findOne)', async () => {
        const mockSession = test.factory.session.createWithNulls({
          id: 'session-123',
          userId: 'user-123',
        });
        test.mocks.PrismaService.session.findFirst.mockResolvedValue(mockSession);

        const result = await test.service.findOne('session-123', 'user-123', Role.USER);

        expect(Array.isArray(result)).toBe(false);
        expect(result.id).toBe('session-123');
        expect(test.mocks.PrismaService.session.findFirst).toHaveBeenCalled();
      });
    });

    describe('include option', () => {
      it('should include standard relations in queries', async () => {
        const mockSession = test.factory.session.createWithNulls({ userId: 'user-123' });
        test.mocks.PrismaService.session.findFirst.mockResolvedValue(mockSession);

        await test.service.findOne('session-123', 'user-123', Role.USER);

        expect(test.mocks.PrismaService.session.findFirst).toHaveBeenCalledWith({
          where: { id: 'session-123' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            coach: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            bookingType: true,
            timeSlot: true,
            discount: true,
          },
        });
      });
    });
  });

  describe('findByUser', () => {
    it('should return sessions for a user with USER role', async () => {
      const userId = 'user-123';
      const mockSessions = [
        test.factory.session.createWithNulls({ userId }),
        test.factory.session.createWithNulls({ userId }),
      ];
      test.mocks.PrismaService.session.findMany.mockResolvedValue(mockSessions);

      const result = await test.service.findByUser(userId, Role.USER);

      expect(result).toHaveLength(2);
      expect(test.mocks.PrismaService.session.findMany).toHaveBeenCalledWith({
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

    it('should return sessions for a user with PREMIUM_USER role', async () => {
      const userId = 'premium-user-123';
      const mockSessions = [test.factory.session.createWithNulls({ userId })];
      test.mocks.PrismaService.session.findMany.mockResolvedValue(mockSessions);

      const result = await test.service.findByUser(userId, Role.PREMIUM_USER);

      expect(result).toHaveLength(1);
      expect(test.mocks.PrismaService.session.findMany).toHaveBeenCalledWith({
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

    it('should return sessions for a coach with COACH role', async () => {
      const coachId = 'coach-123';
      const mockSessions = [test.factory.session.createWithNulls({ coachId })];
      test.mocks.PrismaService.session.findMany.mockResolvedValue(mockSessions);

      const result = await test.service.findByUser(coachId, Role.COACH);

      expect(result).toHaveLength(1);
      expect(test.mocks.PrismaService.session.findMany).toHaveBeenCalledWith({
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

    it('should filter sessions by status query parameter', async () => {
      const userId = 'user-123';
      test.mocks.PrismaService.session.findMany.mockResolvedValue([]);

      await test.service.findByUser(userId, Role.USER, { status: SessionStatus.COMPLETED });

      expect(test.mocks.PrismaService.session.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          status: SessionStatus.COMPLETED,
          dateTime: {
            gte: undefined,
            lte: undefined,
          },
        },
        include: expect.any(Object),
        orderBy: { dateTime: 'desc' },
      });
    });

    it('should filter sessions by date range query parameters', async () => {
      const userId = 'user-123';
      test.mocks.PrismaService.session.findMany.mockResolvedValue([]);

      await test.service.findByUser(userId, Role.USER, {
        startDate: '2024-11-01',
        endDate: '2024-11-30',
      });

      expect(test.mocks.PrismaService.session.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          status: undefined,
          dateTime: {
            gte: new Date('2024-11-01'),
            lte: new Date('2024-11-30'),
          },
        },
        include: expect.any(Object),
        orderBy: { dateTime: 'desc' },
      });
    });

    it('should return empty array when no sessions found', async () => {
      test.mocks.PrismaService.session.findMany.mockResolvedValue([]);

      const result = await test.service.findByUser('user-456', Role.USER);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return session when user is authorized (USER role)', async () => {
      const userId = 'user-123';
      const mockSession = test.factory.session.createWithNulls({
        id: 'session-123',
        userId,
      });
      test.mocks.PrismaService.session.findFirst.mockResolvedValue(mockSession);

      const result = await test.service.findOne('session-123', userId, Role.USER);

      expect(result.id).toBe('session-123');
      expect(result.userId).toBe(userId);
    });

    it('should return session when user is authorized (PREMIUM_USER role)', async () => {
      const userId = 'premium-user-123';
      const mockSession = test.factory.session.createWithNulls({
        id: 'session-123',
        userId,
      });
      test.mocks.PrismaService.session.findFirst.mockResolvedValue(mockSession);

      const result = await test.service.findOne('session-123', userId, Role.PREMIUM_USER);

      expect(result.id).toBe('session-123');
      expect(result.userId).toBe(userId);
    });

    it('should return session when coach is authorized (COACH role)', async () => {
      const coachId = 'coach-123';
      const mockSession = test.factory.session.createWithNulls({
        id: 'session-123',
        coachId,
      });
      test.mocks.PrismaService.session.findFirst.mockResolvedValue(mockSession);

      const result = await test.service.findOne('session-123', coachId, Role.COACH);

      expect(result.id).toBe('session-123');
      expect(result.coachId).toBe(coachId);
    });

    it('should throw NotFoundException when session not found', async () => {
      test.mocks.PrismaService.session.findFirst.mockResolvedValue(null);

      await expect(test.service.findOne('non-existent', 'user-123', Role.USER)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException when user is not authorized', async () => {
      const mockSession = test.factory.session.createWithNulls({
        userId: 'other-user',
        coachId: 'other-coach',
      });
      test.mocks.PrismaService.session.findFirst.mockResolvedValue(mockSession);

      await expect(test.service.findOne('session-123', 'user-123', Role.USER)).rejects.toThrow(
        ForbiddenException
      );
      await expect(test.service.findOne('session-123', 'user-123', Role.USER)).rejects.toThrow(
        'Not authorized to access this session'
      );
    });

    it('should throw ForbiddenException when coach is not authorized', async () => {
      const mockSession = test.factory.session.createWithNulls({
        userId: 'user-123',
        coachId: 'other-coach',
      });
      test.mocks.PrismaService.session.findFirst.mockResolvedValue(mockSession);

      await expect(test.service.findOne('session-123', 'coach-123', Role.COACH)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('findFirstByCalendarId (internal method)', () => {
    it('should return session by calendar event ID', async () => {
      const calendarEventId = 'calendar-event-123';
      const mockSession = test.factory.session.createWithNulls({
        calendarEventId,
      });
      test.mocks.PrismaService.session.findFirst.mockResolvedValue(mockSession);

      const result = await test.service.findFirstByCalendarId(calendarEventId);

      expect(result.calendarEventId).toBe(calendarEventId);
      expect(test.mocks.PrismaService.session.findFirst).toHaveBeenCalledWith({
        where: { calendarEventId },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when session not found', async () => {
      test.mocks.PrismaService.session.findFirst.mockResolvedValue(null);

      await expect(test.service.findFirstByCalendarId('non-existent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('create', () => {
    const createDto = {
      bookingTypeId: 'booking-type-123',
      timeSlotId: 'time-slot-123',
      notes: 'Test notes',
    };

    it('should create a session successfully', async () => {
      const userId = 'user-123';
      const mockBookingType = test.factory.bookingType.createWithNulls({
        id: createDto.bookingTypeId,
        isActive: true,
        basePrice: new Decimal(100),
        coachId: 'coach-123',
      });
      const mockTimeSlot = test.factory.timeSlot.createWithNulls({
        id: createDto.timeSlotId,
        isAvailable: true,
        dateTime: new Date('2024-11-10T10:00:00Z'),
        durationMin: 60,
      });
      const mockCreatedSession = test.factory.session.createWithNulls({
        userId,
        coachId: 'coach-123',
        bookingTypeId: createDto.bookingTypeId,
        timeSlotId: createDto.timeSlotId,
        price: new Decimal(100),
        notes: createDto.notes,
      });

      test.mocks.BookingTypesService.findActiveById.mockResolvedValue(mockBookingType);
      test.mocks.TimeSlotsService.findAvailableById.mockResolvedValue(mockTimeSlot);
      test.mocks.PrismaService.session.create.mockResolvedValue(mockCreatedSession);

      const result = await test.service.create(createDto, userId);

      expect(result.userId).toBe(userId);
      expect(result.notes).toBe(createDto.notes);
      expect(test.mocks.BookingTypesService.findActiveById).toHaveBeenCalledWith(
        createDto.bookingTypeId
      );
      expect(test.mocks.TimeSlotsService.findAvailableById).toHaveBeenCalledWith(
        createDto.timeSlotId
      );
      expect(test.mocks.PrismaService.session.create).toHaveBeenCalledTimes(1);
    });

    it('should create a session with discount applied', async () => {
      const userId = 'user-123';
      const discountCode = 'SAVE20';
      const createDtoWithDiscount = { ...createDto, discountCode };

      const mockBookingType = test.factory.bookingType.createWithNulls({
        id: createDto.bookingTypeId,
        isActive: true,
        basePrice: new Decimal(100),
        coachId: 'coach-123',
      });
      const mockTimeSlot = test.factory.timeSlot.createWithNulls({
        id: createDto.timeSlotId,
        isAvailable: true,
        dateTime: new Date('2024-11-10T10:00:00Z'),
        durationMin: 60,
      });
      const mockDiscount = test.factory.discount.createWithNulls({
        code: discountCode,
        amount: new Decimal(20),
        isActive: true,
      });
      const mockCreatedSession = test.factory.session.createWithNulls({
        userId,
        price: new Decimal(80),
        discountCode,
        discountId: mockDiscount.id,
      });

      test.mocks.BookingTypesService.findActiveById.mockResolvedValue(mockBookingType);
      test.mocks.TimeSlotsService.findAvailableById.mockResolvedValue(mockTimeSlot);
      test.mocks.DiscountsService.findActiveByCode.mockResolvedValue(mockDiscount);
      test.mocks.PrismaService.session.create.mockResolvedValue(mockCreatedSession);
      test.mocks.DiscountsService.incrementUsageInternal.mockResolvedValue(undefined);

      const result = await test.service.create(createDtoWithDiscount, userId);

      expect(Number(result.price)).toBe(80);
      expect(test.mocks.DiscountsService.incrementUsageInternal).toHaveBeenCalledWith(discountCode);
    });

    it('should throw BadRequestException when booking type is inactive', async () => {
      test.mocks.BookingTypesService.findActiveById.mockResolvedValue(null);

      await expect(test.service.create(createDto, 'user-123')).rejects.toThrow(BadRequestException);
      await expect(test.service.create(createDto, 'user-123')).rejects.toThrow(
        'Invalid booking type'
      );
      expect(test.mocks.PrismaService.session.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when booking type not found', async () => {
      test.mocks.BookingTypesService.findActiveById.mockResolvedValue(null);

      await expect(test.service.create(createDto, 'user-123')).rejects.toThrow(BadRequestException);
      expect(test.mocks.PrismaService.session.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when time slot is not available', async () => {
      const mockBookingType = test.factory.bookingType.createWithNulls({
        id: createDto.bookingTypeId,
        isActive: true,
      });

      test.mocks.BookingTypesService.findActiveById.mockResolvedValue(mockBookingType);
      test.mocks.TimeSlotsService.findAvailableById.mockResolvedValue(null);

      await expect(test.service.create(createDto, 'user-123')).rejects.toThrow(BadRequestException);
      await expect(test.service.create(createDto, 'user-123')).rejects.toThrow(
        'Time slot not available'
      );
      expect(test.mocks.PrismaService.session.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when time slot not found', async () => {
      const mockBookingType = test.factory.bookingType.createWithNulls({
        id: createDto.bookingTypeId,
        isActive: true,
      });
      test.mocks.BookingTypesService.findActiveById.mockResolvedValue(mockBookingType);
      test.mocks.TimeSlotsService.findAvailableById.mockResolvedValue(null);

      await expect(test.service.create(createDto, 'user-123')).rejects.toThrow(BadRequestException);
      expect(test.mocks.PrismaService.session.create).not.toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════════
  // Tests for update
  // ═══════════════════════════════════════════════════════════════════════

  describe('update', () => {
    const updateDto = { notes: 'Updated notes' };

    it('should update a session successfully', async () => {
      const sessionId = 'session-123';
      const userId = 'user-123';
      const mockSession = test.factory.session.createWithNulls({
        id: sessionId,
        userId,
      });
      const mockUpdatedSession = test.factory.session.createWithNulls({
        id: sessionId,
        userId,
        notes: updateDto.notes,
      });

      test.mocks.PrismaService.session.findFirst.mockResolvedValue(mockSession);
      test.mocks.PrismaService.session.update.mockResolvedValue(mockUpdatedSession);

      const result = await test.service.update(sessionId, updateDto, userId, Role.USER);

      expect(result.notes).toBe(updateDto.notes);
      expect(test.mocks.PrismaService.session.update).toHaveBeenCalledWith({
        where: { id: sessionId },
        data: updateDto,
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when session not found', async () => {
      test.mocks.PrismaService.session.findFirst.mockResolvedValue(null);

      await expect(
        test.service.update('non-existent', updateDto, 'user-123', Role.USER)
      ).rejects.toThrow(NotFoundException);
      expect(test.mocks.PrismaService.session.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not authorized', async () => {
      const mockSession = test.factory.session.createWithNulls({
        userId: 'other-user',
        coachId: 'other-coach',
      });
      test.mocks.PrismaService.session.findFirst.mockResolvedValue(mockSession);

      await expect(
        test.service.update('session-123', updateDto, 'user-123', Role.USER)
      ).rejects.toThrow(ForbiddenException);
      expect(test.mocks.PrismaService.session.update).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('should cancel a session successfully', async () => {
      const sessionId = 'session-123';
      const userId = 'user-123';
      const futureDate = new Date(Date.now() + ONE_DAY_MS);
      const mockSession = test.factory.session.createWithNulls({
        id: sessionId,
        userId,
        dateTime: futureDate,
        status: SessionStatus.SCHEDULED,
      });
      const mockCancelledSession = test.factory.session.createWithNulls({
        id: sessionId,
        userId,
        dateTime: futureDate,
        status: SessionStatus.CANCELLED,
      });

      test.mocks.PrismaService.session.findFirst.mockResolvedValue(mockSession);
      test.mocks.PrismaService.session.update.mockResolvedValue(mockCancelledSession);

      const result = await test.service.cancel(sessionId, userId, Role.USER);

      expect(result.status).toBe(SessionStatus.CANCELLED);
      expect(test.mocks.PrismaService.session.update).toHaveBeenCalledWith({
        where: { id: sessionId },
        data: { status: SessionStatus.CANCELLED },
        include: expect.any(Object),
      });
    });

    it('should allow coach to cancel session', async () => {
      const sessionId = 'session-123';
      const coachId = 'coach-123';
      const futureDate = new Date(Date.now() + ONE_DAY_MS);
      const mockSession = test.factory.session.createWithNulls({
        id: sessionId,
        coachId,
        dateTime: futureDate,
        status: SessionStatus.SCHEDULED,
      });
      const mockCancelledSession = test.factory.session.createWithNulls({
        id: sessionId,
        coachId,
        status: SessionStatus.CANCELLED,
      });

      test.mocks.PrismaService.session.findFirst.mockResolvedValue(mockSession);
      test.mocks.PrismaService.session.update.mockResolvedValue(mockCancelledSession);

      const result = await test.service.cancel(sessionId, coachId, Role.COACH);

      expect(result.status).toBe(SessionStatus.CANCELLED);
    });

    it('should throw NotFoundException when session not found', async () => {
      test.mocks.PrismaService.session.findFirst.mockResolvedValue(null);

      await expect(test.service.cancel('non-existent', 'user-123', Role.USER)).rejects.toThrow(
        NotFoundException
      );
      expect(test.mocks.PrismaService.session.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not authorized', async () => {
      const mockSession = test.factory.session.createWithNulls({
        userId: 'other-user',
        coachId: 'other-coach',
        dateTime: new Date(Date.now() + ONE_DAY_MS),
        status: SessionStatus.SCHEDULED,
      });
      test.mocks.PrismaService.session.findFirst.mockResolvedValue(mockSession);

      await expect(test.service.cancel('session-123', 'user-123', Role.USER)).rejects.toThrow(
        ForbiddenException
      );
      await expect(test.service.cancel('session-123', 'user-123', Role.USER)).rejects.toThrow(
        'Not authorized to cancel this session'
      );
      expect(test.mocks.PrismaService.session.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when session already cancelled', async () => {
      const mockSession = test.factory.session.createWithNulls({
        userId: 'user-123',
        dateTime: new Date(Date.now() + ONE_DAY_MS),
        status: SessionStatus.CANCELLED,
      });
      test.mocks.PrismaService.session.findFirst.mockResolvedValue(mockSession);

      await expect(test.service.cancel('session-123', 'user-123', Role.USER)).rejects.toThrow(
        BadRequestException
      );
      await expect(test.service.cancel('session-123', 'user-123', Role.USER)).rejects.toThrow(
        'Session already cancelled'
      );
      expect(test.mocks.PrismaService.session.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when cancelling past session', async () => {
      const pastDate = new Date(Date.now() - ONE_DAY_MS);
      const mockSession = test.factory.session.createWithNulls({
        userId: 'user-123',
        dateTime: pastDate,
        status: SessionStatus.SCHEDULED,
      });
      test.mocks.PrismaService.session.findFirst.mockResolvedValue(mockSession);

      await expect(test.service.cancel('session-123', 'user-123', Role.USER)).rejects.toThrow(
        BadRequestException
      );
      await expect(test.service.cancel('session-123', 'user-123', Role.USER)).rejects.toThrow(
        'Cannot cancel past sessions'
      );
      expect(test.mocks.PrismaService.session.update).not.toHaveBeenCalled();
    });
  });

  describe('markAsPaidInternal', () => {
    it('should mark session as paid', async () => {
      const sessionId = 'session-123';
      const paymentId = 'payment-123';
      const mockSession = test.factory.session.createWithNulls({ id: sessionId });

      test.mocks.PrismaService.session.findFirst.mockResolvedValue(mockSession);
      test.mocks.PrismaService.session.update.mockResolvedValue({
        ...mockSession,
        isPaid: true,
        paymentId,
      });

      await test.service.markAsPaidInternal(sessionId, paymentId);

      expect(test.mocks.PrismaService.session.update).toHaveBeenCalledWith({
        where: { id: sessionId },
        data: { isPaid: true, paymentId },
      });
    });

    it('should throw NotFoundException when session not found', async () => {
      test.mocks.PrismaService.session.findFirst.mockResolvedValue(null);

      await expect(test.service.markAsPaidInternal('non-existent', 'payment-123')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('updateCalendarEventInternal', () => {
    it('should update calendar event ID', async () => {
      const sessionId = 'session-123';
      const calendarEventId = 'calendar-event-123';
      const mockSession = test.factory.session.createWithNulls({ id: sessionId });

      test.mocks.PrismaService.session.findFirst.mockResolvedValue(mockSession);
      test.mocks.PrismaService.session.update.mockResolvedValue({
        ...mockSession,
        calendarEventId,
      });

      await test.service.updateCalendarEventInternal(sessionId, calendarEventId);

      expect(test.mocks.PrismaService.session.update).toHaveBeenCalledWith({
        where: { id: sessionId },
        data: { calendarEventId },
      });
    });

    it('should clear calendar event ID when null is passed', async () => {
      const sessionId = 'session-123';
      const mockSession = test.factory.session.createWithNulls({
        id: sessionId,
        calendarEventId: 'old-event-id',
      });

      test.mocks.PrismaService.session.findFirst.mockResolvedValue(mockSession);
      test.mocks.PrismaService.session.update.mockResolvedValue({
        ...mockSession,
        calendarEventId: undefined,
      });

      await test.service.updateCalendarEventInternal(sessionId, null);

      expect(test.mocks.PrismaService.session.update).toHaveBeenCalledWith({
        where: { id: sessionId },
        data: { calendarEventId: undefined },
      });
    });

    it('should throw NotFoundException when session not found', async () => {
      test.mocks.PrismaService.session.findFirst.mockResolvedValue(null);

      await expect(
        test.service.updateCalendarEventInternal('non-existent', 'calendar-event-123')
      ).rejects.toThrow(NotFoundException);
    });
  });
});
