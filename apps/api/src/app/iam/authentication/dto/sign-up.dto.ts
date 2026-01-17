import { IsCuid } from '@common';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { BaseAuthDto } from './base.dto';

/**
 * Sign up request DTO.
 * Extends BaseAuthDto with additional name field.
 * All new registrations are assigned USER role by default.
 * The role field is accepted but ignored for security reasons.
 */
export class SignUpDto extends BaseAuthDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'User full name',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    enum: Role,
    example: Role.USER,
    description: 'Account role (ignored - all signups default to USER)',
    required: false,
  })
  @IsOptional()
  @IsEnum(Role)
  role?: Role; // Optional field that gets ignored in service
}

/**
 * Account summary DTO for authentication responses.
 * Contains minimal account information returned after auth operations.
 */
export class AccountSummaryDto {
  @ApiProperty({
    example: 'cmgwh137q000...',
    description: 'Unique account identifier',
  })
  @IsString()
  @IsNotEmpty()
  @IsCuid()
  id: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'Account email address',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    enum: Role,
    example: Role.USER,
    description: 'Account role',
  })
  @IsEnum(Role)
  role: Role;
}

/**
 * Refresh token response DTO.
 * Returns new access and refresh tokens along with account summary.
 */
export class RefreshResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token',
  })
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @ApiProperty({
    example: 'dGhpc2lzYXJlZnJlc2h0b2tlbg==',
    description: 'JWT refresh token',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;

  @ApiProperty({
    type: AccountSummaryDto,
    description: 'Account summary information',
  })
  @Type(() => AccountSummaryDto)
  account: AccountSummaryDto;
}

/**
 * Authentication response DTO.
 * Used for signup and login responses.
 */
export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token',
  })
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @ApiProperty({
    example: 'dGhpc2lzYXJlZnJlc2h0b2tlbg==',
    description: 'JWT refresh token',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;

  @ApiProperty({
    type: AccountSummaryDto,
    description: 'Account summary information',
  })
  @Type(() => AccountSummaryDto)
  account: AccountSummaryDto;
}
