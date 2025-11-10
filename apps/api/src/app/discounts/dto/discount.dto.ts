import { BaseResponseDto, createTypedApiDecorators } from '@common';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class DiscountResponseDto extends BaseResponseDto {
  @ApiProperty({ example: 'SUMMER2024' })
  code: string;

  @ApiProperty({ example: 10.0, description: 'Discount amount in decimal format' })
  amount: string;

  @ApiProperty({ example: '2024-12-31T23:59:59Z', description: 'Expiry date and time' })
  expiry: string;

  @ApiProperty({ example: 0, description: 'Number of times this discount has been used' })
  useCount: number;

  @ApiProperty({ example: 1, description: 'Maximum number of times this discount can be used' })
  maxUsage: number;

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

export class CreateDiscountDto {
  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty()
  @IsDateString()
  expiry: string;

  @ApiProperty({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUsage?: number;

  @ApiProperty({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateDiscountDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  expiry?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUsage?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ValidateDiscountDto {
  @ApiProperty()
  @IsString()
  code: string;
}

// Create typed API decorators for discounts
export const DiscountApiResponses = createTypedApiDecorators(DiscountResponseDto);
