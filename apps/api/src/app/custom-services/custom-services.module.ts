import { forwardRef, Module } from '@nestjs/common';

import { BookingTypesModule } from '../booking-types/booking-types.module';
import { MessagesModule } from '../messages/messages.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TimeSlotsModule } from '../time-slots/time-slots.module';

import { CustomServicesController } from './custom-services.controller';
import { CustomServicesService } from './custom-services.service';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    BookingTypesModule,
    TimeSlotsModule,
    forwardRef(() => MessagesModule),
  ],
  controllers: [CustomServicesController],
  providers: [CustomServicesService],
  exports: [CustomServicesService],
})
export class CustomServicesModule {}
