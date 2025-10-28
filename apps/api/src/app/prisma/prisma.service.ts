import { logger } from '@config/logging.config';
import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Prisma, PrismaClient } from '@prisma/client';
import prismaConfig from './config/prisma.config';

@Injectable()
export class PrismaService
  extends PrismaClient<Prisma.PrismaClientOptions, 'query' | 'info' | 'warn' | 'error'>
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    @Inject(prismaConfig.KEY) private readonly prismaConfiguration: ConfigType<typeof prismaConfig>
  ) {
    super({
      datasources: {
        db: { url: prismaConfiguration.database_url },
      },
      log: ['query', 'info', 'warn', 'error'],
      errorFormat: 'pretty',
    });

    this.$on('query', queryEvent => {
      logger.info(
        `[Prisma] Query took ${queryEvent.duration}ms\nSQL: ${queryEvent.query}\nParams: ${queryEvent.params}`
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
