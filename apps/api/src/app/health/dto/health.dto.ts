import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

import { createTypedApiDecorators } from '../../../common';

export class BaseHealthDto {
  @ApiProperty({ enum: ['ok', 'error'] })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  timestamp: string;
}
export class CheckHealthDto extends BaseHealthDto {
  @ApiProperty()
  @IsNumber()
  uptime: number;

  @ApiProperty()
  memory: NodeJS.MemoryUsage;

  @ApiProperty()
  @IsString()
  version: string;

  @ApiProperty()
  @IsString()
  environment: string;

  @ApiProperty()
  @IsString()
  database: string;

  @ApiProperty({ required: false })
  @IsString()
  redis?: string;
}

export class LivenessHealthDto extends BaseHealthDto {}

export class ReadinessHealthDto extends BaseHealthDto {
  @ApiProperty({ required: false })
  @IsString()
  database?: string;

  @ApiProperty({ required: false })
  @IsString()
  redis?: string;
}

export const CheckHealthApiResponses = createTypedApiDecorators(CheckHealthDto);

export const LivenessHealthApiResponses = createTypedApiDecorators(LivenessHealthDto);

export const ReadinessHealthApiResponses = createTypedApiDecorators(ReadinessHealthDto);
