import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { SessionsModule } from '../sessions/sessions.module';
import notificationsConfig from './config/notifications.config';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [ConfigModule.forFeature(notificationsConfig), SessionsModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
