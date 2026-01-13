import { IsCuid } from '@common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Decimal } from '@prisma/client/runtime/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsDecimal,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CustomServiceResponseDto {
  @ApiProperty({ example: 'custom-service-id-123' })
  @IsString()
  id!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsDate()
  @Type(() => Date)
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsDate()
  @Type(() => Date)
  updatedAt!: Date;

  @ApiProperty({ example: 'Personal Training Session' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'One-on-one coaching session' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 99.99, description: 'Base price in decimal format' })
  @Type(() => Number)
  basePrice!: Decimal;

  @ApiProperty({ example: 60, description: 'Duration in minutes' })
  @IsInt()
  duration!: number;

  @ApiProperty({ example: false, description: 'Whether this is a template' })
  @IsBoolean()
  isTemplate!: boolean;

  @ApiProperty({ example: false, description: 'Whether this is publicly visible' })
  @IsBoolean()
  isPublic!: boolean;

  @ApiProperty({ example: 0, description: 'Number of times this service has been used' })
  @IsInt()
  usageCount!: number;

  @ApiProperty({ example: 'coach-id-123', description: 'ID of the coach who created this service' })
  @IsString()
  coachId!: string;

  @ApiPropertyOptional({
    example: 'booking-type-id-123',
    description: 'Pre-filled booking type ID',
  })
  @IsOptional()
  @IsString()
  prefilledBookingTypeId?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    example: '2024-11-10T10:00:00Z',
    description: 'Pre-filled date and time',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  prefilledDateTime?: Date;

  @ApiPropertyOptional({ example: 'time-slot-id-123', description: 'Pre-filled time slot ID' })
  @IsOptional()
  @IsString()
  prefilledTimeSlotId?: string;
}

export class CreateCustomServiceDto {
  @ApiProperty({ example: 'Personal Training Session', description: 'Name of the custom service' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    example: 'One-on-one coaching session',
    description: 'Description of the custom service',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '99.99', description: 'Base price of the service' })
  @IsDecimal({ decimal_digits: '0,2' })
  @IsNotEmpty()
  basePrice!: string;

  @ApiProperty({ example: 60, description: 'Duration in minutes' })
  @IsInt()
  @Min(1)
  duration!: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether this is a template',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isTemplate?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether this is publicly visible',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional({
    example: 'booking-type-id-123',
    description: 'Pre-filled booking type ID',
  })
  @IsCuid()
  @IsOptional()
  prefilledBookingTypeId?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    example: '2024-11-10T10:00:00Z',
    description: 'Pre-filled date and time',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  prefilledDateTime?: Date;

  @ApiPropertyOptional({ example: 'time-slot-id-123', description: 'Pre-filled time slot ID' })
  @IsCuid()
  @IsOptional()
  prefilledTimeSlotId?: string;
}

export class UpdateCustomServiceDto {
  @ApiPropertyOptional({
    example: 'Personal Training Session',
    description: 'Name of the custom service',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: 'One-on-one coaching session',
    description: 'Description of the custom service',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: '99.99', description: 'Base price of the service' })
  @IsDecimal({ decimal_digits: '0,2' })
  @IsOptional()
  basePrice?: string;

  @ApiPropertyOptional({ example: 60, description: 'Duration in minutes' })
  @IsInt()
  @Min(1)
  @IsOptional()
  duration?: number;

  @ApiPropertyOptional({ example: false, description: 'Whether this is a template' })
  @IsBoolean()
  @IsOptional()
  isTemplate?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Whether this is publicly visible' })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional({
    example: 'booking-type-id-123',
    description: 'Pre-filled booking type ID',
  })
  @IsCuid()
  @IsOptional()
  prefilledBookingTypeId?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    example: '2024-11-10T10:00:00Z',
    description: 'Pre-filled date and time',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  prefilledDateTime?: Date;

  @ApiPropertyOptional({ example: 'time-slot-id-123', description: 'Pre-filled time slot ID' })
  @IsCuid()
  @IsOptional()
  prefilledTimeSlotId?: string;
}

export class SendCustomServiceDto {
  @ApiProperty({ example: 'user-id-123', description: 'User ID to send the service to' })
  @IsCuid()
  @IsNotEmpty()
  userId!: string;

  @ApiPropertyOptional({
    example: 'Check out this custom service I created for you!',
    description: 'Optional message to include',
  })
  @IsString()
  @IsOptional()
  message?: string;
}

export class SendCustomServiceResponseDto {
  @ApiProperty({
    example: 'Custom service sent to user successfully',
    description: 'Success message',
  })
  @IsString()
  message!: string;
}

export class GetCustomServicesQuery {
  @ApiPropertyOptional({ example: false, description: 'Filter by template status' })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  isTemplate?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Filter by public visibility' })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  isPublic?: boolean;

  @ApiPropertyOptional({ example: 'coach-id-123', description: 'Filter by coach ID' })
  @IsCuid()
  @IsOptional()
  coachId?: string;
}
