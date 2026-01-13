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
  @ApiProperty()
  @IsCuid()
  id!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;
}

export class TimeSlotResponseDto {
  @ApiProperty()
  @IsCuid()
  @IsString()
  id!: string;

  @ApiProperty({ type: Date })
  @Type(() => Date)
  dateTime!: Date;

  @ApiProperty()
  @IsNumber()
  durationMin!: number;

  @ApiProperty()
  @IsBoolean()
  isAvailable!: boolean;

  @ApiProperty()
  @IsCuid()
  coachId!: string;

  @ApiProperty({ type: CoachSummaryDto })
  @Type(() => CoachSummaryDto)
  coach?: CoachSummaryDto;

  @ApiProperty({ type: Date })
  @Type(() => Date)
  createdAt!: Date;

  @ApiProperty({ type: Date })
  @Type(() => Date)
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
  @IsCuid()
  coachId?: string;
}
