import { BaseResponseDto, createTypedApiDecorators } from '@common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
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

  @ApiPropertyOptional({ enum: Role, example: Role.USER })
  @IsEnum(Role)
  role?: Role;
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
  @IsOptional()
  role?: Role;

  // Shared fields (User + Coach)
  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  gender?: string | null;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  age?: number | null;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  height?: number | null;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  weight?: number | null;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  disability?: boolean | null;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  disabilityCause?: string | null;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  country?: string | null;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  address?: string | null;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string | null;

  // Coach-specific fields
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  bio?: string | null;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  credentials?: string | null;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  philosophy?: string | null;

  @ApiPropertyOptional()
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
  role: Role;
}

export class RefreshResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @ApiProperty({ example: 'dGhpc2lzYXJlZnJlc2h0b2tlbg==' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;

  @ApiProperty({ type: AccountSummaryDto })
  @Type(() => AccountSummaryDto)
  account: AccountSummaryDto;
}

export class AuthResponseDto extends RefreshResponseDto {}

// ===========================================
// Profile Responses
// ===========================================

export class AccountProfileResponseDto extends BaseResponseDto {
  @ApiProperty({ type: AccountProfileDto })
  @Type(() => AccountProfileDto)
  account: AccountProfileDto;
}

export const AuthApiResponses = createTypedApiDecorators(AuthResponseDto);

export const RefreshApiResponses = createTypedApiDecorators(RefreshResponseDto);
