import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Role, SessionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';

import { ServiceTest } from '../../../test/utils';
import { PrismaService } from '../prisma/prisma.service';
import { SessionsService } from '../sessions/sessions.service';

import { CalendarService } from './calendar.service';
import { CreateCalendarEventDto } from './dto/calendar.dto';

describe('CalendarService', () => {
  let test: ServiceTest<CalendarService, PrismaService>;
  let mockSessionService: jest.Mocked<SessionsService>;

  beforeEach(async () => {
    const mockPrisma = {
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      $transaction: jest.fn(),
      bookingType: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      session: {
        update: jest.fn(),
      },
    };

    mockSessionService = {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      findOne: jest.fn(),
    } as any;

    test = new ServiceTest({
      serviceClass: CalendarService,
      mocks: [
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SessionsService, useValue: mockSessionService },
      ],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('createEvent', () => {
    it('should create a calendar event for a user', async () => {
      const userId = 'user-123';
      const sessionId = 'session-123';

      const createDto: CreateCalendarEventDto = {
        sessionId,
      };

      const mockSession = test.factory.session.createWithNulls({
        id: sessionId,
        userId,
      });

      mockSessionService.findOne.mockResolvedValue(mockSession);

      const result = await test.service.createEvent(createDto, userId, Role.USER);

      expect(result).toMatchObject({
        eventId: expect.any(String),
        summary: `${mockSession.bookingType.name} with ${mockSession.coach.name}`,
        start: mockSession.dateTime,
        end: new Date(mockSession.dateTime.getTime() + mockSession.durationMin * 60000),
        attendees: [mockSession.user.email, mockSession.coach.email],
      });

      expect(mockSessionService.findOne).toHaveBeenCalledWith(sessionId, userId, Role.USER);
    });

    it('should create a calendar event for a coach', async () => {
      const coachId = 'coach-123';
      const sessionId = 'session-123';
      const createDto: CreateCalendarEventDto = {
        sessionId,
      };

      const mockSession = test.factory.session.createWithNulls({
        id: sessionId,
        coachId,
      });

      mockSessionService.findOne.mockResolvedValue(mockSession);
      mockSessionService.update.mockResolvedValue(mockSession);

      const result = await test.service.createEvent(createDto, coachId, Role.COACH);

      expect(result).toMatchObject({
        eventId: expect.any(String),
        summary: `${mockSession.bookingType.name} with ${mockSession.coach.name}`,
        start: mockSession.dateTime,
        end: new Date(mockSession.dateTime.getTime() + mockSession.durationMin * 60000),
        attendees: [mockSession.user.email, mockSession.coach.email],
      });

      expect(mockSessionService.findOne).toHaveBeenCalledWith(sessionId, coachId, Role.COACH);
    });

    it('should throw BadRequestException when session not found', async () => {
      const userId = 'user-123';
      const createDto: CreateCalendarEventDto = {
        sessionId: 'non-existent',
      };

      mockSessionService.findOne.mockResolvedValue(null as any);

      await expect(test.service.createEvent(createDto, userId, Role.USER)).rejects.toThrow(
        BadRequestException
      );
      await expect(test.service.createEvent(createDto, userId, Role.USER)).rejects.toThrow(
        'Session not found'
      );
      expect(mockSessionService.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when user not authorized', async () => {
      const userId = 'user-123';
      const sessionId = 'session-123';
      const createDto: CreateCalendarEventDto = {
        sessionId,
      };

      const mockSession = test.factory.session.createWithNulls({
        id: sessionId,
        userId: 'other-user',
      });

      mockSessionService.findOne.mockResolvedValue(mockSession);

      await expect(test.service.createEvent(createDto, userId, Role.USER)).rejects.toThrow(
        ForbiddenException
      );
      await expect(test.service.createEvent(createDto, userId, Role.USER)).rejects.toThrow(
        'Not authorized'
      );
      expect(mockSessionService.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when coach not authorized', async () => {
      const sessionId = 'session-123';
      const createDto: CreateCalendarEventDto = {
        sessionId,
      };

      const mockSession = test.factory.session.createWithNulls({
        id: sessionId,
        coachId: 'other-coach',
      });

      mockSessionService.findOne.mockResolvedValue(mockSession);

      await expect(test.service.createEvent(createDto, 'coach-123', Role.COACH)).rejects.toThrow(
        ForbiddenException
      );
      expect(mockSessionService.update).not.toHaveBeenCalled();
    });

    it('should work for premium users', async () => {
      const userId = 'premium-user-123';
      const coachId = 'coach-1';
      const sessionId = 'session-123';
      const createDto: CreateCalendarEventDto = {
        sessionId,
      };

      const mockSession = test.factory.session.createWithNulls({
        id: sessionId,
        coachId,
        userId,
      });

      mockSessionService.findOne.mockResolvedValue(mockSession);
      mockSessionService.update.mockResolvedValue(mockSession);

      const result = await test.service.createEvent(createDto, userId, Role.PREMIUM_USER);

      expect(result).toMatchObject({
        eventId: expect.any(String),
        summary: `${mockSession.bookingType.name} with ${mockSession.coach.name}`,
        start: mockSession.dateTime,
        end: new Date(mockSession.dateTime.getTime() + mockSession.durationMin * 60000),
        attendees: [mockSession.user.email, mockSession.coach.email],
      });

      expect(mockSessionService.findOne).toHaveBeenCalledWith(sessionId, userId, Role.PREMIUM_USER);
    });
  });

  describe('deleteEvent', () => {
    it('should delete a calendar event for a user', async () => {
      const userId = 'user-123';
      const eventId = 'event-123';

      const mockSession = {
        id: 'session-123',
        userId,
        coachId: 'coach-1',
        bookingTypeId: 'booking-1',
        timeSlotId: 'slot-1',
        dateTime: new Date('2024-11-10T10:00:00Z'),
        durationMin: 60,
        price: new Decimal(99.99),
        isPaid: false,
        status: SessionStatus.SCHEDULED,
        notes: null,
        paymentId: null,
        discountCode: null,
        calendarEventId: eventId,
        discountId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: userId,
          name: 'User Name',
          email: 'user@example.com',
        },
        coach: {
          id: 'coach-1',
          name: 'Coach Name',
          email: 'coach@example.com',
        },
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
        calendarEventId: undefined,
      };

      mockSessionService.findOne.mockResolvedValue(mockSession as any);
      mockSessionService.update.mockResolvedValue(mockUpdatedSession as any);

      const result = await test.service.deleteEvent(eventId, userId, Role.USER);

      expect(result).toMatchObject({
        eventId,
        summary: 'The calender event successfully deleted',
      });
      expect(mockSessionService.findOne).toHaveBeenCalledWith(eventId, userId, Role.USER);
    });

    it('should delete a calendar event for a coach', async () => {
      const coachId = 'coach-123';
      const eventId = 'event-123';

      const mockSession = {
        id: 'session-123',
        userId: 'user-1',
        coachId,
        bookingTypeId: 'booking-1',
        timeSlotId: 'slot-1',
        dateTime: new Date('2024-11-10T10:00:00Z'),
        durationMin: 60,
        price: new Decimal(99.99),
        isPaid: false,
        status: SessionStatus.SCHEDULED,
        notes: null,
        paymentId: null,
        discountCode: null,
        calendarEventId: eventId,
        discountId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'user-1',
          name: 'User Name',
          email: 'user@example.com',
        },
        coach: {
          id: coachId,
          name: 'Coach Name',
          email: 'coach@example.com',
        },
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

      mockSessionService.findOne.mockResolvedValue(mockSession as any);
      mockSessionService.update.mockResolvedValue(mockSession as any);

      const result = await test.service.deleteEvent(eventId, coachId, Role.COACH);

      expect(result).toMatchObject({
        eventId,
        summary: 'The calender event successfully deleted',
      });
      expect(mockSessionService.findOne).toHaveBeenCalledWith(eventId, coachId, Role.COACH);
    });

    it('should throw BadRequestException when event not found', async () => {
      mockSessionService.findOne.mockResolvedValue(null as any);

      await expect(test.service.deleteEvent('non-existent', 'user-123', Role.USER)).rejects.toThrow(
        BadRequestException
      );
      await expect(test.service.deleteEvent('non-existent', 'user-123', Role.USER)).rejects.toThrow(
        'Event not found'
      );
      expect(mockSessionService.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when user not authorized', async () => {
      const eventId = 'event-123';

      const mockSession = {
        id: 'session-123',
        userId: 'other-user',
        coachId: 'coach-1',
        bookingTypeId: 'booking-1',
        timeSlotId: 'slot-1',
        dateTime: new Date('2024-11-10T10:00:00Z'),
        durationMin: 60,
        price: new Decimal(99.99),
        isPaid: false,
        status: SessionStatus.SCHEDULED,
        notes: null,
        paymentId: null,
        discountCode: null,
        calendarEventId: eventId,
        discountId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'other-user',
          name: 'Other User',
          email: 'other@example.com',
        },
        coach: {
          id: 'coach-1',
          name: 'Coach Name',
          email: 'coach@example.com',
        },
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

      mockSessionService.findOne.mockResolvedValue(mockSession as any);

      await expect(test.service.deleteEvent(eventId, 'user-123', Role.USER)).rejects.toThrow(
        BadRequestException
      );
      await expect(test.service.deleteEvent(eventId, 'user-123', Role.USER)).rejects.toThrow(
        'Not authorized'
      );
      expect(mockSessionService.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when coach not authorized', async () => {
      const eventId = 'event-123';

      const mockSession = {
        id: 'session-123',
        userId: 'user-1',
        coachId: 'other-coach',
        bookingTypeId: 'booking-1',
        timeSlotId: 'slot-1',
        dateTime: new Date('2024-11-10T10:00:00Z'),
        durationMin: 60,
        price: new Decimal(99.99),
        isPaid: false,
        status: SessionStatus.SCHEDULED,
        notes: null,
        paymentId: null,
        discountCode: null,
        calendarEventId: eventId,
        discountId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'user-1',
          name: 'User Name',
          email: 'user@example.com',
        },
        coach: {
          id: 'other-coach',
          name: 'Other Coach',
          email: 'other-coach@example.com',
        },
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

      mockSessionService.findOne.mockResolvedValue(mockSession as any);

      await expect(test.service.deleteEvent(eventId, 'coach-123', Role.COACH)).rejects.toThrow(
        BadRequestException
      );
      expect(mockSessionService.update).not.toHaveBeenCalled();
    });

    it('should work for premium users', async () => {
      const userId = 'premium-user-123';
      const eventId = 'event-123';

      const mockSession = {
        id: 'session-123',
        userId,
        coachId: 'coach-1',
        bookingTypeId: 'booking-1',
        timeSlotId: 'slot-1',
        dateTime: new Date('2024-11-10T10:00:00Z'),
        durationMin: 60,
        price: new Decimal(99.99),
        isPaid: false,
        status: SessionStatus.SCHEDULED,
        notes: null,
        paymentId: null,
        discountCode: null,
        calendarEventId: eventId,
        discountId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: userId,
          name: 'Premium User',
          email: 'premium@example.com',
        },
        coach: {
          id: 'coach-1',
          name: 'Coach Name',
          email: 'coach@example.com',
        },
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

      mockSessionService.findOne.mockResolvedValue(mockSession as any);
      mockSessionService.update.mockResolvedValue(mockSession as any);

      const result = await test.service.deleteEvent(eventId, userId, Role.PREMIUM_USER);

      expect(result).toMatchObject({
        eventId,
        summary: 'The calender event successfully deleted',
      });
      expect(mockSessionService.findOne).toHaveBeenCalledWith(eventId, userId, Role.PREMIUM_USER);
    });
  });
});
