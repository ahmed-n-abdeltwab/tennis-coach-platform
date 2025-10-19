import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { validateEnv } from '@config/env.validation';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { AuthModule } from './auth/auth.module';
import { BookingTypesModule } from './booking-types/booking-types.module';
import { CalendarModule } from './calendar/calendar.module';
import { CoachesModule } from './coaches/coaches.module';
import { DiscountsModule } from './discounts/discounts.module';
import { HealthModule } from './health/health.module';
import { MessagesModule } from './messages/messages.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
import { SessionsModule } from './sessions/sessions.module';
import { TimeSlotsModule } from './time-slots/time-slots.module';
import { UsersModule } from './users/users.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: () => validateEnv(),
      envFilePath: ['.env.local', '.env'],
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CoachesModule,
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
