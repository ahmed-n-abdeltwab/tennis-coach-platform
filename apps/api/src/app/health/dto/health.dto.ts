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

export class MemoryUsageDto {
  @ApiProperty({ description: 'Resident Set Size - total memory allocated for the process' })
  @IsNumber()
  rss: number;

  @ApiProperty({ description: 'Total size of the allocated heap' })
  @IsNumber()
  heapTotal: number;

  @ApiProperty({ description: 'Actual memory used during execution' })
  @IsNumber()
  heapUsed: number;

  @ApiProperty({ description: 'Memory used by C++ objects bound to JavaScript' })
  @IsNumber()
  external: number;

  @ApiProperty({ description: 'Memory allocated for ArrayBuffers and SharedArrayBuffers' })
  @IsNumber()
  arrayBuffers: number;
}

export class CheckHealthDto extends BaseHealthDto {
  @ApiProperty({ description: 'Process uptime in seconds' })
  @IsNumber()
  uptime: number;

  @ApiProperty({ type: MemoryUsageDto, description: 'Memory usage statistics' })
  memory: MemoryUsageDto;

  @ApiProperty({ description: 'API version' })
  @IsString()
  version: string;

  @ApiProperty({ description: 'Current environment (development, production, etc.)' })
  @IsString()
  environment: string;

  @ApiProperty({ description: 'Database connection status' })
  @IsString()
  database: string;
}

export class LivenessHealthDto extends BaseHealthDto {}

export class ReadinessHealthDto extends BaseHealthDto {}

export const CheckHealthApiResponses = createTypedApiDecorators(CheckHealthDto);

export const LivenessHealthApiResponses = createTypedApiDecorators(LivenessHealthDto);

export const ReadinessHealthApiResponses = createTypedApiDecorators(ReadinessHealthDto);
