import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

import { AppLoggerService } from '../logger/app-logger.service';

import prismaConfig from './config/prisma.config';

@Injectable()
export class PrismaService
  extends PrismaClient<Prisma.PrismaClientOptions, 'query' | 'info' | 'warn' | 'error'>
  implements OnModuleInit, OnModuleDestroy
{
  private pool: Pool;
  private isPoolEnded = false;

  constructor(
    @Inject(prismaConfig.KEY) private readonly prismaConfiguration: ConfigType<typeof prismaConfig>,
    private readonly logger: AppLoggerService
  ) {
    const pool = new Pool({ connectionString: prismaConfiguration.database_url });
    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log: ['query', 'info', 'warn', 'error'],
      errorFormat: 'pretty',
    });

    this.pool = pool;

    this.$on('query', queryEvent => {
      this.logger.log(
        `Query took ${queryEvent.duration}ms\nSQL: ${queryEvent.query}\nParams: ${queryEvent.params}`
      );
    });
  }
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    if (!this.isPoolEnded) {
      this.isPoolEnded = true;
      await this.pool.end();
    }
  }
}
