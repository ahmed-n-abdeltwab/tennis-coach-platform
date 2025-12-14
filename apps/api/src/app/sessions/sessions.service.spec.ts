import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { BaseServiceTest } from '@test-utils';

import { PrismaService } from '../prisma/prisma.service';

import { CreateSessionDto, GetSessionsQuery, UpdateSessionDto } from './dto/session.dto';
import { SessionsService } from './sessions.service';

// Constants
const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 86400000 milliseconds in a day

class SessionsServiceTest extends BaseServiceTest<SessionsService, PrismaService> {
  async setupService(): Promise<void> {
    this.service = this.module.get<SessionsService>(SessionsService);
    this.prisma = this.module.get<PrismaService>(PrismaService);
  }

  setupMocks() {
    const mockPrismaService = this.createMockPrismaService();
    return [
      {
        provide: PrismaService,
        useValue: mockPrismaService,
      },
    ];
  }

  getServiceClass(): new (...args: unknown[]) => SessionsService {
    return SessionsService as new (...args: unknown[]) => SessionsService;
  }

  override getProviders(): unknown[] {
    return [];
  }

  // Public accessors
  getService(): SessionsService {
    return this.service;
  }

  getPrisma(): any {
    return this.prisma;
  }

  mockReturn<T>(mockMethod: jest.Mock | jest.MockInstance<any, any[]>, returnValue: T): void {
    return this.mockMethodToReturn(mockMethod, returnValue);
  }

  mockThrow(mockMethod: jest.Mock | jest.MockInstance<any, any[]>, error: Error | string): void {
    return this.mockMethodToThrow(mockMethod, error);
  }
}

describe('SessionsService', () => {
  let test: SessionsServiceTest;

  beforeEach(async () => {
    test = new SessionsServiceTest();
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

      const mockPrisma = test.getPrisma();
      mockPrisma.session.findMany.mockResolvedValue(mockSessions);

      const result = await test.getService().findByUser(userId, Role.USER);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'session-1',
        userId,
        status: 'scheduled',
      });
      expect(mockPrisma.session.findMany).toHaveBeenCalledWith({
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

      const mockPrisma = test.getPrisma();
      mockPrisma.session.findMany.mockResolvedValue(mockSessions);

      const result = await test.getService().findByUser(coachId, Role.COACH);

      expect(result).toHaveLength(1);
      expect(mockPrisma.session.findMany).toHaveBeenCalledWith({
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

      const mockPrisma = test.getPrisma();
      mockPrisma.session.findMany.mockResolvedValue([]);

      await test.getService().findByUser(userId, Role.USER, query);

      expect(mockPrisma.session.findMany).toHaveBeenCalledWith({
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

      const mockPrisma = test.getPrisma();
      mockPrisma.session.findUnique.mockResolvedValue(mockSession);

      const result = await test.getService().findOne(sessionId, userId, Role.USER);

      expect(result).toMatchObject({
        id: sessionId,
        userId,
      });
      expect(mockPrisma.session.findUnique).toHaveBeenCalledWith({
        where: { id: sessionId },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when session not found', async () => {
      const mockPrisma = test.getPrisma();
      mockPrisma.session.findUnique.mockResolvedValue(null);

      await expect(
        test.getService().findOne('non-existent', 'user-123', Role.USER)
      ).rejects.toThrow(NotFoundException);
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

      const mockPrisma = test.getPrisma();
      mockPrisma.session.findUnique.mockResolvedValue(mockSession);

      await expect(test.getService().findOne('session-123', 'user-123', Role.USER)).rejects.toThrow(
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

      const mockPrisma = test.getPrisma();
      mockPrisma.bookingType.findUnique.mockResolvedValue(mockBookingType);
      mockPrisma.timeSlot.findUnique.mockResolvedValue(mockTimeSlot);
      mockPrisma.session.create.mockResolvedValue(mockCreatedSession);

      const result = await test.getService().create(createDto, userId);

      expect(result).toMatchObject({
        id: 'session-123',
        userId,
        price: new Decimal(100),
      });
      expect(mockPrisma.bookingType.findUnique).toHaveBeenCalledWith({
        where: { id: createDto.bookingTypeId },
      });
      expect(mockPrisma.timeSlot.findUnique).toHaveBeenCalledWith({
        where: { id: createDto.timeSlotId },
      });
      expect(mockPrisma.session.create).toHaveBeenCalledTimes(1);
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

      const mockPrisma = test.getPrisma();
      mockPrisma.bookingType.findUnique.mockResolvedValue(mockBookingType);
      mockPrisma.timeSlot.findUnique.mockResolvedValue(mockTimeSlot);
      mockPrisma.discount.findFirst.mockResolvedValue(mockDiscount);
      mockPrisma.session.create.mockResolvedValue(mockCreatedSession);
      mockPrisma.discount.update.mockResolvedValue(mockDiscount);

      const result = await test.getService().create(createDto, userId);

      expect(result.price).toEqual(new Decimal(80));
      expect(mockPrisma.discount.update).toHaveBeenCalledWith({
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

      const mockPrisma = test.getPrisma();
      mockPrisma.bookingType.findUnique.mockResolvedValue(mockBookingType);

      await expect(test.getService().create(createDto, 'user-123')).rejects.toThrow(
        BadRequestException
      );
      expect(mockPrisma.session.create).not.toHaveBeenCalled();
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

      const mockPrisma = test.getPrisma();
      mockPrisma.bookingType.findUnique.mockResolvedValue(mockBookingType);
      mockPrisma.timeSlot.findUnique.mockResolvedValue(mockTimeSlot);

      await expect(test.getService().create(createDto, 'user-123')).rejects.toThrow(
        BadRequestException
      );
      expect(mockPrisma.session.create).not.toHaveBeenCalled();
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

      const mockPrisma = test.getPrisma();
      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.session.update.mockResolvedValue(mockUpdatedSession);

      const result = await test.getService().update(sessionId, updateDto, userId, Role.USER);

      expect(result.notes).toBe('Updated notes');
      expect(mockPrisma.session.update).toHaveBeenCalledWith({
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

      const mockPrisma = test.getPrisma();
      mockPrisma.session.findUnique.mockResolvedValue({
        ...mockCancelledSession,
        status: 'scheduled',
      });
      mockPrisma.session.update.mockResolvedValue(mockCancelledSession);

      const result = await test.getService().cancel(sessionId, userId, Role.USER);

      expect(result.status).toBe('cancelled');
      expect(mockPrisma.session.update).toHaveBeenCalledWith({
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

      const mockPrisma = test.getPrisma();
      mockPrisma.session.findUnique.mockResolvedValue({
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

      await expect(test.getService().cancel(sessionId, userId, Role.USER)).rejects.toThrow(
        BadRequestException
      );
      expect(mockPrisma.session.update).not.toHaveBeenCalled();
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

      const mockPrisma = test.getPrisma();
      mockPrisma.session.findUnique.mockResolvedValue({
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

      await expect(test.getService().cancel(sessionId, userId, Role.USER)).rejects.toThrow(
        BadRequestException
      );
      expect(mockPrisma.session.update).not.toHaveBeenCalled();
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

      const mockPrisma = test.getPrisma();
      mockPrisma.session.findFirst.mockResolvedValue(mockSession);

      const result = await test.getService().findFirst(calendarEventId);

      expect(result).toMatchObject({
        id: 'session-123',
        calendarEventId,
      });
      expect(mockPrisma.session.findFirst).toHaveBeenCalledWith({
        where: { calendarEventId },
      });
    });

    it('should throw BadRequestException when session not found', async () => {
      const mockPrisma = test.getPrisma();
      mockPrisma.session.findFirst.mockResolvedValue(null);

      await expect(test.getService().findFirst('non-existent')).rejects.toThrow(
        BadRequestException
      );
    });
  });
});
