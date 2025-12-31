import { createTypedApiDecorators } from '@common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { Exclude, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

/**
 * Simplified booking type summary for coach listings
 * Contains only the fields needed for display, not full CRUD operations
 */
export class CoachBookingTypeSummaryDto {
  @ApiProperty({ example: 'booking-type-id-123' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'Personal Training Session' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'One-on-one coaching session', required: false })
  @IsOptional()
  @IsString()
  description: string;

  @ApiProperty({ example: 99.99, description: 'Base price in decimal format' })
  @Type(() => Number)
  basePrice: Decimal;
}

export class AccountResponseDto {
  @ApiProperty({ example: 'discount-id-123' })
  @IsString()
  id: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsDate()
  @Type(() => Date)
  updatedAt: Date;

  @ApiProperty({ example: 'account@example.com' })
  email: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @Exclude()
  passwordHash: string;

  @ApiProperty({ enum: Role, example: Role.USER })
  role: Role;

  @ApiPropertyOptional({ enum: ['male', 'female', 'other'], example: 'male' })
  gender?: string;

  @ApiPropertyOptional({ minimum: 5, maximum: 120 })
  age?: number;

  @ApiPropertyOptional({ minimum: 50, maximum: 300 })
  height?: number;

  @ApiPropertyOptional({ minimum: 20, maximum: 500 })
  weight?: number;

  @ApiPropertyOptional()
  bio?: string;

  @ApiPropertyOptional()
  credentials?: string;

  @ApiPropertyOptional()
  philosophy?: string;

  @ApiPropertyOptional()
  profileImage?: string;

  @ApiPropertyOptional()
  disability?: boolean;

  @ApiPropertyOptional()
  disabilityCause?: string;

  @ApiPropertyOptional()
  country?: string;

  @ApiPropertyOptional()
  address?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  isOnline!: boolean;
}

export class CreateAccountDto {
  @ApiProperty({ example: 'account@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({ enum: Role, default: Role.USER })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  // User-specific fields
  @ApiPropertyOptional({ enum: ['male', 'female', 'other'] })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ minimum: 5, maximum: 120 })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(120)
  age?: number;

  @ApiPropertyOptional({ minimum: 50, maximum: 300 })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(300)
  height?: number;

  @ApiPropertyOptional({ minimum: 20, maximum: 500 })
  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(500)
  weight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  disability?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  disabilityCause?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  // Coach-specific fields
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  credentials?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  philosophy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  profileImage?: string;
}

export class UpdateAccountDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: ['male', 'female', 'other'] })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ minimum: 5, maximum: 120 })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(120)
  age?: number;

  @ApiPropertyOptional({ minimum: 50, maximum: 300 })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(300)
  height?: number;

  @ApiPropertyOptional({ minimum: 20, maximum: 500 })
  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(500)
  weight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  disability?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  disabilityCause?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  credentials?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  philosophy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  profileImage?: string;
}

export class CoachResponseDto extends AccountResponseDto {
  @ApiPropertyOptional({ type: [CoachBookingTypeSummaryDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CoachBookingTypeSummaryDto)
  bookingTypes?: CoachBookingTypeSummaryDto[];
}

// Create typed API decorators for accounts
export const AccountApiResponses = createTypedApiDecorators(AccountResponseDto);

export const CoachApiResponses = createTypedApiDecorators(CoachResponseDto);
