import { Role } from '@auth-helpers';
import { BadRequestException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

import { CreateCalendarEventDto } from './dto/calendar.dto';

@Injectable()
export class CalendarService {
  constructor(private prisma: PrismaService) {}

  async createEvent(createDto: CreateCalendarEventDto, userId: string, role: Role) {
    const { sessionId } = createDto;

    // Get session details
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        user: true,
        coach: true,
        bookingType: true,
      },
    });

    if (!session) {
      throw new BadRequestException('Session not found');
    }

    // Check authorization
    const isAuthorized = role in UserRole ? session.userId === userId : session.coachId === userId;

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

  async deleteEvent(eventId: string, userId: string, role: Role) {
    // Find session by calendar event ID
    const session = await this.prisma.session.findFirst({
      where: { calendarEventId: eventId },
    });

    if (!session) {
      throw new BadRequestException('Event not found');
    }

    // Check authorization
    const isAuthorized = role in UserRole ? session.userId === userId : session.coachId === userId;

    if (!isAuthorized) {
      throw new BadRequestException('Not authorized');
    }

    // Mock deletion - in production, call Google Calendar API
    await this.prisma.session.update({
      where: { id: session.id },
      data: { calendarEventId: null },
    });

    return { success: true };
  }
}
