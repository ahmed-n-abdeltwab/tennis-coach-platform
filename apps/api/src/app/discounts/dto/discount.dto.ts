import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsDateString, IsOptional, Min } from 'class-validator';

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
