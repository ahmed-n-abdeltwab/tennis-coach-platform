import { IsCuid } from '@common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDate, IsOptional, IsString } from 'class-validator';

export class CreateCalendarEventDto {
  @ApiProperty()
  @IsString()
  @IsCuid()
  sessionId: string;
}

export class CalendarEventResponse {
  @ApiProperty()
  @IsString()
  @IsCuid()
  eventId: string;

  @ApiProperty()
  @IsString()
  summary: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  start?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsDate()
  @Type(() => Date)
  @IsCuid()
  end?: Date;

  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  attendees?: string[];
}
