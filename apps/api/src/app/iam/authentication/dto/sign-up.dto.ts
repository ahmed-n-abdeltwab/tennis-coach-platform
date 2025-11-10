import { BaseResponseDto } from '@common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

import { BaseAuthDto } from './base.dto';

// ===========================================
// Base Auth DTOs
// ===========================================

export class SignUpDto extends BaseAuthDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: Role, example: Role.USER })
  @IsString()
  @IsNotEmpty()
  role: Role;
}

// Legacy DTOs for backward compatibility with Users/Coaches services
// These will be removed when migrating to unified Accounts service

export class SignupUserDto extends BaseAuthDto {
  @ApiProperty({ example: 'John Doe' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ type: 'string' })
  @Transform(({ value }) => value ?? undefined)
  @IsString()
  @IsOptional()
  gender?: string | null;

  @ApiPropertyOptional({ type: 'number' })
  @Transform(({ value }) => value ?? undefined)
  @IsInt()
  @IsOptional()
  age?: number | null;

  @ApiPropertyOptional({ type: 'number' })
  @Transform(({ value }) => value ?? undefined)
  @IsNumber()
  @IsOptional()
  height?: number | null;

  @ApiPropertyOptional({ type: 'number' })
  @Transform(({ value }) => value ?? undefined)
  @IsNumber()
  @IsOptional()
  weight?: number | null;

  @ApiPropertyOptional({ type: 'boolean' })
  @Transform(({ value }) => value ?? undefined)
  @IsBoolean()
  @IsOptional()
  disability?: boolean | null;

  @ApiPropertyOptional({ type: 'string' })
  @Transform(({ value }) => value ?? undefined)
  @IsString()
  @IsOptional()
  disabilityCause?: string | null;

  @ApiPropertyOptional({ type: 'string' })
  @Transform(({ value }) => value ?? undefined)
  @IsString()
  @IsOptional()
  country?: string | null;

  @ApiPropertyOptional({ type: 'string' })
  @Transform(({ value }) => value ?? undefined)
  @IsString()
  @IsOptional()
  address?: string | null;

  @ApiPropertyOptional({ type: 'string' })
  @Transform(({ value }) => value ?? undefined)
  @IsString()
  @IsOptional()
  notes?: string | null;
}

export class SignupCoachDto extends BaseAuthDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ type: 'boolean' })
  @Transform(({ value }) => value ?? false)
  @IsBoolean()
  @IsOptional()
  isAdmin?: boolean | null;

  @ApiPropertyOptional({ type: 'string' })
  @Transform(({ value }) => value ?? undefined)
  @IsString()
  @IsOptional()
  bio?: string | null;

  @ApiPropertyOptional({ type: 'string' })
  @Transform(({ value }) => value ?? undefined)
  @IsString()
  @IsOptional()
  credentials?: string | null;

  @ApiPropertyOptional({ type: 'string' })
  @Transform(({ value }) => value ?? undefined)
  @IsString()
  @IsOptional()
  philosophy?: string | null;

  @ApiPropertyOptional({ type: 'string' })
  @Transform(({ value }) => value ?? undefined)
  @IsString()
  @IsOptional()
  profileImage?: string | null;
}

// ===========================================
// Unified Account DTO
// ===========================================

export class AccountProfileDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ enum: Role, example: Role.USER })
  @IsString()
  @IsOptional()
  role?: Role;

  // Shared fields (User + Coach)
  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => value ?? undefined)
  @IsString()
  @IsOptional()
  gender?: string | null;

  @ApiPropertyOptional()
  @Transform(({ value }) => value ?? undefined)
  @IsInt()
  @IsOptional()
  age?: number | null;

  @ApiPropertyOptional()
  @Transform(({ value }) => value ?? undefined)
  @IsNumber()
  @IsOptional()
  height?: number | null;

  @ApiPropertyOptional()
  @Transform(({ value }) => value ?? undefined)
  @IsNumber()
  @IsOptional()
  weight?: number | null;

  @ApiPropertyOptional()
  @Transform(({ value }) => value ?? undefined)
  @IsBoolean()
  @IsOptional()
  disability?: boolean | null;

  @ApiPropertyOptional()
  @Transform(({ value }) => value ?? undefined)
  @IsString()
  @IsOptional()
  disabilityCause?: string | null;

  @ApiPropertyOptional()
  @Transform(({ value }) => value ?? undefined)
  @IsString()
  @IsOptional()
  country?: string | null;

  @ApiPropertyOptional()
  @Transform(({ value }) => value ?? undefined)
  @IsString()
  @IsOptional()
  address?: string | null;

  @ApiPropertyOptional()
  @Transform(({ value }) => value ?? undefined)
  @IsString()
  @IsOptional()
  notes?: string | null;

  // Coach-specific fields
  @ApiPropertyOptional()
  @Transform(({ value }) => value ?? undefined)
  @IsString()
  @IsOptional()
  bio?: string | null;

  @ApiPropertyOptional()
  @Transform(({ value }) => value ?? undefined)
  @IsString()
  @IsOptional()
  credentials?: string | null;

  @ApiPropertyOptional()
  @Transform(({ value }) => value ?? undefined)
  @IsString()
  @IsOptional()
  philosophy?: string | null;

  @ApiPropertyOptional()
  @Transform(({ value }) => value ?? undefined)
  @IsString()
  @IsOptional()
  profileImage?: string | null;
}

// ===========================================
// Auth Responses
// ===========================================

export class AccountSummaryDto {
  @ApiProperty({ example: 'cmgwh137q000...' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ enum: Role, example: Role.USER })
  @IsString()
  @IsNotEmpty()
  role: Role;
}

export class AuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @ApiProperty({ example: 'dGhpc2lzYXJlZnJlc2h0b2tlbg==' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;

  @ApiProperty({ type: AccountSummaryDto })
  account: AccountSummaryDto;
}

// ===========================================
// Profile Responses
// ===========================================

export class AccountProfileResponseDto extends BaseResponseDto {
  @ApiProperty({ type: AccountProfileDto })
  account: AccountProfileDto;
}
