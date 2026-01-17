import { IsCuid, IsPositiveDecimal } from '@common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Decimal } from '@prisma/client/runtime/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsEmail, IsOptional, IsString } from 'class-validator';
export class CoachDto {
  @ApiProperty({ example: 'ccoach1234567890123456' })
  @IsString()
  @IsCuid()
  id: string;

  @ApiProperty({ example: 'John Smith' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'coach@example.com' })
  @IsEmail()
  email: string;
}
export class BookingTypeResponseDto {
  @ApiProperty({ example: 'cbookingtype12345678901' })
  @IsString()
  @IsCuid()
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

  @ApiProperty({ example: 'ccoach1234567890123456' })
  @IsString()
  @IsCuid()
  coachId: string;

  @ApiProperty({ type: CoachDto })
  @Type(() => CoachDto)
  coach: CoachDto;
}

export class GetAllBookingTypeResponseDto extends BookingTypeResponseDto {}

export class CreateBookingTypeDto {
  @ApiProperty({ example: 'Personal Training Session' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'One-on-one coaching session focused on your goals' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '99.99', description: 'Base price in decimal format' })
  @IsPositiveDecimal()
  basePrice: string;
}

export class UpdateBookingTypeDto {
  @ApiPropertyOptional({ example: 'Personal Training Session' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'One-on-one coaching session focused on your goals' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '99.99', description: 'Base price in decimal format' })
  @IsOptional()
  @IsPositiveDecimal()
  basePrice?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
