import { BaseResponseDto, createTypedApiDecorators } from '@common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Decimal } from '@prisma/client/runtime/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
export class CoachDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  credentials?: string | null;
}
export class BookingTypeResponseDto extends BaseResponseDto {
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
export class GetAllBookingTypeResponseDto extends BookingTypeResponseDto {
  @ValidateNested()
  @Type(() => CoachDto)
  coach: CoachDto;
}

export class CreateBookingTypeDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => value ?? undefined)
  @IsOptional()
  @IsString()
  description: string | null;

  @ApiProperty({ example: 99.99, description: 'Base price in decimal format' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  basePrice: Decimal;

  @ApiPropertyOptional({ default: true })
  @Transform(({ value }) => value ?? undefined)
  @IsOptional()
  @IsBoolean()
  isActive: boolean;
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
  @Transform(({ value }) => value ?? undefined)
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  basePrice?: Decimal;

  @ApiPropertyOptional()
  @Transform(({ value }) => value ?? undefined)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// Create typed API decorators for booking types
export const GetAllBookingTypeApiResponses = createTypedApiDecorators(GetAllBookingTypeResponseDto);

export const BookingTypeApiResponses = createTypedApiDecorators(BookingTypeResponseDto);
