import { BaseResponseDto, createTypedApiDecorators } from '@common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateTimeSlotDto {
  @ApiProperty()
  @IsDateString()
  dateTime!: string;

  @ApiProperty({ default: 60 })
  @IsOptional()
  @IsNumber()
  @Min(15)
  durationMin?: number;

  @ApiProperty({ default: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

export class GetTimeSlotsQuery {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  coachId?: string;
}

export class CoachSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;
}
export class UpdateTimeSlotDto {
  @ApiPropertyOptional()
  @IsDateString()
  dateTime?: string;

  @ApiPropertyOptional({ default: 60 })
  @IsOptional()
  @IsNumber()
  @Min(15)
  durationMin?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsDate()
  @Type(() => Date)
  createdAt?: Date | string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsDate()
  @Type(() => Date)
  updatedAt?: Date | string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coachId?: string;
}
export class TimeSlotResponseDto extends BaseResponseDto {
  @ApiProperty()
  coachId!: string;

  @ApiProperty({ example: '2024-12-25T10:00:00Z' })
  dateTime!: string;

  @ApiProperty({ example: 60, minimum: 15 })
  durationMin!: number;

  @ApiProperty({ example: true })
  isAvailable!: boolean;

  @ApiProperty({ required: false, type: CoachSummaryDto })
  coach?: CoachSummaryDto;
}

// Create typed API decorators for time slots
export const TimeSlotApiResponses = createTypedApiDecorators(TimeSlotResponseDto);
