import { PrismaModule } from '@app/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { TimeSlotsController } from './time-slots.controller';
import { TimeSlotsService } from './time-slots.service';

@Module({
  imports: [PrismaModule],
  controllers: [TimeSlotsController],
  providers: [TimeSlotsService],
  exports: [TimeSlotsService],
})
export class TimeSlotsModule {}
