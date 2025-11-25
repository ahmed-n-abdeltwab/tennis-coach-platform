import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Prisma, PrismaClient } from '@prisma/client';

import { AppLoggerService } from '../logger/app-logger.service';

import prismaConfig from './config/prisma.config';

@Injectable()
export class PrismaService
  extends PrismaClient<Prisma.PrismaClientOptions, 'query' | 'info' | 'warn' | 'error'>
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    @Inject(prismaConfig.KEY) private readonly prismaConfiguration: ConfigType<typeof prismaConfig>,
    private readonly logger: AppLoggerService
  ) {
    super({
      datasources: {
        db: { url: prismaConfiguration.database_url },
      },
      log: ['query', 'info', 'warn', 'error'],
      errorFormat: 'pretty',
    });

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
  }
}
