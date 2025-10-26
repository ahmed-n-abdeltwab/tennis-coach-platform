import { BaseResponseDto, createTypedApiDecorators } from '@common';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(120)
  age?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(300)
  height?: number;

  @ApiProperty({ required: false })
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
  country?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UserResponseDto extends BaseResponseDto {
  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ enum: ['user', 'coach'], example: 'user' })
  type: string;

  @ApiProperty({ required: false, enum: ['male', 'female', 'other'] })
  gender?: string;

  @ApiProperty({ required: false, minimum: 5, maximum: 120 })
  age?: number;

  @ApiProperty({ required: false, minimum: 50, maximum: 300 })
  height?: number;

  @ApiProperty({ required: false, minimum: 20, maximum: 500 })
  weight?: number;

  @ApiProperty({ required: false })
  disability?: boolean;

  @ApiProperty({ required: false })
  country?: string;

  @ApiProperty({ required: false })
  address?: string;

  @ApiProperty({ required: false })
  notes?: string;
}

// Create typed API decorators for users
export const UserApiResponses = createTypedApiDecorators(UserResponseDto);
