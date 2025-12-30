import { Role } from '@prisma/client';
import { ControllerTest } from '@test-utils';

import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { CreateCalendarEventDto } from './dto/calendar.dto';

describe('CalendarController', () => {
  let test: ControllerTest<CalendarController, CalendarService, 'calendar'>;
  let mockService: jest.Mocked<CalendarService>;

  beforeEach(async () => {
    mockService = {
      createEvent: jest.fn(),
      deleteEvent: jest.fn(),
    } as any;

    test = new ControllerTest({
      controllerClass: CalendarController,
      moduleName: 'calendar',
      providers: [{ provide: CalendarService, useValue: mockService }],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('POST /calendar/event', () => {
    it('should create a calendar event for a user', async () => {
      const createDto: CreateCalendarEventDto = {
        sessionId: 'session-123',
      };

      const mockResponse = test.factory.calendar.create();

      mockService.createEvent.mockResolvedValue(mockResponse);

      const userToken = await test.auth.createRoleToken(Role.USER, {
        sub: 'user-123',
      });
      await test.http.authenticatedPost('/api/calendar/event', userToken, {
        body: createDto,
      });

      expect(mockService.createEvent).toHaveBeenCalledWith(createDto, 'user-123', Role.USER);
    });

    it('should create a calendar event for a premium user', async () => {
      const createDto: CreateCalendarEventDto = {
        sessionId: 'session-456',
      };

      const mockResponse = test.factory.calendar.create();

      mockService.createEvent.mockResolvedValue(mockResponse);

      const premiumToken = await test.auth.createRoleToken(Role.PREMIUM_USER, {
        sub: 'premium-user-123',
      });
      await test.http.authenticatedPost('/api/calendar/event', premiumToken, {
        body: createDto,
      });

      expect(mockService.createEvent).toHaveBeenCalledWith(
        createDto,
        'premium-user-123',
        Role.PREMIUM_USER
      );
    });

    it('should create a calendar event for a coach', async () => {
      const createDto: CreateCalendarEventDto = {
        sessionId: 'session-789',
      };

      const mockResponse = test.factory.calendar.create();

      mockService.createEvent.mockResolvedValue(mockResponse);

      const coachToken = await test.auth.createRoleToken(Role.COACH, {
        sub: 'coach-123',
      });
      await test.http.authenticatedPost('/api/calendar/event', coachToken, {
        body: createDto,
      });

      expect(mockService.createEvent).toHaveBeenCalledWith(createDto, 'coach-123', Role.COACH);
    });
  });

  describe('DELETE /calendar/event/:eventId', () => {
    it('should delete a calendar event for a user', async () => {
      const eventId = 'event-123';
      const userId = 'user-123';

      const mockResponse = test.factory.calendar.create({
        eventId,
        summary: 'The calender event successfully deleted',
      });

      mockService.deleteEvent.mockResolvedValue(mockResponse);

      const userToken = await test.auth.createRoleToken(Role.USER, {
        sub: userId,
      });
      await test.http.authenticatedDelete(
        `/api/calendar/event/${eventId}` as '/api/calendar/event/{eventId}',
        userToken
      );

      expect(mockService.deleteEvent).toHaveBeenCalledWith(eventId, userId, Role.USER);
    });

    it('should delete a calendar event for a premium user', async () => {
      const eventId = 'event-456';
      const userId = 'premium-user-123';

      const mockResponse = test.factory.calendar.create({
        eventId,
        summary: 'The calender event successfully deleted',
      });

      mockService.deleteEvent.mockResolvedValue(mockResponse);

      const premiumToken = await test.auth.createRoleToken(Role.PREMIUM_USER, {
        sub: userId,
      });
      await test.http.authenticatedDelete(
        `/api/calendar/event/${eventId}` as '/api/calendar/event/{eventId}',
        premiumToken
      );

      expect(mockService.deleteEvent).toHaveBeenCalledWith(eventId, userId, Role.PREMIUM_USER);
    });

    it('should delete a calendar event for a coach', async () => {
      const eventId = 'event-789';
      const coachId = 'coach-123';
      const mockResponse = test.factory.calendar.create({
        eventId,
        summary: 'The calender event successfully deleted',
      });

      mockService.deleteEvent.mockResolvedValue(mockResponse);

      const coachToken = await test.auth.createRoleToken(Role.COACH, {
        sub: coachId,
      });
      await test.http.authenticatedDelete(
        `/api/calendar/event/${eventId}` as '/api/calendar/event/{eventId}',
        coachToken
      );

      expect(mockService.deleteEvent).toHaveBeenCalledWith(eventId, coachId, Role.COACH);
    });
  });
});
