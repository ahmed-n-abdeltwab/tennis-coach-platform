import { BadRequestException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { SessionsService } from './../sessions/sessions.service';
import { CalendarEventResponse, CreateCalendarEventDto } from './dto/calendar.dto';

@Injectable()
export class CalendarService {
  constructor(
    private sessionsService: SessionsService,
    private prisma: PrismaService
  ) {}

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

    // Check Authorization
    const isAuthorized =
      role === Role.USER || role === Role.PREMIUM_USER
        ? session.userId === userId
        : session.coachId === userId;

    if (!isAuthorized) {
      throw new BadRequestException('Not authorized');
    }

    // Mock Google Calendar integration
    // In production, use Google Calendar API
    const mockEventId = `event_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // Update session with calendar event ID
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { calendarEventId: mockEventId },
    });

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
    const session = await this.sessionsService.findOne(eventId, userId, role);

    if (!session) {
      throw new BadRequestException('Event not found');
    }

    // Check Authorization
    const isAuthorized =
      role === Role.USER || role === Role.PREMIUM_USER
        ? session.userId === userId
        : session.coachId === userId;

    if (!isAuthorized) {
      throw new BadRequestException('Not authorized');
    }

    // Mock deletion - in production, call Google Calendar API
    await this.prisma.session.update({
      where: { id: eventId },
      data: { calendarEventId: undefined },
    });
    return {
      eventId,
      summary: `The calender event successfully deleted`,
    };
  }
}
