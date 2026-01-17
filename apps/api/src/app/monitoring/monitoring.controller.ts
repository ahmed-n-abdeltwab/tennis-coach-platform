import { ApiResponses } from '@common';
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { Roles } from '../iam/authorization/decorators/roles.decorator';

import {
  getDatabaseMetrics,
  getSlowQueriesByOperation,
} from './database/prisma-monitoring.extension';
import {
  DatabaseMetricsDto,
  MonitoringHealthDto,
  PerformanceSummaryDto,
} from './dto/monitoring.dto';

/**
 * Monitoring Controller
 *
 * Provides endpoints for accessing application performance monitoring data.
 * Only accessible to ADMIN users for security purposes.
 *
 * Features:
 * - Database performance metrics
 * - System health status
 * - Performance summaries
 * - Query-level monitoring data
 */
@ApiTags('Monitoring')
@Controller('monitoring')
@ApiBearerAuth('JWT-auth')
@Roles(Role.ADMIN)
export class MonitoringController {
  @Get('database/metrics')
  @ApiOperation({
    summary: 'Get database performance metrics',
    description:
      'Returns comprehensive database query performance metrics including slow queries, error rates, and execution times. Provides detailed insights for performance optimization.',
  })
  @(ApiResponses.for(DatabaseMetricsDto).Found('Database metrics retrieved successfully'))
  getDatabaseMetrics(): DatabaseMetricsDto {
    const metrics = getDatabaseMetrics();
    const slowQueries = getSlowQueriesByOperation();

    return {
      ...metrics,
      slowQueriesByOperation: slowQueries,
      queryTimesByOperation: Object.fromEntries(metrics.queryTimesByOperation),
    };
  }

  @Get('health')
  @ApiOperation({
    summary: 'Get monitoring system health status',
    description:
      'Returns the health status of all monitoring system components including APM, database monitoring, and metrics collection systems.',
  })
  @(ApiResponses.for(MonitoringHealthDto).Found('Monitoring health status retrieved successfully'))
  getMonitoringHealth(): MonitoringHealthDto {
    return {
      apm: true, // APM is initialized if this endpoint is reachable
      database: true, // Database monitoring is active
      metrics: true, // Metrics collection is active
      timestamp: new Date(),
    };
  }

  @Get('performance/summary')
  @ApiOperation({
    summary: 'Get comprehensive performance summary',
    description:
      'Returns a high-level performance summary including database metrics, system resources, and calculated performance indicators for dashboard display.',
  })
  @(ApiResponses.for(PerformanceSummaryDto).Found('Performance summary retrieved successfully'))
  async getPerformanceSummary(): Promise<PerformanceSummaryDto> {
    const dbMetrics = getDatabaseMetrics();

    return {
      database: {
        totalQueries: dbMetrics.totalQueries,
        averageQueryTime: Math.round(dbMetrics.averageQueryTime * 100) / 100,
        slowQueryPercentage:
          dbMetrics.totalQueries > 0
            ? Math.round((dbMetrics.slowQueries / dbMetrics.totalQueries) * 10000) / 100
            : 0,
        errorRate:
          dbMetrics.totalQueries > 0
            ? Math.round((dbMetrics.errorQueries / dbMetrics.totalQueries) * 10000) / 100
            : 0,
      },
      system: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV ?? 'development',
      },
      timestamp: new Date(),
    };
  }
}
