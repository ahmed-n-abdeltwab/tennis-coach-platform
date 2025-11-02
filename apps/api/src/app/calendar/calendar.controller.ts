import { JwtAuthGuard } from '@common';
import { Body, Controller, Delete, Param, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CalendarService } from './calendar.service';
import { CreateCalendarEventDto } from './dto/calendar.dto';

@ApiTags('calendar')
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Post('event')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create calendar event' })
  async createEvent(@Body() createDto: CreateCalendarEventDto, @Request() req) {
    return this.calendarService.createEvent(createDto, req.user.id, req.user.role);
  }

  @Delete('event/:eventId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete calendar event' })
  async deleteEvent(@Param('eventId') eventId: string, @Request() req) {
    return this.calendarService.deleteEvent(eventId, req.user.id, req.user.role);
  }
}
