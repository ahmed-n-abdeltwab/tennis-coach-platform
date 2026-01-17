import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsNumber, IsObject, IsString } from 'class-validator';

/**
 * Database metrics response DTO
 */
export class DatabaseMetricsDto {
  @ApiProperty({
    example: 1250,
    description: 'Total number of database queries executed',
  })
  @IsNumber()
  totalQueries!: number;

  @ApiProperty({
    example: 15,
    description: 'Number of slow queries detected (above threshold)',
  })
  @IsNumber()
  slowQueries!: number;

  @ApiProperty({
    example: 3,
    description: 'Number of failed database queries',
  })
  @IsNumber()
  errorQueries!: number;

  @ApiProperty({
    example: 45.67,
    description: 'Average query execution time in milliseconds',
  })
  @IsNumber()
  averageQueryTime!: number;

  @ApiProperty({
    example: {
      'findMany.account': [12, 15, 18],
      'create.session': [45, 52],
      'update.message': [8, 10, 12],
    },
    description: 'Query execution times grouped by operation type',
  })
  @IsObject()
  queryTimesByOperation!: Record<string, number[]>;

  @ApiProperty({
    example: {
      'findMany.account': [1200, 1500],
      'create.session': [1100],
    },
    description: 'Slow queries grouped by operation type (above threshold)',
  })
  @IsObject()
  slowQueriesByOperation!: Record<string, number[]>;
}

/**
 * System metrics for performance monitoring
 */
export class SystemMetricsDto {
  @ApiProperty({
    example: 3600.5,
    description: 'Application uptime in seconds',
  })
  @IsNumber()
  uptime!: number;

  @ApiProperty({
    example: {
      rss: 104857600,
      heapTotal: 83886080,
      heapUsed: 62914560,
      external: 10485760,
      arrayBuffers: 5242880,
    },
    description: 'Node.js memory usage statistics in bytes',
  })
  @IsObject()
  memoryUsage!: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  };

  @ApiProperty({
    example: 'v20.10.0',
    description: 'Node.js version',
  })
  @IsString()
  nodeVersion!: string;

  @ApiProperty({
    example: 'production',
    description: 'Current environment (development, production, test)',
  })
  @IsString()
  environment!: string;
}

/**
 * Database performance summary
 */
export class DatabasePerformanceSummaryDto {
  @ApiProperty({
    example: 1250,
    description: 'Total number of database queries executed',
  })
  @IsNumber()
  totalQueries!: number;

  @ApiProperty({
    example: 45.67,
    description: 'Average query execution time in milliseconds',
  })
  @IsNumber()
  averageQueryTime!: number;

  @ApiProperty({
    example: 1.2,
    description: 'Percentage of queries that are considered slow',
  })
  @IsNumber()
  slowQueryPercentage!: number;

  @ApiProperty({
    example: 0.24,
    description: 'Percentage of queries that resulted in errors',
  })
  @IsNumber()
  errorRate!: number;
}

/**
 * Complete performance summary response
 */
export class PerformanceSummaryDto {
  @ApiProperty({
    type: DatabasePerformanceSummaryDto,
    description: 'Database performance metrics summary',
  })
  @Type(() => DatabasePerformanceSummaryDto)
  database!: DatabasePerformanceSummaryDto;

  @ApiProperty({
    type: SystemMetricsDto,
    description: 'System performance metrics',
  })
  @Type(() => SystemMetricsDto)
  system!: SystemMetricsDto;

  @ApiProperty({
    type: Date,
    format: 'date-time',
    example: '2024-01-15T10:30:00.000Z',
    description: 'Timestamp when the summary was generated',
  })
  @IsDate()
  @Type(() => Date)
  timestamp!: Date;
}

/**
 * Monitoring system health status
 */
export class MonitoringHealthDto {
  @ApiProperty({
    example: true,
    description: 'APM (Application Performance Monitoring) system status',
  })
  @IsBoolean()
  apm!: boolean;

  @ApiProperty({
    example: true,
    description: 'Database monitoring system status',
  })
  @IsBoolean()
  database!: boolean;

  @ApiProperty({
    example: true,
    description: 'Metrics collection system status',
  })
  @IsBoolean()
  metrics!: boolean;

  @ApiProperty({
    type: Date,
    format: 'date-time',
    example: '2024-01-15T10:30:00.000Z',
    description: 'Timestamp of the health check',
  })
  @IsDate()
  @Type(() => Date)
  timestamp!: Date;
}
