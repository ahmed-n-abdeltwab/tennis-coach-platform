import { PrismaService } from '@app/prisma/prisma.service';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import healthConfig from './config/health.config';
@Injectable()
export class HealthService {
  constructor(
    private prisma: PrismaService,
    @Inject(healthConfig.KEY)
    private readonly healthConfiguration: ConfigType<typeof healthConfig>
  ) {}

  async check() {
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
    } catch (error) {
      checks.database = 'disconnected';
      checks.status = 'error';
    }

    return checks;
  }

  liveness() {
    return { status: 'alive', timestamp: new Date().toISOString() };
  }

  async readiness() {
    try {
      // Check if database is ready
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready', timestamp: new Date().toISOString() };
    } catch (error) {
      return { status: 'not ready', timestamp: new Date().toISOString() };
    }
  }
}
