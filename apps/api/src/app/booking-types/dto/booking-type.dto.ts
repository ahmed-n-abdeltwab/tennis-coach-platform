import { createTypedApiDecorators } from '@common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Decimal } from '@prisma/client/runtime/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsNumber, IsOptional, IsString, Min } from 'class-validator';
export class CoachDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  credentials?: string;
}
export class BookingTypeResponseDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty({ type: Date, format: 'date-time' })
  @IsDate()
  @Type(() => Date)
  createdAt!: Date;

  @ApiProperty({ type: Date, format: 'date-time' })
  @IsDate()
  @Type(() => Date)
  updatedAt!: Date;

  @ApiProperty({ example: 'Personal Training Session' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'One-on-one coaching session focused on your goals' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '99.99', description: 'Base price in decimal format' })
  @Type(() => Number)
  basePrice: Decimal;

  @ApiProperty({ example: true })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({ example: 'coach-id-123' })
  @IsString()
  coachId: string;
}

export class GetAllBookingTypeResponseDto extends BookingTypeResponseDto {}

export class CreateBookingTypeDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 99.99, description: 'Base price in decimal format' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  basePrice: Decimal;
}

export class UpdateBookingTypeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 99.99, description: 'Base price in decimal format' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  basePrice?: Decimal;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// Create typed API decorators for booking types
export const GetAllBookingTypeApiResponses = createTypedApiDecorators(GetAllBookingTypeResponseDto);

export const BookingTypeApiResponses = createTypedApiDecorators(BookingTypeResponseDto);
