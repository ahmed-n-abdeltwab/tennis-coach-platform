import { createTypedApiDecorators } from '@common';
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
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;
}

export class TimeSlotResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ type: Date })
  @Type(() => String)
  dateTime!: Date;

  @ApiProperty()
  durationMin!: number;

  @ApiProperty()
  isAvailable!: boolean;

  @ApiProperty()
  coachId!: string;

  @ApiProperty({ type: CoachSummaryDto })
  @Type(() => CoachSummaryDto)
  coach?: CoachSummaryDto;

  @ApiProperty({ type: Date })
  @Type(() => String)
  createdAt!: Date;

  @ApiProperty({ type: Date })
  @Type(() => String)
  updatedAt!: Date;
}

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
export class UpdateTimeSlotDto extends CreateTimeSlotDto {
  // Inherits all fields as optional via partial logic in the service
}

export class GetTimeSlotsQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coachId?: string;
}
// Create typed API decorators for time slots
export const TimeSlotApiResponses = createTypedApiDecorators(TimeSlotResponseDto);
