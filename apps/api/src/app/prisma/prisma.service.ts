import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

import { AppLoggerService } from '../logger/app-logger.service';
import { databaseMonitoringExtension } from '../monitoring/database/prisma-monitoring.extension';

import prismaConfig from './config/prisma.config';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  private isPoolEnded = false;
  private client: PrismaClient;

  constructor(
    @Inject(prismaConfig.KEY) private readonly prismaConfiguration: ConfigType<typeof prismaConfig>,
    private readonly logger: AppLoggerService
  ) {
    this.pool = new Pool({ connectionString: prismaConfiguration.database_url });
    this.initializeClient();
  }

  private initializeClient(): void {
    const adapter = new PrismaPg(this.pool);

    // Only enable query logging in non-test environments
    const isTestEnv = process.env.NODE_ENV === 'test';
    const logConfig: Prisma.LogLevel[] = isTestEnv
      ? ['warn', 'error']
      : ['query', 'info', 'warn', 'error'];

    const baseClient = new PrismaClient({
      adapter,
      log: logConfig,
      errorFormat: 'pretty',
    });

    // Apply database monitoring extension in non-test environments
    this.client = isTestEnv
      ? baseClient
      : (baseClient.$extends(databaseMonitoringExtension) as unknown as PrismaClient);

    // Only attach query listener in non-test environments
    if (!isTestEnv && 'query' in logConfig) {
      baseClient.$on(
        'query' as never,
        (queryEvent: { duration: number; query: string; params: string }) => {
          this.logger.log(
            `Query took ${queryEvent.duration}ms\nSQL: ${queryEvent.query}\nParams: ${queryEvent.params}`
          );
        }
      );
    }
  }

  async onModuleInit() {
    await this.client.$connect();

    if (process.env.NODE_ENV !== 'test') {
      this.logger.log('🔍 Database monitoring extension enabled');
    }
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
    if (!this.isPoolEnded) {
      this.isPoolEnded = true;
      await this.pool.end();
    }
  }

  // Proxy all PrismaClient methods to the client
  get account() {
    return this.client.account;
  }
  get session() {
    return this.client.session;
  }
  get message() {
    return this.client.message;
  }
  get conversation() {
    return this.client.conversation;
  }
  get bookingType() {
    return this.client.bookingType;
  }
  get timeSlot() {
    return this.client.timeSlot;
  }
  get discount() {
    return this.client.discount;
  }
  get payment() {
    return this.client.payment;
  }
  get notification() {
    return this.client.notification;
  }
  get customService() {
    return this.client.customService;
  }
  get refreshToken() {
    return this.client.refreshToken;
  }

  get $connect() {
    return this.client.$connect.bind(this.client);
  }
  get $disconnect() {
    return this.client.$disconnect.bind(this.client);
  }
  get $executeRaw() {
    return this.client.$executeRaw.bind(this.client);
  }
  get $executeRawUnsafe() {
    return this.client.$executeRawUnsafe.bind(this.client);
  }
  get $queryRaw() {
    return this.client.$queryRaw.bind(this.client);
  }
  get $queryRawUnsafe() {
    return this.client.$queryRawUnsafe.bind(this.client);
  }
  get $transaction() {
    return this.client.$transaction.bind(this.client);
  }
}
