import { IsCuid } from '@common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDate, IsOptional, IsString } from 'class-validator';

export class CreateCalendarEventDto {
  @ApiProperty({
    example: 'csession123456789012345',
    description: 'Session ID to create calendar event for',
  })
  @IsString()
  @IsCuid()
  sessionId: string;
}

export class CalendarEventResponse {
  @ApiProperty({
    example: 'cevent123456789012345',
    description: 'Calendar event ID',
  })
  @IsString()
  @IsCuid()
  eventId: string;

  @ApiProperty({
    example: 'Tennis Coaching Session with John Doe',
    description: 'Event summary/title',
  })
  @IsString()
  summary: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    example: '2024-11-10T10:00:00Z',
    description: 'Event start time',
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  start?: Date;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    example: '2024-11-10T11:00:00Z',
    description: 'Event end time',
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  end?: Date;

  @ApiPropertyOptional({
    type: [String],
    example: ['user@example.com', 'coach@example.com'],
    description: 'List of attendee email addresses',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attendees?: string[];
}
