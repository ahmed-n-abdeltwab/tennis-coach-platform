import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';

import { SessionsService } from './../sessions/sessions.service';
import { CalendarEventResponse, CreateCalendarEventDto } from './dto/calendar.dto';

@Injectable()
export class CalendarService {
  constructor(private sessionsService: SessionsService) {}

  async createEvent(
    createDto: CreateCalendarEventDto,
    userId: string,
    role: Role
  ): Promise<CalendarEventResponse> {
    const { sessionId } = createDto;

    // Get session details
    const session = await this.sessionsService.findOne(sessionId, userId, role);

    if (!session) {
      throw new BadRequestException('Session not found');
    }

    // 1. Correct way to check for multiple roles
    const isClientRole = ([Role.USER] as Role[]).includes(role);
    // 2. Logic to determine if the user owns this session
    const isAuthorized = isClientRole ? session.userId === userId : session.coachId === userId;

    // 3. Throw exception ONLY if they are NOT authorized
    if (!isAuthorized) {
      throw new ForbiddenException('Not authorized to access this session');
    }

    // Mock Google Calendar integration
    // In production, use Google Calendar API
    const mockEventId = `event_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // Update session with calendar event ID using SessionsService internal method
    await this.sessionsService.updateCalendarEventInternal(sessionId, mockEventId);

    return {
      eventId: mockEventId,
      summary: `${session.bookingType.name} with ${session.coach.name}`,
      start: session.dateTime,
      end: new Date(session.dateTime.getTime() + session.durationMin * 60000),
      attendees: [session.user.email, session.coach.email],
    };
  }

  async deleteEvent(eventId: string, userId: string, role: Role): Promise<CalendarEventResponse> {
    // Find session by calendar event ID
    const session = await this.sessionsService.findFirstByCalendarId(eventId);

    if (!session) {
      throw new BadRequestException('Event not found');
    }

    // Check Authorization
    const isClientRole = ([Role.USER] as Role[]).includes(role);
    const isAuthorized = isClientRole ? session.userId === userId : session.coachId === userId;

    if (!isAuthorized) {
      throw new BadRequestException('Not authorized');
    }

    // Mock deletion - in production, call Google Calendar API
    await this.sessionsService.updateCalendarEventInternal(session.id, null);
    return {
      eventId,
      summary: `The calender event successfully deleted`,
    };
  }
}
