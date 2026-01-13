import { IsCuid } from '@common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Decimal } from '@prisma/client/runtime/client';
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

import { CoachSummaryDto } from '../../time-slots/dto/time-slot.dto';

export class ValidateDiscountResponseDto {
  @ApiProperty({ example: 'SUMMER2024' })
  @IsString()
  code: string;

  @ApiProperty({ example: 10.0, description: 'Discount amount' })
  @Type(() => Number)
  amount: Decimal;

  @ApiProperty({ example: true, description: 'Whether the discount code is valid' })
  @IsBoolean()
  isValid: boolean;
}

export class DiscountResponseDto {
  @ApiProperty()
  @IsString()
  @IsCuid()
  id: string;

  @ApiProperty({ type: Date, format: 'date-time' })
  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({ type: Date, format: 'date-time' })
  @IsDate()
  @Type(() => Date)
  updatedAt: Date;

  @ApiProperty({ example: 'SUMMER2024' })
  @IsString()
  code: string;

  @ApiProperty({ example: 10.0, description: 'Discount amount in decimal format' })
  @Type(() => Number)
  amount: Decimal;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2024-12-31T23:59:59Z',
    description: 'Expiry date and time',
  })
  @IsDate()
  @Type(() => Date)
  expiry: Date;

  @ApiProperty({ example: 0, description: 'Number of times this discount has been used' })
  @IsNumber()
  useCount: number;

  @ApiProperty({ example: 1, description: 'Maximum number of times this discount can be used' })
  @IsNumber()
  maxUsage: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty()
  @IsString()
  @IsCuid()
  coachId: string;

  @ApiPropertyOptional({
    description: 'Coach summary information',
    type: CoachSummaryDto,
  })
  @IsOptional()
  @Type(() => CoachSummaryDto)
  coach?: CoachSummaryDto;
}

export class CreateDiscountDto {
  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty()
  @IsDateString()
  expiry: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUsage?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateDiscountDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUsage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ValidateDiscountDto {
  @ApiProperty()
  @IsString()
  code: string;
}
