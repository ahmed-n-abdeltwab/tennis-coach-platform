import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';

import { CoachesController } from './coaches.controller';
import { CoachesService } from './coaches.service';
import coachesConfig from './config/coaches.config';

@Module({
  imports: [PrismaModule, ConfigModule.forFeature(coachesConfig)],
  controllers: [CoachesController],
  providers: [CoachesService],
  exports: [CoachesService],
})
export class CoachesModule {}
