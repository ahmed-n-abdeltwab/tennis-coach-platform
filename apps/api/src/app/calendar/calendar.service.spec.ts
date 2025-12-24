import { BadRequestException } from '@nestjs/common';
import { Role, SessionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';

import { SessionsService } from '../sessions/sessions.service';

import { CalendarService } from './calendar.service';
import { CreateCalendarEventDto } from './dto/calendar.dto';

describe('CalendarService', () => {
  let service: CalendarService;
  let mockSessionsService: jest.Mocked<SessionsService>;

  beforeEach(() => {
    mockSessionsService = {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      findByUser: jest.fn(),
      findOne: jest.fn(),
      cancel: jest.fn(),
    } as any;

    service = new CalendarService(mockSessionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createEvent', () => {
    it('should create a calendar event for a user', async () => {
      const userId = 'user-123';
      const createDto: CreateCalendarEventDto = {
        sessionId: 'session-123',
      };

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
        calendarEventId: null,
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
        calendarEventId: 'event_123',
      };

      mockSessionsService.findUnique.mockResolvedValue(mockSession as any);
      mockSessionsService.update.mockResolvedValue(mockUpdatedSession as any);

      const result = await service.createEvent(createDto, userId, Role.USER);

      expect(result).toMatchObject({
        eventId: expect.any(String),
        summary: 'Session Type with Coach Name',
        start: mockSession.dateTime,
        end: new Date(mockSession.dateTime.getTime() + 60 * 60000),
        attendees: ['user@example.com', 'coach@example.com'],
      });
      expect(mockSessionsService.findUnique).toHaveBeenCalledWith('session-123');
      expect(mockSessionsService.update).toHaveBeenCalledWith(
        'session-123',
        { calendarEventId: expect.any(String) },
        userId,
        Role.USER
      );
    });

    it('should create a calendar event for a coach', async () => {
      const coachId = 'coach-123';
      const createDto: CreateCalendarEventDto = {
        sessionId: 'session-123',
      };

      const mockSession = {
        id: 'session-123',
        userId: 'user-1',
        coachId,
        bookingTypeId: 'booking-1',
        timeSlotId: 'slot-1',
        dateTime: new Date('2024-11-10T10:00:00Z'),
        durationMin: 30,
        price: new Decimal(50),
        isPaid: false,
        status: SessionStatus.SCHEDULED,
        notes: null,
        paymentId: null,
        discountCode: null,
        calendarEventId: null,
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
          name: 'Quick Session',
          description: 'Description',
          basePrice: new Decimal(50),
        },
        timeSlot: {
          id: 'slot-1',
          dateTime: new Date('2024-11-10T10:00:00Z'),
          durationMin: 30,
          isAvailable: true,
        },
        discount: null,
      };

      mockSessionsService.findUnique.mockResolvedValue(mockSession as any);
      mockSessionsService.update.mockResolvedValue(mockSession as any);

      const result = await service.createEvent(createDto, coachId, Role.COACH);

      expect(result).toMatchObject({
        eventId: expect.any(String),
        summary: 'Quick Session with Coach Name',
        start: mockSession.dateTime,
        end: new Date(mockSession.dateTime.getTime() + 30 * 60000),
        attendees: ['user@example.com', 'coach@example.com'],
      });
      expect(mockSessionsService.findUnique).toHaveBeenCalledWith('session-123');
    });

    it('should throw BadRequestException when session not found', async () => {
      const createDto: CreateCalendarEventDto = {
        sessionId: 'non-existent',
      };

      mockSessionsService.findUnique.mockResolvedValue(null);

      await expect(service.createEvent(createDto, 'user-123', Role.USER)).rejects.toThrow(
        BadRequestException
      );
      await expect(service.createEvent(createDto, 'user-123', Role.USER)).rejects.toThrow(
        'Session not found'
      );
      expect(mockSessionsService.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when user not authorized', async () => {
      const createDto: CreateCalendarEventDto = {
        sessionId: 'session-123',
      };

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
        calendarEventId: null,
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

      mockSessionsService.findUnique.mockResolvedValue(mockSession as any);

      await expect(service.createEvent(createDto, 'user-123', Role.USER)).rejects.toThrow(
        BadRequestException
      );
      await expect(service.createEvent(createDto, 'user-123', Role.USER)).rejects.toThrow(
        'Not authorized'
      );
      expect(mockSessionsService.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when coach not authorized', async () => {
      const createDto: CreateCalendarEventDto = {
        sessionId: 'session-123',
      };

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
        calendarEventId: null,
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

      mockSessionsService.findUnique.mockResolvedValue(mockSession as any);

      await expect(service.createEvent(createDto, 'coach-123', Role.COACH)).rejects.toThrow(
        BadRequestException
      );
      expect(mockSessionsService.update).not.toHaveBeenCalled();
    });

    it('should work for premium users', async () => {
      const userId = 'premium-user-123';
      const createDto: CreateCalendarEventDto = {
        sessionId: 'session-123',
      };

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
        calendarEventId: null,
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

      mockSessionsService.findUnique.mockResolvedValue(mockSession as any);
      mockSessionsService.update.mockResolvedValue(mockSession as any);

      const result = await service.createEvent(createDto, userId, Role.PREMIUM_USER);

      expect(result).toMatchObject({
        eventId: expect.any(String),
        summary: 'Session Type with Coach Name',
      });
      expect(mockSessionsService.findUnique).toHaveBeenCalledWith('session-123');
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

      mockSessionsService.findFirst.mockResolvedValue(mockSession as any);
      mockSessionsService.update.mockResolvedValue(mockUpdatedSession as any);

      const result = await service.deleteEvent(eventId, userId, Role.USER);

      expect(result).toMatchObject({
        eventId,
        summary: 'The calender event successfully deleted',
      });
      expect(mockSessionsService.findFirst).toHaveBeenCalledWith(eventId);
      expect(mockSessionsService.update).toHaveBeenCalledWith(
        'session-123',
        { calendarEventId: undefined },
        userId,
        Role.USER
      );
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

      mockSessionsService.findFirst.mockResolvedValue(mockSession as any);
      mockSessionsService.update.mockResolvedValue(mockSession as any);

      const result = await service.deleteEvent(eventId, coachId, Role.COACH);

      expect(result).toMatchObject({
        eventId,
        summary: 'The calender event successfully deleted',
      });
      expect(mockSessionsService.findFirst).toHaveBeenCalledWith(eventId);
    });

    it('should throw BadRequestException when event not found', async () => {
      mockSessionsService.findFirst.mockResolvedValue(null as any);

      await expect(service.deleteEvent('non-existent', 'user-123', Role.USER)).rejects.toThrow(
        BadRequestException
      );
      await expect(service.deleteEvent('non-existent', 'user-123', Role.USER)).rejects.toThrow(
        'Event not found'
      );
      expect(mockSessionsService.update).not.toHaveBeenCalled();
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

      mockSessionsService.findFirst.mockResolvedValue(mockSession as any);

      await expect(service.deleteEvent(eventId, 'user-123', Role.USER)).rejects.toThrow(
        BadRequestException
      );
      await expect(service.deleteEvent(eventId, 'user-123', Role.USER)).rejects.toThrow(
        'Not authorized'
      );
      expect(mockSessionsService.update).not.toHaveBeenCalled();
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

      mockSessionsService.findFirst.mockResolvedValue(mockSession as any);

      await expect(service.deleteEvent(eventId, 'coach-123', Role.COACH)).rejects.toThrow(
        BadRequestException
      );
      expect(mockSessionsService.update).not.toHaveBeenCalled();
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

      mockSessionsService.findFirst.mockResolvedValue(mockSession as any);
      mockSessionsService.update.mockResolvedValue(mockSession as any);

      const result = await service.deleteEvent(eventId, userId, Role.PREMIUM_USER);

      expect(result).toMatchObject({
        eventId,
        summary: 'The calender event successfully deleted',
      });
      expect(mockSessionsService.findFirst).toHaveBeenCalledWith(eventId);
    });
  });
});
