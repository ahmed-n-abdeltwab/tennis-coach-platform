import { validateEnv } from '@config/env.validation';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AccountsModule } from './accounts/accounts.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { BookingTypesModule } from './booking-types/booking-types.module';
import { CalendarModule } from './calendar/calendar.module';
import { ConversationsModule } from './conversations/conversations.module';
import { CustomServicesModule } from './custom-services/custom-services.module';
import { DiscountsModule } from './discounts/discounts.module';
import { HealthModule } from './health/health.module';
import { IamModule } from './iam/iam.module';
import { LoggerModule } from './logger/logger.module';
import { MessagesModule } from './messages/messages.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { SessionsModule } from './sessions/sessions.module';
import { TimeSlotsModule } from './time-slots/time-slots.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: () => validateEnv(),
      envFilePath: ['.env.local', '.env'],
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),
    LoggerModule,
    PrismaModule,
    IamModule,
    BookingTypesModule,
    SessionsModule,
    TimeSlotsModule,
    DiscountsModule,
    ConversationsModule,
    MessagesModule,
    CustomServicesModule,
    PaymentsModule,
    CalendarModule,
    NotificationsModule,
    HealthModule,
    AccountsModule,
    AnalyticsModule,
    RedisModule,
  ],
})
export class AppModule {}
