import { forwardRef, Module } from '@nestjs/common';

import { BookingTypesModule } from '../booking-types/booking-types.module';
import { DiscountsModule } from '../discounts/discounts.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TimeSlotsModule } from '../time-slots/time-slots.module';

import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

@Module({
  imports: [
    PrismaModule,
    BookingTypesModule,
    TimeSlotsModule,
    DiscountsModule,
    forwardRef(() => NotificationsModule),
  ],
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
