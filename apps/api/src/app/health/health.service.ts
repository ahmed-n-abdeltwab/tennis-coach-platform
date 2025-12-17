import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';

import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

import healthConfig from './config/health.config';
import { CheckHealthDto, LivenessHealthDto, ReadinessHealthDto } from './dto/health.dto';
@Injectable()
export class HealthService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    @Inject(healthConfig.KEY)
    private readonly healthConfiguration: ConfigType<typeof healthConfig>
  ) {}

  async check(): Promise<CheckHealthDto> {
    const checks = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: this.healthConfiguration.npmPackageVersion,
      environment: this.healthConfiguration.nodeEnv,
      database: this.healthConfiguration.database,
      redis: 'unknown' as string | undefined,
    };

    // Test database connection
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'connected';
    } catch {
      checks.database = 'disconnected';
      checks.status = 'error';
    }

    // Test Redis connection
    try {
      const result = await this.redis.getClient().ping();
      checks.redis = result === 'PONG' ? 'connected' : 'disconnected';
    } catch {
      checks.redis = 'disconnected';
      checks.status = 'error';
    }

    return checks;
  }

  liveness(): LivenessHealthDto {
    return { status: 'alive', timestamp: new Date().toISOString() };
  }

  async readiness(): Promise<ReadinessHealthDto> {
    const readiness: ReadinessHealthDto = {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };

    let isReady = true;

    // Check database readiness
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      readiness.database = 'ready';
    } catch {
      readiness.database = 'not ready';
      isReady = false;
    }

    // Check Redis readiness
    try {
      const result = await this.redis.getClient().ping();
      readiness.redis = result === 'PONG' ? 'ready' : 'not ready';
    } catch {
      readiness.redis = 'not ready';
      isReady = false;
    }

    readiness.status = isReady ? 'ready' : 'not ready';
    return readiness;
  }
}
