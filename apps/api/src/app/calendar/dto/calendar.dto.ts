import { createTypedApiDecorators } from '@common';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDate, IsString } from 'class-validator';

export class CreateCalendarEventDto {
  @ApiProperty()
  @IsString()
  sessionId: string;
}

export class CalendarEventResponse {
  @ApiProperty()
  @IsString()
  eventId: string;

  @ApiProperty()
  @IsString()
  summary: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsDate()
  @Type(() => String)
  start?: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsDate()
  @Type(() => String)
  end?: Date;

  @ApiProperty()
  @IsArray()
  attendees?: string[];
}

export const CalendarEventApiResponse = createTypedApiDecorators(CalendarEventResponse);
