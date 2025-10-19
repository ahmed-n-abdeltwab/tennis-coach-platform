import { createTypedApiDecorators } from '@decorators/typed-api-responses.decorator';
import { BaseResponseDto } from '@dto/base-response.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class BaseAuthDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;
}

export class LoginDto extends BaseAuthDto {}

export class validateUserDto extends BaseAuthDto {}

export class RegisterDto extends BaseAuthDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name: string;
}

export class UserSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: ['user', 'coach'] })
  type: string;
}

export class AuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  access_token: string;

  @ApiProperty({ type: UserSummaryDto })
  user: UserSummaryDto;
}

export class UserProfileResponseDto extends BaseResponseDto {
  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
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
  disability?: boolean | null;

  @ApiProperty({ required: false })
  @Transform(({ value }) => value ?? undefined)
  country?: string | null;

  @ApiProperty({ required: false })
  @Transform(({ value }) => value ?? undefined)
  address?: string | null;

  @ApiProperty({ required: false })
  @Transform(({ value }) => value ?? undefined)
  notes?: string | null;
}

export class CoachProfileResponseDto extends BaseResponseDto {
  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  isAdmin: boolean;

  @ApiProperty()
  @Transform(({ value }) => value ?? undefined)
  bio?: string | null;

  @ApiProperty()
  @Transform(({ value }) => value ?? undefined)
  credentials?: string | null;

  @ApiProperty()
  @Transform(({ value }) => value ?? undefined)
  philosophy?: string | null;

  @ApiProperty()
  @Transform(({ value }) => value ?? undefined)
  profileImage?: string | null;
}

// Create typed API decorators for auth responses - NO NEED TO PASS TYPES!
export const AuthApiResponses = createTypedApiDecorators(AuthResponseDto);
export const UserProfileApiResponses = createTypedApiDecorators(UserProfileResponseDto);
export const CoachProfileApiResponses = createTypedApiDecorators(CoachProfileResponseDto);
