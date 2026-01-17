import { IsCuid } from '@common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CoachSummaryDto {
  @ApiProperty({ example: 'ccoach1234567890123456' })
  @IsCuid()
  id!: string;

  @ApiProperty({ example: 'John Smith' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'coach@example.com' })
  @IsEmail()
  email!: string;
}

export class TimeSlotResponseDto {
  @ApiProperty({ example: 'ctimeslot123456789012' })
  @IsCuid()
  @IsString()
  id!: string;

  @ApiProperty({
    type: Date,
    example: '2024-11-10T10:00:00Z',
    description: 'Date and time of the time slot',
  })
  @Type(() => Date)
  dateTime!: Date;

  @ApiProperty({
    example: 60,
    description: 'Duration of the time slot in minutes',
  })
  @IsNumber()
  durationMin!: number;

  @ApiProperty({
    example: true,
    description: 'Whether the time slot is available for booking',
  })
  @IsBoolean()
  isAvailable!: boolean;

  @ApiProperty({ example: 'ccoach1234567890123456' })
  @IsCuid()
  coachId!: string;

  @ApiProperty({ type: CoachSummaryDto })
  @Type(() => CoachSummaryDto)
  coach?: CoachSummaryDto;

  @ApiProperty({ type: Date, format: 'date-time' })
  @Type(() => Date)
  createdAt!: Date;

  @ApiProperty({ type: Date, format: 'date-time' })
  @Type(() => Date)
  updatedAt!: Date;
}

export class CreateTimeSlotDto {
  @ApiProperty({
    example: '2024-11-10T10:00:00Z',
    description: 'Date and time for the time slot',
  })
  @IsDateString()
  dateTime!: string;

  @ApiProperty({
    default: 60,
    example: 60,
    description: 'Duration in minutes (minimum 15)',
  })
  @IsOptional()
  @IsNumber()
  @Min(15)
  durationMin?: number;

  @ApiProperty({
    default: true,
    example: true,
    description: 'Whether the time slot is available for booking',
  })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}
export class UpdateTimeSlotDto extends CreateTimeSlotDto {
  // Inherits all fields as optional via partial logic in the service
}

export class GetTimeSlotsQuery {
  @ApiPropertyOptional({
    example: '2024-11-01T00:00:00Z',
    description: 'Filter time slots from this date',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2024-11-30T23:59:59Z',
    description: 'Filter time slots until this date',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    example: 'ccoach1234567890123456',
    description: 'Filter time slots by coach ID',
  })
  @IsOptional()
  @IsString()
  @IsCuid()
  coachId?: string;
}
