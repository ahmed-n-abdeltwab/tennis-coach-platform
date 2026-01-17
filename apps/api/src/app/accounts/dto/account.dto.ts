import { IsCuid } from '@common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { Exclude, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEmail,
  IsEnum,
  IsInt,
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
  @IsCuid()
  id: string;

  @ApiProperty({ example: 'Personal Training Session' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'One-on-one coaching session', required: false })
  @IsString()
  description: string;

  @ApiProperty({ example: 99.99, description: 'Base price in decimal format' })
  @Type(() => Number)
  basePrice: Decimal;
}

export class AccountResponseDto {
  @ApiProperty({ example: 'discount-id-123' })
  @IsString()
  @IsCuid()
  id!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsDate()
  @Type(() => Date)
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsDate()
  @Type(() => Date)
  updatedAt!: Date;

  @ApiProperty({ example: 'account@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name!: string;

  @Exclude()
  @IsString()
  passwordHash: string;

  @ApiProperty({ enum: Role, example: Role.USER })
  @IsEnum(Role)
  role: Role;

  @ApiPropertyOptional({ enum: ['male', 'female', 'other'], example: 'male' })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional({ minimum: 5, maximum: 120 })
  @IsInt()
  @Min(5)
  @Max(120)
  @IsOptional()
  age?: number;

  @ApiPropertyOptional({ minimum: 50, maximum: 300 })
  @IsNumber()
  @Min(50)
  @Max(300)
  @IsOptional()
  height?: number;

  @ApiPropertyOptional({ minimum: 20, maximum: 500 })
  @IsNumber()
  @Min(20)
  @Max(500)
  weight?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  credentials?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  philosophy?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  profileImage?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  disability?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  disabilityCause?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty()
  @IsBoolean()
  isActive!: boolean;

  @ApiProperty()
  @IsBoolean()
  isOnline!: boolean;
}

export class CreateAccountDto {
  @ApiProperty({ example: 'account@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ enum: Role, default: Role.USER })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  // User-specific fields
  @ApiPropertyOptional({ enum: ['male', 'female', 'other'] })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional({ minimum: 5, maximum: 120 })
  @IsNumber()
  @Min(5)
  @Max(120)
  @IsOptional()
  age?: number;

  @ApiPropertyOptional({ minimum: 50, maximum: 300 })
  @IsNumber()
  @Min(50)
  @Max(300)
  @IsOptional()
  height?: number;

  @ApiPropertyOptional({ minimum: 20, maximum: 500 })
  @IsNumber()
  @Min(20)
  @Max(500)
  @IsOptional()
  weight?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  disability?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  disabilityCause?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  // Coach-specific fields
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  credentials?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  philosophy?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  profileImage?: string;
}

export class UpdateRoleDto {
  @ApiProperty({ enum: Role, example: Role.USER, description: 'New role for the account' })
  @IsEnum(Role)
  role!: Role;
}

export class UpdateAccountDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: ['male', 'female', 'other'] })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional({ minimum: 5, maximum: 120 })
  @IsNumber()
  @Min(5)
  @Max(120)
  @IsOptional()
  age?: number;

  @ApiPropertyOptional({ minimum: 50, maximum: 300 })
  @IsNumber()
  @Min(50)
  @Max(300)
  @IsOptional()
  height?: number;

  @ApiPropertyOptional({ minimum: 20, maximum: 500 })
  @IsNumber()
  @Min(20)
  @Max(500)
  @IsOptional()
  weight?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  disability?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  disabilityCause?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  credentials?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  philosophy?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  profileImage?: string;
}

export class CoachResponseDto extends AccountResponseDto {
  @ApiPropertyOptional({ type: [CoachBookingTypeSummaryDto] })
  @ValidateNested({ each: true })
  @Type(() => CoachBookingTypeSummaryDto)
  @IsOptional()
  bookingTypes?: CoachBookingTypeSummaryDto[];
}

// Profile management DTOs

export class ProfileCompletenessDto {
  @ApiProperty()
  @IsBoolean()
  isComplete: boolean;

  @ApiProperty()
  @IsNumber()
  completionPercentage: number;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  missingFields: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  requiredFields: string[];

  @ApiPropertyOptional({ type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  roleSpecificFields?: string[];
}

export class BulkProfileUpdateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

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
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

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
  @IsBoolean()
  disability?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  disabilityCause?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ProfileImageUploadDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: unknown;
}

/**
 * DTO for uploading profile image via URL
 */
export class UploadProfileImageUrlDto {
  @ApiProperty({
    description: 'URL of the profile image',
    example: 'https://example.com/image.jpg',
  })
  @IsString()
  imageUrl: string;
}

export class ProfileValidationDto {
  @ApiProperty()
  @IsBoolean()
  isValid: boolean;

  @ApiProperty({ type: [String] })
  @IsString({ each: true })
  errors: string[];

  @ApiProperty({ type: [String] })
  @IsString({ each: true })
  warnings: string[];

  @ApiProperty({ enum: Role, example: Role.USER })
  @IsEnum(Role)
  role: Role;
}

export class RoleSpecificFieldsDto {
  @ApiProperty({ type: [String], description: 'Fields required for the role' })
  @IsArray()
  @IsString({ each: true })
  requiredFields: string[];

  @ApiProperty({ type: [String], description: 'Optional fields for the role' })
  @IsArray()
  @IsString({ each: true })
  optionalFields: string[];

  @ApiProperty({ type: [String], description: 'Role-specific fields (e.g., coach-only fields)' })
  @IsArray()
  @IsString({ each: true })
  roleSpecificFields: string[];
}
