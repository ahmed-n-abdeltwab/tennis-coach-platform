import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role, SessionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { DeepMocked, ServiceTest } from '@test-utils';

import { BookingTypesService } from '../booking-types/booking-types.service';
import { DiscountsService } from '../discounts/discounts.service';
import { NotificationsService } from '../notifications/notifications.service';
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
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      aggregate: jest.Mock;
      groupBy: jest.Mock;
    };
  };
  BookingTypesService: DeepMocked<BookingTypesService>;
  TimeSlotsService: DeepMocked<TimeSlotsService>;
  DiscountsService: DeepMocked<DiscountsService>;
  NotificationsService: DeepMocked<NotificationsService>;
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
              count: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              aggregate: jest.fn(),
              groupBy: jest.fn(),
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
            markAsUnavailableInternal: jest.fn(),
            markAsAvailableInternal: jest.fn(),
          },
        },
        {
          provide: DiscountsService,
          useValue: {
            findActiveByCode: jest.fn(),
            incrementUsageInternal: jest.fn(),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            sendBookingConfirmation: jest.fn(),
            sendBookingConfirmationNotification: jest.fn(),
            sendBookingReminder: jest.fn(),
            sendCancellationNotification: jest.fn(),
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

        await expect(
          test.service.findOne('cnonexistent12345678901', 'cuser12345678901234567', Role.USER)
        ).rejects.toThrow(NotFoundException);
        await expect(
          test.service.findOne('cnonexistent12345678901', 'cuser12345678901234567', Role.USER)
        ).rejects.toThrow('Session not found');
      });

      it('should return empty array when throwIfNotFound=false and no results (via findByUser)', async () => {
        test.mocks.PrismaService.session.findMany.mockResolvedValue([]);

        const result = await test.service.findByUser('cuser12345678901234567', Role.USER);

        expect(result).toEqual([]);
      });
    });

    describe('isMany option', () => {
      it('should return array when isMany=true (via findByUser)', async () => {
        const mockSessions = [
          test.factory.session.createWithNulls({ userId: 'cuser12345678901234567' }),
          test.factory.session.createWithNulls({ userId: 'cuser12345678901234567' }),
        ];
        test.mocks.PrismaService.session.findMany.mockResolvedValue(mockSessions);

        const result = await test.service.findByUser('cuser12345678901234567', Role.USER);

        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(2);
        expect(test.mocks.PrismaService.session.findMany).toHaveBeenCalled();
      });

      it('should return single object when isMany=false (via findOne)', async () => {
        const mockSession = test.factory.session.createWithNulls({
          id: 'csession123456789012345',
          userId: 'cuser12345678901234567',
        });
        test.mocks.PrismaService.session.findFirst.mockResolvedValue(mockSession);

        const result = await test.service.findOne(
          'csession123456789012345',
          'cuser12345678901234567',
          Role.USER
        );

        expect(Array.isArray(result)).toBe(false);
        expect(result.id).toBe('csession123456789012345');
        expect(test.mocks.PrismaService.session.findFirst).toHaveBeenCalled();
      });
    });

    describe('include option', () => {
      it('should include standard relations in queries', async () => {
        const mockSession = test.factory.session.createWithNulls({
          userId: 'cuser12345678901234567',
        });
        test.mocks.PrismaService.session.findFirst.mockResolvedValue(mockSession);

        await test.service.findOne('csession123456789012345', 'cuser12345678901234567', Role.USER);

        expect(test.mocks.PrismaService.session.findFirst).toHaveBeenCalledWith({
          where: { id: 'csession123456789012345' },
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
      const userId = 'cuser12345678901234567';
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

    it('should return sessions for a coach with COACH role', async () => {
      const coachId = 'ccoach1234567890123456';
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
      const userId = 'cuser12345678901234567';
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
      const userId = 'cuser12345678901234567';
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

      const result = await test.service.findByUser('cuser45678901234567890', Role.USER);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return session when user is authorized (USER role)', async () => {
      const userId = 'cuser12345678901234567';
      const mockSession = test.factory.session.createWithNulls({
        id: 'csession123456789012345',
        userId,
      });
      test.mocks.PrismaService.session.findFirst.mockResolvedValue(mockSession);

      const result = await test.service.findOne('csession123456789012345', userId, Role.USER);

      expect(result.id).toBe('csession123456789012345');
      expect(result.userId).toBe(userId);
    });

    it('should return session when coach is authorized (COACH role)', async () => {
      const coachId = 'ccoach1234567890123456';
      const mockSession = test.factory.session.createWithNulls({
        id: 'csession123456789012345',
        coachId,
      });
      test.mocks.PrismaService.session.findFirst.mockResolvedValue(mockSession);

      const result = await test.service.findOne('csession123456789012345', coachId, Role.COACH);

      expect(result.id).toBe('csession123456789012345');
      expect(result.coachId).toBe(coachId);
    });

    it('should throw NotFoundException when session not found', async () => {
      test.mocks.PrismaService.session.findFirst.mockResolvedValue(null);

      await expect(
        test.service.findOne('cnonexistent12345678901', 'cuser12345678901234567', Role.USER)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not authorized', async () => {
      const mockSession = test.factory.session.createWithNulls({
        userId: 'cotheruser12345678901',
        coachId: 'cothercoach1234567890',
      });
      test.mocks.PrismaService.session.findFirst.mockResolvedValue(mockSession);

      await expect(
        test.service.findOne('csession123456789012345', 'cuser12345678901234567', Role.USER)
      ).rejects.toThrow(ForbiddenException);
      await expect(
        test.service.findOne('csession123456789012345', 'cuser12345678901234567', Role.USER)
      ).rejects.toThrow('Not authorized to access this session');
    });

    it('should throw ForbiddenException when coach is not authorized', async () => {
      const mockSession = test.factory.session.createWithNulls({
        userId: 'cuser12345678901234567',
        coachId: 'cothercoach1234567890',
      });
      test.mocks.PrismaService.session.findFirst.mockResolvedValue(mockSession);

      await expect(
        test.service.findOne('csession123456789012345', 'ccoach1234567890123456', Role.COACH)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findFirstByCalendarId (internal method)', () => {
    it('should return session by calendar event ID', async () => {
      const calendarEventId = 'ccalendarevent123456789';
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

      await expect(test.service.findFirstByCalendarId('cnonexistent12345678901')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('create', () => {
    const createDto = {
      bookingTypeId: 'cbookingtype12345678901',
      timeSlotId: 'ctimeslot1234567890123',
      notes: 'Test notes',
    };

    it('should create a session successfully', async () => {
      const userId = 'cuser12345678901234567';
      const mockBookingType = test.factory.bookingType.createWithNulls({
        id: createDto.bookingTypeId,
        isActive: true,
        basePrice: new Decimal(100),
        coachId: 'ccoach1234567890123456',
      });
      const mockTimeSlot = test.factory.timeSlot.createWithNulls({
        id: createDto.timeSlotId,
        isAvailable: true,
        dateTime: new Date('2024-11-10T10:00:00Z'),
        durationMin: 60,
      });
      const mockCreatedSession = test.factory.session.createWithNulls({
        userId,
        coachId: 'ccoach1234567890123456',
        bookingTypeId: createDto.bookingTypeId,
        timeSlotId: createDto.timeSlotId,
        price: new Decimal(100),
        notes: createDto.notes,
      });

      test.mocks.PrismaService.session.count.mockResolvedValue(0);
      test.mocks.BookingTypesService.findActiveById.mockResolvedValue(mockBookingType);
      test.mocks.TimeSlotsService.findAvailableById.mockResolvedValue(mockTimeSlot);
      test.mocks.PrismaService.session.create.mockResolvedValue(mockCreatedSession);
      test.mocks.TimeSlotsService.markAsUnavailableInternal.mockResolvedValue(undefined);

      const result = await test.service.create(createDto, userId);

      expect(result.userId).toBe(userId);
      expect(result.notes).toBe(createDto.notes);
      expect(test.mocks.PrismaService.session.count).toHaveBeenCalledWith({
        where: {
          userId,
          isPaid: false,
          status: SessionStatus.SCHEDULED,
        },
      });
      expect(test.mocks.BookingTypesService.findActiveById).toHaveBeenCalledWith(
        createDto.bookingTypeId
      );
      expect(test.mocks.TimeSlotsService.findAvailableById).toHaveBeenCalledWith(
        createDto.timeSlotId
      );
      expect(test.mocks.PrismaService.session.create).toHaveBeenCalledTimes(1);
      expect(test.mocks.TimeSlotsService.markAsUnavailableInternal).toHaveBeenCalledWith(
        createDto.timeSlotId
      );
    });

    it('should create a session with discount applied', async () => {
      const userId = 'cuser12345678901234567';
      const discountCode = 'SAVE20';
      const createDtoWithDiscount = { ...createDto, discountCode };

      const mockBookingType = test.factory.bookingType.createWithNulls({
        id: createDto.bookingTypeId,
        isActive: true,
        basePrice: new Decimal(100),
        coachId: 'ccoach1234567890123456',
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

      test.mocks.PrismaService.session.count.mockResolvedValue(0);
      test.mocks.BookingTypesService.findActiveById.mockResolvedValue(mockBookingType);
      test.mocks.TimeSlotsService.findAvailableById.mockResolvedValue(mockTimeSlot);
      test.mocks.DiscountsService.findActiveByCode.mockResolvedValue(mockDiscount);
      test.mocks.PrismaService.session.create.mockResolvedValue(mockCreatedSession);
      test.mocks.TimeSlotsService.markAsUnavailableInternal.mockResolvedValue(undefined);
      test.mocks.DiscountsService.incrementUsageInternal.mockResolvedValue(undefined);

      const result = await test.service.create(createDtoWithDiscount, userId);

      expect(Number(result.price)).toBe(80);
      expect(test.mocks.DiscountsService.incrementUsageInternal).toHaveBeenCalledWith(discountCode);
    });

    it('should throw BadRequestException when max pending bookings reached', async () => {
      const userId = 'cuser12345678901234567';
      test.mocks.PrismaService.session.count.mockResolvedValue(3);

      await expect(test.service.create(createDto, userId)).rejects.toThrow(BadRequestException);
      await expect(test.service.create(createDto, userId)).rejects.toThrow(
        'Maximum pending bookings (3) reached'
      );
      expect(test.mocks.BookingTypesService.findActiveById).not.toHaveBeenCalled();
      expect(test.mocks.PrismaService.session.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when booking type is inactive', async () => {
      test.mocks.PrismaService.session.count.mockResolvedValue(0);
      test.mocks.BookingTypesService.findActiveById.mockResolvedValue(null);

      await expect(test.service.create(createDto, 'cuser12345678901234567')).rejects.toThrow(
        BadRequestException
      );
      await expect(test.service.create(createDto, 'cuser12345678901234567')).rejects.toThrow(
        'Invalid booking type'
      );
      expect(test.mocks.PrismaService.session.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when booking type not found', async () => {
      test.mocks.PrismaService.session.count.mockResolvedValue(0);
      test.mocks.BookingTypesService.findActiveById.mockResolvedValue(null);

      await expect(test.service.create(createDto, 'cuser12345678901234567')).rejects.toThrow(
        BadRequestException
      );
      expect(test.mocks.PrismaService.session.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when time slot is not available', async () => {
      const mockBookingType = test.factory.bookingType.createWithNulls({
        id: createDto.bookingTypeId,
        isActive: true,
      });

      test.mocks.PrismaService.session.count.mockResolvedValue(0);
      test.mocks.BookingTypesService.findActiveById.mockResolvedValue(mockBookingType);
      test.mocks.TimeSlotsService.findAvailableById.mockResolvedValue(null);

      await expect(test.service.create(createDto, 'cuser12345678901234567')).rejects.toThrow(
        BadRequestException
      );
      await expect(test.service.create(createDto, 'cuser12345678901234567')).rejects.toThrow(
        'Time slot not available'
      );
      expect(test.mocks.PrismaService.session.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when time slot not found', async () => {
      const mockBookingType = test.factory.bookingType.createWithNulls({
        id: createDto.bookingTypeId,
        isActive: true,
      });
      test.mocks.PrismaService.session.count.mockResolvedValue(0);
      test.mocks.BookingTypesService.findActiveById.mockResolvedValue(mockBookingType);
      test.mocks.TimeSlotsService.findAvailableById.mockResolvedValue(null);

      await expect(test.service.create(createDto, 'cuser12345678901234567')).rejects.toThrow(
        BadRequestException
      );
      expect(test.mocks.PrismaService.session.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const updateDto = { notes: 'Updated notes' };

    it('should update a session successfully', async () => {
      const sessionId = 'csession123456789012345';
      const userId = 'cuser12345678901234567';
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
        test.service.update(
          'cnonexistent12345678901',
          updateDto,
          'cuser12345678901234567',
          Role.USER
        )
      ).rejects.toThrow(NotFoundException);
      expect(test.mocks.PrismaService.session.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not authorized', async () => {
      const mockSession = test.factory.session.createWithNulls({
        userId: 'cotheruser12345678901',
        coachId: 'cothercoach1234567890',
      });
      test.mocks.PrismaService.session.findFirst.mockResolvedValue(mockSession);

      await expect(
        test.service.update(
          'csession123456789012345',
          updateDto,
          'cuser12345678901234567',
          Role.USER
        )
      ).rejects.toThrow(ForbiddenException);
      expect(test.mocks.PrismaService.session.update).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('should cancel a session successfully and mark time slot as available', async () => {
      const sessionId = 'csession123456789012345';
      const userId = 'cuser12345678901234567';
      const timeSlotId = 'ctimeslot1234567890123';
      const futureDate = new Date(Date.now() + ONE_DAY_MS);
      const mockSession = test.factory.session.createWithNulls({
        id: sessionId,
        userId,
        timeSlotId,
        dateTime: futureDate,
        status: SessionStatus.SCHEDULED,
      });
      const mockCancelledSession = test.factory.session.createWithNulls({
        id: sessionId,
        userId,
        timeSlotId,
        dateTime: futureDate,
        status: SessionStatus.CANCELLED,
      });

      test.mocks.PrismaService.session.findFirst.mockResolvedValue(mockSession);
      test.mocks.PrismaService.session.update.mockResolvedValue(mockCancelledSession);
      test.mocks.TimeSlotsService.markAsAvailableInternal.mockResolvedValue(undefined);

      const result = await test.service.cancel(sessionId, userId, Role.USER);

      expect(result.status).toBe(SessionStatus.CANCELLED);
      expect(test.mocks.PrismaService.session.update).toHaveBeenCalledWith({
        where: { id: sessionId },
        data: { status: SessionStatus.CANCELLED },
        include: expect.any(Object),
      });
      expect(test.mocks.TimeSlotsService.markAsAvailableInternal).toHaveBeenCalledWith(timeSlotId);
    });

    it('should allow coach to cancel session', async () => {
      const sessionId = 'csession123456789012345';
      const coachId = 'ccoach1234567890123456';
      const timeSlotId = 'ctimeslot1234567890123';
      const futureDate = new Date(Date.now() + ONE_DAY_MS);
      const mockSession = test.factory.session.createWithNulls({
        id: sessionId,
        coachId,
        timeSlotId,
        dateTime: futureDate,
        status: SessionStatus.SCHEDULED,
      });
      const mockCancelledSession = test.factory.session.createWithNulls({
        id: sessionId,
        coachId,
        timeSlotId,
        status: SessionStatus.CANCELLED,
      });

      test.mocks.PrismaService.session.findFirst.mockResolvedValue(mockSession);
      test.mocks.PrismaService.session.update.mockResolvedValue(mockCancelledSession);
      test.mocks.TimeSlotsService.markAsAvailableInternal.mockResolvedValue(undefined);

      const result = await test.service.cancel(sessionId, coachId, Role.COACH);

      expect(result.status).toBe(SessionStatus.CANCELLED);
      expect(test.mocks.TimeSlotsService.markAsAvailableInternal).toHaveBeenCalledWith(timeSlotId);
    });

    it('should throw NotFoundException when session not found', async () => {
      test.mocks.PrismaService.session.findFirst.mockResolvedValue(null);

      await expect(
        test.service.cancel('cnonexistent12345678901', 'cuser12345678901234567', Role.USER)
      ).rejects.toThrow(NotFoundException);
      expect(test.mocks.PrismaService.session.update).not.toHaveBeenCalled();
      expect(test.mocks.TimeSlotsService.markAsAvailableInternal).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not authorized', async () => {
      const mockSession = test.factory.session.createWithNulls({
        userId: 'cotheruser12345678901',
        coachId: 'cothercoach1234567890',
        dateTime: new Date(Date.now() + ONE_DAY_MS),
        status: SessionStatus.SCHEDULED,
      });
      test.mocks.PrismaService.session.findFirst.mockResolvedValue(mockSession);

      await expect(
        test.service.cancel('csession123456789012345', 'cuser12345678901234567', Role.USER)
      ).rejects.toThrow(ForbiddenException);
      await expect(
        test.service.cancel('csession123456789012345', 'cuser12345678901234567', Role.USER)
      ).rejects.toThrow('Not authorized to cancel this session');
      expect(test.mocks.PrismaService.session.update).not.toHaveBeenCalled();
      expect(test.mocks.TimeSlotsService.markAsAvailableInternal).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when session already cancelled', async () => {
      const mockSession = test.factory.session.createWithNulls({
        userId: 'cuser12345678901234567',
        dateTime: new Date(Date.now() + ONE_DAY_MS),
        status: SessionStatus.CANCELLED,
      });
      test.mocks.PrismaService.session.findFirst.mockResolvedValue(mockSession);

      await expect(
        test.service.cancel('csession123456789012345', 'cuser12345678901234567', Role.USER)
      ).rejects.toThrow(BadRequestException);
      await expect(
        test.service.cancel('csession123456789012345', 'cuser12345678901234567', Role.USER)
      ).rejects.toThrow('Session already cancelled');
      expect(test.mocks.PrismaService.session.update).not.toHaveBeenCalled();
      expect(test.mocks.TimeSlotsService.markAsAvailableInternal).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when cancelling past session', async () => {
      const pastDate = new Date(Date.now() - ONE_DAY_MS);
      const mockSession = test.factory.session.createWithNulls({
        userId: 'cuser12345678901234567',
        dateTime: pastDate,
        status: SessionStatus.SCHEDULED,
      });
      test.mocks.PrismaService.session.findFirst.mockResolvedValue(mockSession);

      await expect(
        test.service.cancel('csession123456789012345', 'cuser12345678901234567', Role.USER)
      ).rejects.toThrow(BadRequestException);
      await expect(
        test.service.cancel('csession123456789012345', 'cuser12345678901234567', Role.USER)
      ).rejects.toThrow('Cannot cancel past sessions');
      expect(test.mocks.PrismaService.session.update).not.toHaveBeenCalled();
      expect(test.mocks.TimeSlotsService.markAsAvailableInternal).not.toHaveBeenCalled();
    });
  });

  describe('markAsPaidInternal', () => {
    it('should mark session as paid', async () => {
      const sessionId = 'csession123456789012345';
      const paymentId = 'cpayment12345678901234';
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

      await expect(
        test.service.markAsPaidInternal('cnonexistent12345678901', 'cpayment12345678901234')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateCalendarEventInternal', () => {
    it('should update calendar event ID', async () => {
      const sessionId = 'csession123456789012345';
      const calendarEventId = 'ccalendarevent123456789';
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
      const sessionId = 'csession123456789012345';
      const mockSession = test.factory.session.createWithNulls({
        id: sessionId,
        calendarEventId: 'coldeventid12345678901',
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
        test.service.updateCalendarEventInternal(
          'cnonexistent12345678901',
          'ccalendarevent123456789'
        )
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Analytics Methods', () => {
    describe('countSessions', () => {
      it('should return total session count', async () => {
        test.mocks.PrismaService.session.count.mockResolvedValue(25);

        const result = await test.service.countSessions();

        expect(result).toBe(25);
      });

      it('should apply where filter', async () => {
        test.mocks.PrismaService.session.count.mockResolvedValue(10);

        await test.service.countSessions({ status: SessionStatus.COMPLETED });

        expect(test.mocks.PrismaService.session.count).toHaveBeenCalledWith({
          where: { status: SessionStatus.COMPLETED },
        });
      });
    });

    describe('countByStatus', () => {
      it('should return session counts grouped by status', async () => {
        const mockResult = [
          { status: SessionStatus.SCHEDULED, _count: { status: 5 } },
          { status: SessionStatus.COMPLETED, _count: { status: 10 } },
          { status: SessionStatus.CANCELLED, _count: { status: 2 } },
        ];
        test.mocks.PrismaService.session.groupBy.mockResolvedValue(mockResult);

        const result = await test.service.countByStatus();

        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({ status: SessionStatus.SCHEDULED, count: 5 });
        expect(result[1]).toEqual({ status: SessionStatus.COMPLETED, count: 10 });
      });
    });

    describe('getAverageDuration', () => {
      it('should return average session duration', async () => {
        test.mocks.PrismaService.session.aggregate.mockResolvedValue({
          _avg: { durationMin: 45 },
        });

        const result = await test.service.getAverageDuration();

        expect(result).toBe(45);
      });

      it('should return null when no sessions exist', async () => {
        test.mocks.PrismaService.session.aggregate.mockResolvedValue({
          _avg: { durationMin: null },
        });

        const result = await test.service.getAverageDuration();

        expect(result).toBeNull();
      });
    });

    describe('getCompletedSessionsWithRevenue', () => {
      it('should return completed sessions with revenue data', async () => {
        const mockSessions = [
          {
            bookingType: { basePrice: new Decimal(100) },
            discount: { amount: new Decimal(10) },
          },
          {
            bookingType: { basePrice: new Decimal(150) },
            discount: null,
          },
        ];
        test.mocks.PrismaService.session.findMany.mockResolvedValue(mockSessions);

        const result = await test.service.getCompletedSessionsWithRevenue();

        expect(result).toHaveLength(2);
        expect(test.mocks.PrismaService.session.findMany).toHaveBeenCalledWith({
          where: { status: SessionStatus.COMPLETED },
          select: {
            bookingType: { select: { basePrice: true } },
            discount: { select: { amount: true } },
          },
        });
      });
    });

    describe('getSessionsWithTimeSlots', () => {
      it('should return sessions with time slot data', async () => {
        const mockSessions = [
          { timeSlot: { dateTime: new Date('2024-11-10T10:00:00Z') } },
          { timeSlot: { dateTime: new Date('2024-11-10T14:00:00Z') } },
        ];
        test.mocks.PrismaService.session.findMany.mockResolvedValue(mockSessions);

        const result = await test.service.getSessionsWithTimeSlots();

        expect(result).toHaveLength(2);
      });
    });

    describe('getSessionCountByBookingType', () => {
      it('should return session counts by booking type', async () => {
        const mockResult = [
          { bookingTypeId: 'cbookingtype12345678901', _count: { bookingTypeId: 15 } },
          { bookingTypeId: 'cbookingtype23456789012', _count: { bookingTypeId: 8 } },
        ];
        test.mocks.PrismaService.session.groupBy.mockResolvedValue(mockResult);

        const result = await test.service.getSessionCountByBookingType();

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ bookingTypeId: 'cbookingtype12345678901', count: 15 });
      });

      it('should respect limit parameter', async () => {
        test.mocks.PrismaService.session.groupBy.mockResolvedValue([]);

        await test.service.getSessionCountByBookingType(undefined, 3);

        expect(test.mocks.PrismaService.session.groupBy).toHaveBeenCalledWith({
          by: ['bookingTypeId'],
          where: undefined,
          _count: { bookingTypeId: true },
          orderBy: { _count: { bookingTypeId: 'desc' } },
          take: 3,
        });
      });
    });

    describe('getSessionsForMonthlyRevenue', () => {
      it('should return sessions for monthly revenue calculation', async () => {
        const mockSessions = [
          {
            createdAt: new Date('2024-01-15'),
            bookingType: { basePrice: new Decimal(100) },
            discount: null,
          },
          {
            createdAt: new Date('2024-02-20'),
            bookingType: { basePrice: new Decimal(150) },
            discount: { amount: new Decimal(20) },
          },
        ];
        test.mocks.PrismaService.session.findMany.mockResolvedValue(mockSessions);

        const result = await test.service.getSessionsForMonthlyRevenue();

        expect(result).toHaveLength(2);
        expect(test.mocks.PrismaService.session.findMany).toHaveBeenCalledWith({
          where: undefined,
          select: {
            createdAt: true,
            bookingType: { select: { basePrice: true } },
            discount: { select: { amount: true } },
          },
          orderBy: { createdAt: 'asc' },
        });
      });
    });

    describe('getClientIdsByCoach', () => {
      it('should return unique client IDs for a coach', async () => {
        const mockSessions = [
          { userId: 'cuser12345678901234567' },
          { userId: 'cuser23456789012345678' },
          { userId: 'cuser34567890123456789' },
        ];
        test.mocks.PrismaService.session.findMany.mockResolvedValue(mockSessions);

        const result = await test.service.getClientIdsByCoach('ccoach1234567890123456');

        expect(result).toHaveLength(3);
        expect(result).toContain('cuser12345678901234567');
        expect(test.mocks.PrismaService.session.findMany).toHaveBeenCalledWith({
          where: { coachId: 'ccoach1234567890123456' },
          select: { userId: true },
          distinct: ['userId'],
        });
      });
    });

    describe('findById', () => {
      it('should return session by ID', async () => {
        const mockSession = test.factory.session.createWithNulls({
          id: 'csession123456789012345',
        });
        test.mocks.PrismaService.session.findFirst.mockResolvedValue(mockSession);

        const result = await test.service.findById('csession123456789012345');

        expect(result.id).toBe('csession123456789012345');
      });

      it('should throw NotFoundException when session not found', async () => {
        test.mocks.PrismaService.session.findFirst.mockResolvedValue(null);

        await expect(test.service.findById('cnonexistent12345678901')).rejects.toThrow(
          NotFoundException
        );
      });
    });
  });
});
