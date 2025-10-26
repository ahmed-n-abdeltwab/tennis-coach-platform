import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateCoachDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

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
