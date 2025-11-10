import { BaseResponseDto, createTypedApiDecorators } from '@common';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class BookingTypeResponseDto extends BaseResponseDto {
  @ApiProperty({ example: 'Personal Training Session' })
  name: string;

  @ApiProperty({ required: false, example: 'One-on-one coaching session focused on your goals' })
  description?: string;

  @ApiProperty({ example: 99.99, description: 'Base price in decimal format' })
  basePrice: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 'coach-id-123' })
  coachId: string;

  @ApiProperty({ required: false, description: 'Coach summary information' })
  coach?: {
    id: string;
    name: string;
    email: string;
  };
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
  basePrice: number;

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
export const BookingTypeApiResponses = createTypedApiDecorators(BookingTypeResponseDto);
