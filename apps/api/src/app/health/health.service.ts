import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';

import { PrismaService } from '../prisma/prisma.service';

import healthConfig from './config/health.config';
import { CheckHealthDto, LivenessHealthDto, ReadinessHealthDto } from './dto/health.dto';
@Injectable()
export class HealthService {
  constructor(
    private prisma: PrismaService,
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
    };

    try {
      // Test database connection
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'connected';
    } catch {
      checks.database = 'disconnected';
      checks.status = 'error';
    }

    return checks;
  }

  liveness(): LivenessHealthDto {
    return { status: 'alive', timestamp: new Date().toISOString() };
  }

  async readiness(): Promise<ReadinessHealthDto> {
    try {
      // Check if database is ready
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready', timestamp: new Date().toISOString() };
    } catch {
      return { status: 'not ready', timestamp: new Date().toISOString() };
    }
  }
}
