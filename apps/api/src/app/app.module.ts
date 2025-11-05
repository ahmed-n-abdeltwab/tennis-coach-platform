import { validateEnv } from '@config/env.validation';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BookingTypesModule } from './booking-types/booking-types.module';
import { CalendarModule } from './calendar/calendar.module';
import { DiscountsModule } from './discounts/discounts.module';
import { HealthModule } from './health/health.module';
import { IamModule } from './iam/iam.module';
import { MessagesModule } from './messages/messages.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
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
    PrismaModule,
    IamModule,
    AccountsModule,
    BookingTypesModule,
    SessionsModule,
    TimeSlotsModule,
    DiscountsModule,
    MessagesModule,
    PaymentsModule,
    CalendarModule,
    NotificationsModule,
    HealthModule,
  ],
})
export class AppModule {}
