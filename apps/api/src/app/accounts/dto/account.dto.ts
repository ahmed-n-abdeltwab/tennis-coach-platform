import { BaseResponseDto, createTypedApiDecorators } from '@common';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { Exclude, Transform, Type } from 'class-transformer';
import {
  IsBoolean,
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
  description: string | null;

  @ApiProperty({ example: 99.99, description: 'Base price in decimal format' })
  @Type(() => Number)
  basePrice: Decimal;
}

export class AccountResponseDto extends BaseResponseDto {
  @ApiProperty({ example: 'account@example.com' })
  email: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @Exclude()
  passwordHash: string;

  @ApiProperty({ enum: Role, example: Role.USER })
  role: Role;

  @ApiProperty({ required: false, enum: ['male', 'female', 'other'], example: 'male' })
  @Transform(({ value }) => value ?? undefined)
  gender?: string | null;

  @ApiProperty({ required: false, minimum: 5, maximum: 120 })
  @Transform(({ value }) => value ?? undefined)
  age?: number | null;

  @ApiProperty({ required: false, minimum: 50, maximum: 300 })
  @Transform(({ value }) => value ?? undefined)
  height?: number | null;

  @ApiProperty({ required: false, minimum: 20, maximum: 500 })
  @Transform(({ value }) => value ?? undefined)
  weight?: number | null;

  @ApiProperty({ required: false })
  @Transform(({ value }) => value ?? undefined)
  bio?: string | null;

  @ApiProperty({ required: false })
  @Transform(({ value }) => value ?? undefined)
  credentials?: string | null;

  @ApiProperty({ required: false })
  @Transform(({ value }) => value ?? undefined)
  philosophy?: string | null;

  @ApiProperty({ required: false })
  @Transform(({ value }) => value ?? undefined)
  profileImage?: string | null;

  @ApiProperty({ required: false })
  @Transform(({ value }) => value ?? undefined)
  disability?: boolean | null;

  @ApiProperty({ required: false })
  @Transform(({ value }) => value ?? undefined)
  disabilityCause?: string | null;

  @ApiProperty({ required: false })
  @Transform(({ value }) => value ?? undefined)
  country?: string | null;

  @ApiProperty({ required: false })
  @Transform(({ value }) => value ?? undefined)
  address?: string | null;

  @ApiProperty({ required: false })
  @Transform(({ value }) => value ?? undefined)
  notes?: string | null;

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
  @ApiProperty({ required: false, enum: ['male', 'female', 'other'] })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({ required: false, minimum: 5, maximum: 120 })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(120)
  age?: number;

  @ApiProperty({ required: false, minimum: 50, maximum: 300 })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(300)
  height?: number;

  @ApiProperty({ required: false, minimum: 20, maximum: 500 })
  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(500)
  weight?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  disability?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  disabilityCause?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  // Coach-specific fields
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  credentials?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  philosophy?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  profileImage?: string;
}

export class UpdateAccountDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false, enum: ['male', 'female', 'other'] })
  @Transform(({ value }) => value ?? undefined)
  @IsOptional()
  @IsString()
  gender?: string | null;

  @ApiProperty({ required: false, minimum: 5, maximum: 120 })
  @Transform(({ value }) => value ?? undefined)
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(120)
  age?: number | null;

  @ApiProperty({ required: false, minimum: 50, maximum: 300 })
  @Transform(({ value }) => value ?? undefined)
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(300)
  height?: number | null;

  @ApiProperty({ required: false, minimum: 20, maximum: 500 })
  @Transform(({ value }) => value ?? undefined)
  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(500)
  weight?: number | null;

  @ApiProperty({ required: false })
  @Transform(({ value }) => value ?? undefined)
  @IsOptional()
  @IsBoolean()
  disability?: boolean;

  @ApiProperty({ required: false })
  @Transform(({ value }) => value ?? undefined)
  @IsOptional()
  @IsString()
  disabilityCause?: string | null;

  @ApiProperty({ required: false })
  @Transform(({ value }) => value ?? undefined)
  @IsOptional()
  @IsString()
  country?: string | null;

  @ApiProperty({ required: false })
  @Transform(({ value }) => value ?? undefined)
  @IsOptional()
  @IsString()
  address?: string | null;

  @ApiProperty({ required: false })
  @Transform(({ value }) => value ?? undefined)
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  credentials?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  philosophy?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  profileImage?: string;
}

export class CoachResponseDto extends AccountResponseDto {
  @ApiProperty({ type: [CoachBookingTypeSummaryDto], required: false })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CoachBookingTypeSummaryDto)
  bookingTypes?: CoachBookingTypeSummaryDto[];
}

// Create typed API decorators for accounts
export const AccountApiResponses = createTypedApiDecorators(AccountResponseDto);

export const CoachApiResponses = createTypedApiDecorators(CoachResponseDto);
