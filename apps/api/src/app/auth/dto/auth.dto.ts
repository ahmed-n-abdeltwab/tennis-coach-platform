import { Role } from '@auth-helpers';
import { BaseResponseDto } from '@common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class BaseAuthDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

export class LoginDto extends BaseAuthDto {}

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

export class UserSummaryDto {
  @ApiProperty({ example: 'cmgwh137q000...' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsNotEmpty()
  @IsEmail()
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

  @ApiProperty({ type: UserSummaryDto })
  user: {
    id: string;
    email: string;
    role: Role;
  };
}

export class UserProfileResponseDto extends BaseResponseDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'John Doe' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => value ?? undefined)
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  gender?: string | null;

  @ApiPropertyOptional({ minimum: 5, maximum: 120 })
  @Transform(({ value }) => value ?? undefined)
  @IsInt()
  @IsOptional()
  age?: number | null;

  @ApiPropertyOptional({ minimum: 50, maximum: 300 })
  @Transform(({ value }) => value ?? undefined)
  @IsNumber()
  @IsOptional()
  height?: number | null;

  @ApiPropertyOptional({ minimum: 20, maximum: 500 })
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
  @IsNotEmpty()
  @IsOptional()
  country?: string | null;

  @ApiPropertyOptional()
  @Transform(({ value }) => value ?? undefined)
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  address?: string | null;

  @ApiPropertyOptional()
  @Transform(({ value }) => value ?? undefined)
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  notes?: string | null;
}

export class CoachProfileResponseDto extends BaseResponseDto {
  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  isAdmin: boolean;

  @ApiPropertyOptional()
  @Transform(({ value }) => value ?? undefined)
  bio?: string | null;

  @ApiPropertyOptional()
  @Transform(({ value }) => value ?? undefined)
  credentials?: string | null;

  @ApiPropertyOptional()
  @Transform(({ value }) => value ?? undefined)
  philosophy?: string | null;

  @ApiPropertyOptional()
  @Transform(({ value }) => value ?? undefined)
  profileImage?: string | null;
}
