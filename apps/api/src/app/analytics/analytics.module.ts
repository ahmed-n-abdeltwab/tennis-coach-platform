import { forwardRef, Module } from '@nestjs/common';

import { AccountsModule } from '../accounts/accounts.module';
import { BookingTypesModule } from '../booking-types/booking-types.module';
import { CustomServicesModule } from '../custom-services/custom-services.module';
import { DiscountsModule } from '../discounts/discounts.module';
import { MessagesModule } from '../messages/messages.module';
import { SessionsModule } from '../sessions/sessions.module';
import { TimeSlotsModule } from '../time-slots/time-slots.module';

import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [
    AccountsModule,
    forwardRef(() => SessionsModule),
    BookingTypesModule,
    CustomServicesModule,
    TimeSlotsModule,
    DiscountsModule,
    forwardRef(() => MessagesModule),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
