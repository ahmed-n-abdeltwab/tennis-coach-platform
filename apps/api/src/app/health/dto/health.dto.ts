import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class BaseHealthDto {
  @ApiProperty({
    enum: ['ok', 'error'],
    example: 'ok',
    description: 'Health check status',
  })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiProperty({
    example: '2024-11-10T10:00:00.000Z',
    description: 'Timestamp of the health check',
  })
  @IsString()
  @IsNotEmpty()
  timestamp: string;
}

export class MemoryUsageDto {
  @ApiProperty({
    example: 52428800,
    description: 'Resident Set Size - total memory allocated for the process (bytes)',
  })
  @IsNumber()
  rss: number;

  @ApiProperty({
    example: 20971520,
    description: 'Total size of the allocated heap (bytes)',
  })
  @IsNumber()
  heapTotal: number;

  @ApiProperty({
    example: 15728640,
    description: 'Actual memory used during execution (bytes)',
  })
  @IsNumber()
  heapUsed: number;

  @ApiProperty({
    example: 1048576,
    description: 'Memory used by C++ objects bound to JavaScript (bytes)',
  })
  @IsNumber()
  external: number;

  @ApiProperty({
    example: 524288,
    description: 'Memory allocated for ArrayBuffers and SharedArrayBuffers (bytes)',
  })
  @IsNumber()
  arrayBuffers: number;
}

export class CheckHealthDto extends BaseHealthDto {
  @ApiProperty({
    example: 3600.5,
    description: 'Process uptime in seconds',
  })
  @IsNumber()
  uptime: number;

  @ApiProperty({
    type: MemoryUsageDto,
    description: 'Memory usage statistics',
  })
  memory: MemoryUsageDto;

  @ApiProperty({
    example: '1.0.0',
    description: 'API version',
  })
  @IsString()
  version: string;

  @ApiProperty({
    example: 'development',
    description: 'Current environment (development, production, etc.)',
  })
  @IsString()
  environment: string;

  @ApiProperty({
    example: 'connected',
    description: 'Database connection status',
  })
  @IsString()
  database: string;
}

export class LivenessHealthDto extends BaseHealthDto {}

export class ReadinessHealthDto extends BaseHealthDto {}
