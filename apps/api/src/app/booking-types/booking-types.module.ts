import { PrismaModule } from '@app/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { BookingTypesController } from './booking-types.controller';
import { BookingTypesService } from './booking-types.service';

@Module({
  imports: [PrismaModule],
  controllers: [BookingTypesController],
  providers: [BookingTypesService],
  exports: [BookingTypesService],
})
export class BookingTypesModule {}
