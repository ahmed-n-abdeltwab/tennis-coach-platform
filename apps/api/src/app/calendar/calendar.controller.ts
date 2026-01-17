import { ApiResponses } from '@common';
import { Body, Controller, Delete, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../iam/authentication/decorators/current-user.decorator';
import { JwtPayload } from '../iam/interfaces/jwt.types';

import { CalendarService } from './calendar.service';
import { CalendarEventResponse, CreateCalendarEventDto } from './dto/calendar.dto';

@ApiTags('calendar')
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Post('event')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create calendar event' })
  @(ApiResponses.for(CalendarEventResponse).Created('Calendar event successfully Created'))
  async createEvent(
    @Body() createDto: CreateCalendarEventDto,
    @CurrentUser() user: JwtPayload
  ): Promise<CalendarEventResponse> {
    return this.calendarService.createEvent(createDto, user.sub, user.role);
  }

  @Delete('event/:eventId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete calendar event' })
  @(ApiResponses.for(CalendarEventResponse).Deleted('Calendar event successfully Deleted'))
  async deleteEvent(
    @Param('eventId') eventId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<CalendarEventResponse> {
    return this.calendarService.deleteEvent(eventId, user.sub, user.role);
  }
}
