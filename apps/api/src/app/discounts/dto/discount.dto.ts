import { createTypedApiDecorators } from '@common';
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
  code: string;
  amount: Decimal;
  isValid: boolean;
}
export class DiscountResponseDto {
  @ApiProperty({ example: 'discount-id-123' })
  @IsString()
  id: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsDate()
  @Type(() => Date)
  createdAt: Date | string;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsDate()
  @Type(() => Date)
  updatedAt: Date | string;

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
  expiry: Date | string;

  @ApiProperty({ example: 0, description: 'Number of times this discount has been used' })
  @IsNumber()
  useCount: number;

  @ApiProperty({ example: 1, description: 'Maximum number of times this discount can be used' })
  @IsNumber()
  maxUsage: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({ example: 'coach-id-123' })
  @IsString()
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

  @ApiProperty({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUsage?: number;

  @ApiProperty({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateDiscountDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  expiry?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUsage?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ValidateDiscountDto {
  @ApiProperty()
  @IsString()
  code: string;
}

// Create typed API decorators for discounts
export const DiscountApiResponses = createTypedApiDecorators(DiscountResponseDto);
export const ValidateDiscountApiResponses = createTypedApiDecorators(ValidateDiscountResponseDto);
