import { Role } from '@prisma/client';
import { ControllerTest } from '@test-utils';
import { DeepMocked } from '@test-utils/mixins/mock.mixin';

import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { CreateCalendarEventDto } from './dto/calendar.dto';

interface CalendarControllerMocks {
  CalendarService: DeepMocked<CalendarService>;
}

describe('CalendarController', () => {
  let test: ControllerTest<CalendarController, CalendarControllerMocks, 'calendar'>;

  beforeEach(async () => {
    test = new ControllerTest({
      controller: CalendarController,
      moduleName: 'calendar',
      providers: [CalendarService],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('POST /calendar/event', () => {
    it('should create a calendar event for a user', async () => {
      const createDto: CreateCalendarEventDto = {
        sessionId: 'csession123456789012345',
      };

      const mockResponse = test.factory.calendar.createWithNulls();

      test.mocks.CalendarService.createEvent.mockResolvedValue(mockResponse);

      const userToken = await test.auth.createToken({
        role: Role.USER,
        sub: 'cuser12345678901234567',
      });
      await test.http.authenticatedPost('/api/calendar/event', userToken, {
        body: createDto,
      });

      expect(test.mocks.CalendarService.createEvent).toHaveBeenCalledWith(
        createDto,
        'cuser12345678901234567',
        Role.USER
      );
    });

    it('should create a calendar event for a coach', async () => {
      const createDto: CreateCalendarEventDto = {
        sessionId: 'csession789012345678901',
      };

      const mockResponse = test.factory.calendar.create();

      test.mocks.CalendarService.createEvent.mockResolvedValue(mockResponse);

      const coachToken = await test.auth.createToken({
        role: Role.COACH,
        sub: 'ccoach1234567890123456',
      });
      await test.http.authenticatedPost('/api/calendar/event', coachToken, {
        body: createDto,
      });

      expect(test.mocks.CalendarService.createEvent).toHaveBeenCalledWith(
        createDto,
        'ccoach1234567890123456',
        Role.COACH
      );
    });
  });

  describe('DELETE /calendar/event/:eventId', () => {
    it('should delete a calendar event for a user', async () => {
      const eventId = 'ccalendarevent123456789';
      const userId = 'cuser12345678901234567';

      const mockResponse = test.factory.calendar.create({
        eventId,
        summary: 'The calender event successfully deleted',
      });

      test.mocks.CalendarService.deleteEvent.mockResolvedValue(mockResponse);

      const userToken = await test.auth.createToken({ role: Role.USER, sub: userId });
      await test.http.authenticatedDelete(
        `/api/calendar/event/${eventId}` as '/api/calendar/event/{eventId}',
        userToken
      );

      expect(test.mocks.CalendarService.deleteEvent).toHaveBeenCalledWith(
        eventId,
        userId,
        Role.USER
      );
    });

    it('should delete a calendar event for a coach', async () => {
      const eventId = 'ccalendarevent789012345';
      const coachId = 'ccoach1234567890123456';
      const mockResponse = test.factory.calendar.create({
        eventId,
        summary: 'The calender event successfully deleted',
      });

      test.mocks.CalendarService.deleteEvent.mockResolvedValue(mockResponse);

      const coachToken = await test.auth.createToken({ role: Role.COACH, sub: coachId });
      await test.http.authenticatedDelete(
        `/api/calendar/event/${eventId}` as '/api/calendar/event/{eventId}',
        coachToken
      );

      expect(test.mocks.CalendarService.deleteEvent).toHaveBeenCalledWith(
        eventId,
        coachId,
        Role.COACH
      );
    });
  });
});
