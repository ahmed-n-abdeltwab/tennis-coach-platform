import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { LoggerModule } from '../logger';

import prismaConfig from './config/prisma.config';
import { PrismaService } from './prisma.service';

@Module({
  imports: [ConfigModule.forFeature(prismaConfig), LoggerModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
