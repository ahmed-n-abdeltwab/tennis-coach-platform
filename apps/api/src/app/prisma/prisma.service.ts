import { logger } from '@config/logging.config';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();

    (this as any).$on('query', (event: any) => {
      logger.info(
        `[Prisma] Query took ${event.duration}ms\nSQL: ${event.query}\nParams: ${event.params}`
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
