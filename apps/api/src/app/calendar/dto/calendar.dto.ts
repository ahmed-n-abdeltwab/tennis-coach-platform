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
  @Type(() => Date)
  start?: Date | string;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsDate()
  @Type(() => Date)
  end?: Date | string;

  @ApiProperty()
  @IsArray()
  attendees?: string[];
}

export const CalendarEventApiResponse = createTypedApiDecorators(CalendarEventResponse);
