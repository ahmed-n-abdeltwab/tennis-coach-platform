import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ServiceTest } from '@test-utils';
import { DeepMocked } from '@test-utils/mixins/mock.mixin';

import { PrismaService } from '../prisma/prisma.service';
import { SessionsService } from '../sessions/sessions.service';

import { CalendarService } from './calendar.service';
import { CreateCalendarEventDto } from './dto/calendar.dto';

interface CalendarTestMocks {
  /** Mocked SessionsService - auto deep-mocked */
  SessionsService: DeepMocked<SessionsService>;
  /** Custom PrismaService mock */
  PrismaService: {
    session: { update: jest.Mock };
    bookingType: { create: jest.Mock; findFirst: jest.Mock; update: jest.Mock; delete: jest.Mock };
  };
}

describe('CalendarService', () => {
  let test: ServiceTest<CalendarService, CalendarTestMocks>;

  beforeEach(async () => {
    test = new ServiceTest({
      service: CalendarService,
      providers: [
        SessionsService,
        {
          provide: PrismaService,
          useValue: {
            bookingType: {
              create: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            session: {
              update: jest.fn(),
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

      test.mocks.SessionsService.findOne.mockResolvedValue(mockSession);

      const result = await test.service.createEvent(createDto, userId, Role.USER);

      expect(result).toMatchObject({
        eventId: expect.any(String),
        summary: `${mockSession.bookingType.name} with ${mockSession.coach.name}`,
        start: mockSession.dateTime,
        end: new Date(mockSession.dateTime.getTime() + mockSession.durationMin * 60000),
        attendees: [mockSession.user.email, mockSession.coach.email],
      });

      expect(test.mocks.SessionsService.findOne).toHaveBeenCalledWith(sessionId, userId, Role.USER);
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

      test.mocks.SessionsService.findOne.mockResolvedValue(mockSession);
      test.mocks.SessionsService.update.mockResolvedValue(mockSession);

      const result = await test.service.createEvent(createDto, coachId, Role.COACH);

      expect(result).toMatchObject({
        eventId: expect.any(String),
        summary: `${mockSession.bookingType.name} with ${mockSession.coach.name}`,
        start: mockSession.dateTime,
        end: new Date(mockSession.dateTime.getTime() + mockSession.durationMin * 60000),
        attendees: [mockSession.user.email, mockSession.coach.email],
      });

      expect(test.mocks.SessionsService.findOne).toHaveBeenCalledWith(
        sessionId,
        coachId,
        Role.COACH
      );
    });

    it('should throw BadRequestException when session not found', async () => {
      const userId = 'user-123';
      const createDto: CreateCalendarEventDto = {
        sessionId: 'non-existent',
      };

      test.mocks.SessionsService.findOne.mockResolvedValue(null as any);

      await expect(test.service.createEvent(createDto, userId, Role.USER)).rejects.toThrow(
        BadRequestException
      );
      await expect(test.service.createEvent(createDto, userId, Role.USER)).rejects.toThrow(
        'Session not found'
      );
      expect(test.mocks.SessionsService.update).not.toHaveBeenCalled();
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

      test.mocks.SessionsService.findOne.mockResolvedValue(mockSession);

      await expect(test.service.createEvent(createDto, userId, Role.USER)).rejects.toThrow(
        ForbiddenException
      );
      await expect(test.service.createEvent(createDto, userId, Role.USER)).rejects.toThrow(
        'Not authorized'
      );
      expect(test.mocks.SessionsService.update).not.toHaveBeenCalled();
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

      test.mocks.SessionsService.findOne.mockResolvedValue(mockSession);

      await expect(test.service.createEvent(createDto, 'coach-123', Role.COACH)).rejects.toThrow(
        ForbiddenException
      );
      expect(test.mocks.SessionsService.update).not.toHaveBeenCalled();
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

      test.mocks.SessionsService.findOne.mockResolvedValue(mockSession);
      test.mocks.SessionsService.update.mockResolvedValue(mockSession);

      const result = await test.service.createEvent(createDto, userId, Role.PREMIUM_USER);

      expect(result).toMatchObject({
        eventId: expect.any(String),
        summary: `${mockSession.bookingType.name} with ${mockSession.coach.name}`,
        start: mockSession.dateTime,
        end: new Date(mockSession.dateTime.getTime() + mockSession.durationMin * 60000),
        attendees: [mockSession.user.email, mockSession.coach.email],
      });

      expect(test.mocks.SessionsService.findOne).toHaveBeenCalledWith(
        sessionId,
        userId,
        Role.PREMIUM_USER
      );
    });
  });

  describe('deleteEvent', () => {
    it('should delete a calendar event for a user', async () => {
      const userId = 'user-123';
      const eventId = 'event-123';
      const sessionId = 'session-123';

      const mockSession = test.factory.session.createWithNulls({
        id: sessionId,
        userId,
        calendarEventId: eventId,
      });

      test.mocks.SessionsService.findFirstByCalendarId.mockResolvedValue(mockSession);

      const result = await test.service.deleteEvent(eventId, userId, Role.USER);

      expect(result).toMatchObject({
        eventId,
        summary: 'The calender event successfully deleted',
      });
      expect(test.mocks.SessionsService.findFirstByCalendarId).toHaveBeenCalledWith(eventId);
    });

    it('should delete a calendar event for a coach', async () => {
      const coachId = 'coach-123';
      const eventId = 'event-123';
      const sessionId = 'session-123';

      const mockSession = test.factory.session.createWithNulls({
        id: sessionId,
        coachId,
        calendarEventId: eventId,
      });

      test.mocks.SessionsService.findFirstByCalendarId.mockResolvedValue(mockSession);

      const result = await test.service.deleteEvent(eventId, coachId, Role.COACH);

      expect(result).toMatchObject({
        eventId,
        summary: 'The calender event successfully deleted',
      });
      expect(test.mocks.SessionsService.findFirstByCalendarId).toHaveBeenCalledWith(eventId);
    });

    it('should throw BadRequestException when event not found', async () => {
      test.mocks.SessionsService.findFirstByCalendarId.mockResolvedValue(null as unknown as never);

      await expect(test.service.deleteEvent('non-existent', 'user-123', Role.USER)).rejects.toThrow(
        BadRequestException
      );
      await expect(test.service.deleteEvent('non-existent', 'user-123', Role.USER)).rejects.toThrow(
        'Event not found'
      );
      expect(test.mocks.SessionsService.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when user not authorized', async () => {
      const eventId = 'event-123';
      const sessionId = 'session-123';

      const mockSession = test.factory.session.createWithNulls({
        id: sessionId,
        userId: 'other-user',
        calendarEventId: eventId,
      });

      test.mocks.SessionsService.findFirstByCalendarId.mockResolvedValue(mockSession);

      await expect(test.service.deleteEvent(eventId, 'user-123', Role.USER)).rejects.toThrow(
        BadRequestException
      );
      await expect(test.service.deleteEvent(eventId, 'user-123', Role.USER)).rejects.toThrow(
        'Not authorized'
      );
      expect(test.mocks.SessionsService.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when coach not authorized', async () => {
      const eventId = 'event-123';
      const sessionId = 'session-123';

      const mockSession = test.factory.session.createWithNulls({
        id: sessionId,
        coachId: 'other-coach',
        calendarEventId: eventId,
      });

      test.mocks.SessionsService.findFirstByCalendarId.mockResolvedValue(mockSession);

      await expect(test.service.deleteEvent(eventId, 'coach-123', Role.COACH)).rejects.toThrow(
        BadRequestException
      );
      expect(test.mocks.SessionsService.update).not.toHaveBeenCalled();
    });

    it('should work for premium users', async () => {
      const userId = 'premium-user-123';
      const eventId = 'event-123';
      const sessionId = 'session-123';

      const mockSession = test.factory.session.createWithNulls({
        id: sessionId,
        userId,
        calendarEventId: eventId,
      });

      test.mocks.SessionsService.findFirstByCalendarId.mockResolvedValue(mockSession);

      const result = await test.service.deleteEvent(eventId, userId, Role.PREMIUM_USER);

      expect(result).toMatchObject({
        eventId,
        summary: 'The calender event successfully deleted',
      });
      expect(test.mocks.SessionsService.findFirstByCalendarId).toHaveBeenCalledWith(eventId);
    });
  });
});
