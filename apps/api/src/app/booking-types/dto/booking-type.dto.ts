import { BaseResponseDto, createTypedApiDecorators } from '@common';
import { ApiProperty } from '@nestjs/swagger';
import { Decimal } from '@prisma/client/runtime/library';
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

  @ApiProperty({ required: false, example: 'One-on-one coaching session focused on your goals' })
  @Transform(({ value }) => value ?? undefined)
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({ example: 99.99, description: 'Base price in decimal format' })
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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  basePrice: Decimal;

  @ApiProperty({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateBookingTypeDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// Create typed API decorators for booking types
export const GetAllBookingTypeApiResponses = createTypedApiDecorators(GetAllBookingTypeResponseDto);

export const BookingTypeApiResponses = createTypedApiDecorators(BookingTypeResponseDto);
